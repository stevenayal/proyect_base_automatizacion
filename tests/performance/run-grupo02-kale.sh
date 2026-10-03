#!/usr/bin/env bash
# Ejecuta el plan JMeter del Grupo 02 en tu maquina y genera el dashboard HTML.
# Requisitos: Java 17+ y JMeter 5.6.3 en el PATH (macOS: brew install jmeter).
#
#   export SANDBOX_API_KEY=sbx_...        # tu x-api-key
#   npm run test:perf
#
# Contra el mock local (sin internet):
#   npm run mock   (en otra terminal)
#   JM_TARGET=mock npm run test:perf
set -euo pipefail

: "${SANDBOX_API_KEY:?Defini SANDBOX_API_KEY con tu x-api-key del sandbox}"
OUT=test-results/performance
rm -rf "$OUT" && mkdir -p "$OUT"

TARGET_ARGS=()
if [ "${JM_TARGET:-}" = "mock" ]; then
  TARGET_ARGS=(-Jprotocol=http -Jhost=localhost -Jport=4010 -JthroughputPerMin=600)
fi

jmeter -n \
  -t tests/performance/plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx \
  -l "$OUT/R_GRUPO_02_KALE_TRANSFERENCIAS.jtl" \
  -e -o "$OUT/dashboard" \
  -JcsvPath=tests/performance/data/D_GRUPO_02_KALE_TRANSFERENCIAS.csv \
  -JapiKey="$SANDBOX_API_KEY" \
  -JrunId="local-$(date +%s)" \
  -Jthreads="${THREADS:-2}" -Jloops="${LOOPS:-3}" \
  "${TARGET_ARGS[@]}"

echo
echo "Dashboard HTML: $OUT/dashboard/index.html"
echo "Informe PDF (opcional):"
echo "  npx -y aiquaa-performance-mcp-server --report $OUT/R_GRUPO_02_KALE_TRANSFERENCIAS.jtl tests/performance/thresholds/T_GRUPO_02_KALE_TRANSFERENCIAS.json $OUT/INFORME_PERF_GRUPO02.pdf --api-name 'AIQUAA Sandbox API - Transferencias' --plan tests/performance/plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx --test-type carga"
