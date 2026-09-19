import argparse
import json
import sys


parser = argparse.ArgumentParser(
    description="Valida límites de rendimiento usando statistics.json de JMeter"
)

parser.add_argument("statistics", help="Ruta al statistics.json generado por JMeter")
parser.add_argument("--max-error-rate", type=float, default=2.0)
parser.add_argument("--max-p95", type=float, default=1500.0)
parser.add_argument("--min-samples", type=int, default=50)

args = parser.parse_args()


with open(args.statistics, encoding="utf-8") as file:
    data = json.load(file)


if "Total" not in data:
    print("RESULTADO: RECHAZADO")
    print("No se encontró la sección 'Total' en statistics.json")
    sys.exit(1)


stats = data["Total"]

samples = int(stats["sampleCount"])
error_rate = float(stats["errorPct"])
p95 = float(stats["pct2ResTime"])


samples_ok = samples >= args.min_samples
errors_ok = error_rate <= args.max_error_rate
p95_ok = p95 <= args.max_p95


print("=" * 55)
print("VALIDACIÓN DE RENDIMIENTO - SEMANA 5")
print("=" * 55)

print(
    f"Muestras : {samples} "
    f"(mínimo {args.min_samples}) "
    f"{'OK' if samples_ok else 'FALLA'}"
)

print(
    f"Errores  : {error_rate:.2f}% "
    f"(máximo {args.max_error_rate:.2f}%) "
    f"{'OK' if errors_ok else 'FALLA'}"
)

print(
    f"p95      : {p95:.2f} ms "
    f"(máximo {args.max_p95:.2f} ms) "
    f"{'OK' if p95_ok else 'FALLA'}"
)

print("=" * 55)

if samples_ok and errors_ok and p95_ok:
    print("RESULTADO: APROBADO")
    sys.exit(0)
else:
    print("RESULTADO: RECHAZADO")
    sys.exit(1)