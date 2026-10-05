#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path

JTL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("results.jtl")
THRESHOLDS = Path("grupos/grupo-09-reportes-dashboard/tests/performance/thresholds/thresholds.json")

with open(THRESHOLDS, "r", encoding="utf-8") as f:
    limits = json.load(f)

elapsed = []
errors = 0
total = 0

with open(JTL, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        total += 1
        try:
            elapsed.append(int(row["elapsed"]))
        except (KeyError, ValueError):
            pass
        if row.get("success", "").lower() == "false":
            errors += 1

if total == 0:
    print("RECHAZADO: no hay muestras")
    sys.exit(1)

error_rate = (errors / total) * 100
elapsed_sorted = sorted(elapsed)
p95_index = max(0, int(len(elapsed_sorted) * 0.95) - 1)
p95 = elapsed_sorted[p95_index] if elapsed_sorted else 0

print(f"Total muestras: {total} (min {limits['min_samples']})")
print(f"Errores: {errors} ({error_rate:.2f}%) (max {limits['max_error_rate_percent']}%)")
print(f"p95: {p95} ms (max {limits['max_p95_ms']} ms)")

failed = False
if total < limits["min_samples"]:
    print("FALLO: muestras insuficientes")
    failed = True
if error_rate > limits["max_error_rate_percent"]:
    print("FALLO: tasa de errores excedida")
    failed = True
if p95 > limits["max_p95_ms"]:
    print("FALLO: p95 excedido")
    failed = True

if failed:
    print("\nRESULTADO: RECHAZADO")
    sys.exit(1)
else:
    print("\nRESULTADO: APROBADO")
    sys.exit(0)