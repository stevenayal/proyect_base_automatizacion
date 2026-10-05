#!/usr/bin/env bash
# Espera a que haya cupo en el rate limit de la sandbox AIQUAA antes de correr
# Newman o JMeter del Grupo 06. Mismo enfoque que el Grupo 05
# (grupos/grupo-05-tarjetas-credito-debito/scripts/esperar-cupo-api.sh).
#
# El limite es de 30 req/min POR API key y la key demo la comparte toda la clase.
# En un PR del grupo se disparan a la vez Newman, JMeter y, si el PR toca
# tests/performance/**, el plan del curso; todos contra la misma key.
#
# Una sola request no alcanza para medir: la API responde 200 mientras las otras
# corridas esten bajo 30/min, y el limite se pasa recien al sumarnos. Por eso se
# mide HOLGURA: una rafaga corta solo pasa limpia si de verdad sobra cupo.
#
# Uso: esperar-cupo-api.sh <api-key> [api-base] [rondas]
set -euo pipefail

API_KEY="${1:?Falta la api key}"
API_BASE="${2:-https://aiquaa-sandbox-api.vercel.app}"
RONDAS="${3:-12}"

RAFAGA=5
ESPERA=30

for ronda in $(seq 1 "${RONDAS}"); do
  limitado=0
  for _ in $(seq 1 "${RAFAGA}"); do
    # "|| true": en Git Bash de Windows curl puede salir con 23 al combinar
    # --output /dev/null con --write-out aunque el codigo HTTP sea correcto.
    code=$(curl --silent --max-time 15 --output /dev/null --write-out '%{http_code}' \
      --header "x-api-key: ${API_KEY}" \
      "${API_BASE}/api/v1/notificaciones?usuarioId=1" || true)
    code="${code:-000}"
    if [ "${code}" = "429" ]; then
      limitado=1
    fi
  done

  if [ "${limitado}" = "0" ]; then
    echo "Hay cupo en la ventana (rafaga de ${RAFAGA} sin 429) tras ${ronda} ronda(s). Se arranca."
    exit 0
  fi

  echo "Sin cupo: la rafaga dio 429, otra corrida esta usando la key. Reintento en ${ESPERA} s (${ronda}/${RONDAS})."
  sleep "${ESPERA}"
done

echo "::warning::Sigue sin haber cupo tras $((RONDAS * ESPERA / 60)) min. Se corre igual; esperar 429 en los resultados."
