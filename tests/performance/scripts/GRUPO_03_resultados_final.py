"""Post-proceso del plan final del Grupo 03 (medición por endpoint).

  separar   Parte el JTL completo de la corrida en:
              R_FINAL_ENDPOINTS.jtl   fases F1..F6 (lo que se mide y define el veredicto)
              R_FINAL_SATURACION.jtl  saturación de lecturas (informativa)
            y escribe un resumen (JSON + Markdown) con el titular elegido, las
            muestras por endpoint y los 429 contados aparte.

  veredicto Lee la salida de `node mcp/dist/server.js --evaluate` sobre
            R_FINAL_ENDPOINTS.jtl y falla si algún endpoint con umbral no dio PASS.
            (El veredicto global del MCP mira todas las muestras juntas; acá
            se exige que CADA endpoint cumpla su propio umbral.)

Uso:
  python GRUPO_03_resultados_final.py separar --jtl R_FINAL.jtl --salida <dir>
  python GRUPO_03_resultados_final.py veredicto --evaluacion eval.json --umbrales GRUPO_03_thresholds_final.json
"""

import argparse
import csv
import io
import json
import os
import re
import sys
from collections import OrderedDict

FASES = ["F1", "F2", "F3", "F4", "F5", "F6"]


def leer_jtl(ruta):
    with open(ruta, encoding="utf-8", newline="") as fh:
        filas = list(csv.reader(fh))
    if not filas:
        return [], []
    return filas[0], filas[1:]


def escribir_jtl(ruta, cabecera, filas):
    with open(ruta, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(cabecera)
        w.writerows(filas)


def separar(args):
    cabecera, filas = leer_jtl(args.jtl)
    if not cabecera:
        sys.exit(f"{args.jtl} está vacío")
    i_label = cabecera.index("label")
    i_ok = cabecera.index("success")
    i_code = cabecera.index("responseCode")
    i_elapsed = cabecera.index("elapsed")

    endpoints, saturacion = [], []
    por_endpoint = OrderedDict()
    reintentos = OrderedDict()
    titular = None
    preparacion_ok = True
    limpieza = 0

    for f in filas:
        label = f[i_label]
        if label.startswith("F"):
            endpoints.append(f)
            d = por_endpoint.setdefault(label, {"muestras": 0, "errores": 0, "tiempos": []})
            d["muestras"] += 1
            d["errores"] += 0 if f[i_ok] == "true" else 1
            d["tiempos"].append(int(f[i_elapsed]))
        elif label.startswith("S - "):
            saturacion.append(f)
        elif label.startswith("429 - "):
            base = label[len("429 - "):]
            reintentos[base] = reintentos.get(base, 0) + 1
        elif label.startswith("00 - "):
            m = re.search(r"titular usuario (\d+) \((\S+) pendientes\)", label)
            if m:
                titular = {"usuario": int(m.group(1)), "pendientes": m.group(2)}
            if f[i_ok] != "true":
                preparacion_ok = False
        elif label.startswith("99 - "):
            limpieza += 1

    os.makedirs(args.salida, exist_ok=True)
    escribir_jtl(os.path.join(args.salida, "R_FINAL_ENDPOINTS.jtl"), cabecera, endpoints)
    if saturacion:
        escribir_jtl(os.path.join(args.salida, "R_FINAL_SATURACION.jtl"), cabecera, saturacion)

    def pct(valores, p):
        if not valores:
            return 0
        v = sorted(valores)
        return v[max(0, -(-p * len(v) // 100) - 1)]

    tabla = []
    for label, d in por_endpoint.items():
        tabla.append({
            "endpoint": label, "muestras": d["muestras"], "errores": d["errores"],
            "p50": pct(d["tiempos"], 50), "p90": pct(d["tiempos"], 90), "p95": pct(d["tiempos"], 95),
            "429_aparte": sum(n for b, n in reintentos.items() if b == label),
        })
    sat_429 = sum(1 for f in saturacion if f[i_code] == "429")
    resumen = {
        "titular": titular,
        "preparacion_ok": preparacion_ok,
        "endpoints": tabla,
        "429_por_muestra": reintentos,
        "saturacion": {"muestras": len(saturacion), "429": sat_429,
                       "porcentaje_429": round(100 * sat_429 / len(saturacion), 2) if saturacion else 0},
        "limpieza_deletes": limpieza,
    }
    with open(os.path.join(args.salida, "RESUMEN_FINAL.json"), "w", encoding="utf-8") as fh:
        json.dump(resumen, fh, ensure_ascii=False, indent=2)

    md = io.StringIO()
    md.write("### JMeter Grupo 03 · plan final por endpoint\n\n")
    if titular:
        md.write(f"Titular de la corrida: usuario **{titular['usuario']}** ({titular['pendientes']} facturas pendientes al inicio).\n\n")
    elif not preparacion_ok:
        md.write("**La preparación falló (no se pudo elegir el titular): no hubo medición.**\n\n")
    md.write("| Endpoint | Muestras | Errores | p50 ms | p90 ms | p95 ms | 429 (aparte) |\n|---|---:|---:|---:|---:|---:|---:|\n")
    for r in tabla:
        md.write(f"| {r['endpoint']} | {r['muestras']} | {r['errores']} | {r['p50']} | {r['p90']} | {r['p95']} | {r['429_aparte']} |\n")
    if saturacion:
        s = resumen["saturacion"]
        md.write(f"\nSaturación de lecturas (informativa): {s['muestras']} muestras, {s['429']} con 429 ({s['porcentaje_429']} %).\n")
    if limpieza:
        md.write(f"\nLimpieza final: {limpieza} DELETE de facturas que habían quedado activas.\n")
    with open(os.path.join(args.salida, "RESUMEN_FINAL.md"), "w", encoding="utf-8") as fh:
        fh.write(md.getvalue())
    print(md.getvalue())


def veredicto(args):
    with open(args.umbrales, encoding="utf-8") as fh:
        umbrales = json.load(fh)
    try:
        with open(args.evaluacion, encoding="utf-8") as fh:
            evaluacion = json.load(fh)
    except (OSError, ValueError) as exc:
        sys.exit(f"No se pudo leer la evaluación del MCP ({exc})")
    ops = {o["label"]: o for o in evaluacion.get("operations", [])}
    falla = False
    print(f"{'Endpoint':55} {'Muestras':>8} {'Error %':>8} {'p95 ms':>8} {'Umbral p95':>10}  Veredicto")
    for label, u in umbrales.get("operations", {}).items():
        o = ops.get(label)
        if not o:
            print(f"{label:55} {'-':>8} {'-':>8} {'-':>8} {u.get('p95Ms', '-'):>10}  NOT_EXECUTED")
            falla = True
            continue
        v = o.get("verdict")
        print(f"{label:55} {o['samples']:>8} {o['errorRate']:>8.2f} {o['p95Ms']:>8.0f} {u.get('p95Ms', '-'):>10}  {v}")
        falla = falla or v != "PASS"
    if falla:
        print("\nAl menos un endpoint no cumple su umbral (o no tuvo muestras).")
        sys.exit(1)
    print("\nTodos los endpoints cumplen su umbral.")


def main():
    try:  # consola de Windows: que los acentos no rompan la salida
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("separar")
    s.add_argument("--jtl", required=True)
    s.add_argument("--salida", required=True)
    v = sub.add_parser("veredicto")
    v.add_argument("--evaluacion", required=True)
    v.add_argument("--umbrales", required=True)
    a = p.parse_args()
    separar(a) if a.cmd == "separar" else veredicto(a)


if __name__ == "__main__":
    main()
