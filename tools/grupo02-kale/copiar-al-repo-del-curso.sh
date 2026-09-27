#!/usr/bin/env bash
# Copia SOLO los archivos del Grupo 02 al clon del repo del curso, sin pisar nada.
#
#   bash tools/grupo02-kale/copiar-al-repo-del-curso.sh ~/Documents/proyect_base_automatizacion
#   bash tools/grupo02-kale/copiar-al-repo-del-curso.sh ~/Documents/proyect_base_automatizacion --actualizar
#
# --actualizar: permite reemplazar SOLO los archivos propios del Grupo 02 (Kale)
#   que ya copiaste antes (sirve para subir correcciones). Nunca toca otros archivos.
#
# - No copia package.json, package-lock.json, tsconfig.json, README.md, .gitignore
#   (son del repo del curso y los usan tus companeros).
# - Si algun archivo ya existe en el destino, NO copia nada y te avisa.
set -euo pipefail

ACTUALIZAR="${2:-}"
DEST="${1:?Uso: bash tools/grupo02-kale/copiar-al-repo-del-curso.sh <ruta-al-clon-del-repo-del-curso>}"
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$(cd "$DEST" && pwd)"
[ -d "$DEST/.git" ] || { echo "ERROR: $DEST no es un repositorio git (clonalo primero)."; exit 1; }

cd "$SRC"
FILES=$(find .github/workflows/Y_GRUPO02_KALE_*.yml \
  postman/C_GRUPO_02_* postman/E_GRUPO_02_* \
  grupos/grupo-02-transferencias-cuentas/docs grupos/grupo-02-transferencias-cuentas/features/F_GRUPO_02_KALE_TRANSFERENCIAS_API.feature \
  grupos/grupo-02-transferencias-cuentas/evidence/GRUPO02_KALE_EVIDENCIAS.md \
  tests/bdd/grupo02-kale tests/performance/*GRUPO_02* tests/performance/run-grupo02-kale.sh \
  tests/performance/plans/*GRUPO_02* tests/performance/data/*GRUPO_02* tests/performance/thresholds/*GRUPO_02* \
  reporter/grupo02-kale tools/grupo02-kale docs/GRUPO02_KALE_ENTREGA.md \
  -type f ! -name '*.pyc' ! -path '*/__pycache__/*' | sort)

CONFLICTOS=()
for f in $FILES; do
  if [ -e "$DEST/$f" ] && ! cmp -s "$f" "$DEST/$f"; then CONFLICTOS+=("$f"); fi
done
if [ ${#CONFLICTOS[@]} -gt 0 ] && [ "$ACTUALIZAR" != "--actualizar" ]; then
  echo "ERROR: estos archivos ya existen en el destino con otro contenido. No se copio nada:"
  printf '  %s\n' "${CONFLICTOS[@]}"
  exit 1
fi

n=0
for f in $FILES; do
  mkdir -p "$DEST/$(dirname "$f")"
  cp -p "$f" "$DEST/$f"
  n=$((n+1))
done
if [ ${#CONFLICTOS[@]} -gt 0 ]; then echo "Actualizados (${#CONFLICTOS[@]}): ${CONFLICTOS[*]}"; fi
if [ "$ACTUALIZAR" = "--actualizar" ]; then echo "Listo: $n archivos del Grupo 02 (Kale) sincronizados en $DEST (solo archivos propios del Grupo 02)."; else echo "Listo: $n archivos del Grupo 02 copiados a $DEST (ningun archivo existente fue modificado)."; fi
