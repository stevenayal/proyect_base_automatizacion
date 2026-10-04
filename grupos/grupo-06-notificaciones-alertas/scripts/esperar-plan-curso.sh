#!/usr/bin/env bash
# Espera a que termine el plan JMeter del curso (jmeter-performance.yml) sobre el mismo commit.
#
# Ese workflow se dispara en todo PR que toque tests/performance/** y manda ~27 req/min con la
# misma API key demo que usan Newman y JMeter del Grupo 06 (limite: 30 req/min por key). Si corren
# a la vez, la API responde 429 y el SLA / la regresion fallan por causas ajenas al modulo.
#
# Requiere GH_TOKEN (github.token con permiso actions: read) y GITHUB_REPOSITORY.
# Uso: esperar-plan-curso.sh <head-sha> [minutos-maximos]
set -euo pipefail

SHA="${1:?Falta el SHA del commit}"
MAX_MIN="${2:-20}"
WORKFLOW=".github/workflows/jmeter-performance.yml"
ESPERA=20

for i in $(seq 1 $((MAX_MIN * 60 / ESPERA))); do
  pendientes=$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs?head_sha=${SHA}&per_page=100" \
    --jq "[.workflow_runs[] | select(.path == \"${WORKFLOW}\" and .status != \"completed\")] | length" || echo "?")

  if [ "${pendientes}" = "0" ]; then
    echo "El plan JMeter del curso no esta corriendo sobre ${SHA:0:7}. Se continua."
    exit 0
  fi

  echo "El plan JMeter del curso sigue corriendo (${pendientes}); comparte la API key. Reintento en ${ESPERA} s."
  sleep "${ESPERA}"
done

echo "::warning::El plan del curso sigue corriendo tras ${MAX_MIN} min. Se continua igual; pueden aparecer 429."
