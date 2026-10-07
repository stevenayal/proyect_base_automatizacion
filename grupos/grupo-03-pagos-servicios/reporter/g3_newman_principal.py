"""Deja una entrada por escenario en el JSON de Newman, con la request PRINCIPAL.

Por qué: cada request de la colección Final hace llamadas auxiliares con pm.sendRequest
(crea la factura, verifica y al final la da de baja). Newman registra todas bajo la misma
request y en su JSON queda solo la última (el DELETE de la limpieza), repetida una vez por
llamada. El informe PDF de la skill postman-newman lee ese JSON tal cual, así que mostraba
"DELETE ... 204" varias veces por escenario.

La colección guarda la request principal de cada escenario en la variable global
G3_principales (helper g3.registrarPrincipal); Newman la exporta con --export-globals.
Este script:
  1. agrupa las ejecuciones por request y deja una sola (la que tiene las aserciones);
  2. le pone el método, la URL, el status, el tiempo y la respuesta de la request principal.
No cambia las estadísticas (peticiones, aserciones, fallas): solo lo que se muestra.

Uso:
  python g3_newman_principal.py --results newman-results.json --globals newman-globals.json \
      --output newman-results-informe.json
"""

import argparse
import json
import sys
from collections import OrderedDict


def leer_principales(ruta):
    try:
        with open(ruta, encoding="utf-8") as fh:
            datos = json.load(fh)
    except (OSError, ValueError) as exc:
        print(f"Sin globales de Newman ({exc}): se usan las entradas tal cual.")
        return {}
    for v in datos.get("values", []):
        if v.get("key") == "G3_principales":
            try:
                return json.loads(v.get("value") or "{}")
            except ValueError:
                return {}
    return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--globals", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    with open(args.results, encoding="utf-8") as fh:
        data = json.load(fh)
    principales = leer_principales(args.globals)
    run = data.get("run", {})
    ejecuciones = run.get("executions", [])

    # Una entrada por request, en el orden en que aparecieron. Si un escenario se repitió
    # (429 → setNextRequest), las aserciones válidas son las de la última vez.
    grupos = OrderedDict()
    for ex in ejecuciones:
        nombre = ex.get("item", {}).get("name", "")
        actual = grupos.get(nombre)
        if actual is None or len(ex.get("assertions") or []) >= len(actual.get("assertions") or []):
            grupos[nombre] = ex

    reemplazadas = 0
    for nombre, ex in grupos.items():
        p = principales.get(nombre)
        if not p:
            continue  # p. ej. un escenario omitido: no se envió la request principal
        cuerpo = p.get("body")
        ex["request"] = {
            "method": p.get("method", "GET"),
            "url": {"raw": p.get("url", "")},
            **({"body": {"mode": "raw", "raw": cuerpo}} if cuerpo else {}),
        }
        ex["response"] = {
            "code": int(p.get("code") or 0),
            "status": p.get("status", ""),
            "responseTime": int(float(p.get("ms") or 0)),
            "body": p.get("response", ""),
        }
        reemplazadas += 1

    run["executions"] = list(grupos.values())
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False)
    print(f"Informe Newman: {len(ejecuciones)} entradas -> {len(grupos)} escenarios; "
          f"{reemplazadas} con su request principal.")


if __name__ == "__main__":
    sys.exit(main())
