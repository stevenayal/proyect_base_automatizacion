# HEAL_OE-G07-01 — propuesta del Healer

**Escenario:** `OE-G07-01` — Listado → crear orden → detalle
**Fecha:** 2026-10-01 · **Ejecutor:** OpenCode (procedimiento manual, ver nota)
**Clasificación previa:** `results/CLASIF_OE-G07-01-ANDREA.json`

---

## 1. gates ejecutados antes de actuar

| Gate | Valor | Fuente | Resultado |
|---|---|---|---|
| Categoría | `TEST_BUG` | `references/failure-taxonomy.md` | ✅ no es bug de producto |
| Confianza | `high` | `CLASIF_OE-G07-01-ANDREA.json` | ✅ |
| Regla que matcheó | `locator-not-found` | idem | ✅ |
| `healerAllowed` | `true` | taxonomía: `category === 'TEST_BUG' && confidence === 'high'` | ✅ |
| Intentos consumidos | 1 de 2 (`maxHealAttempts`) | `summary.maxHealAttempts` | ✅ |
| Objetivo dentro de whitelist | `pages/` | `references/healing-guardrails.md` | ✅ |

Se aplicó **una sola** corrección, sin tocar `.feature` ni la expresión Cucumber de
ningún paso.

## 2. Diagnóstico

```
Error: expect(locator).toBeVisible() failed
  - waiting for getByTestId('ordenes-lista')
Call log:
  - Expect "to.be.visible" with timeout 5000ms
```

Falla la primera aserción de RF-G7-01. El testid buscado (`ordenes-lista`) no
existe en el DOM: el front expone `ordenes-list`. La regresión estaba en la
automatización, no en la aplicación — por eso la categoría correcta es `TEST_BUG`
y el caso allowed para healing.

## 3. Fix propuesto y aplicado

Archivo: `tests/bdd/grupo07-ordenes-andrea/pages/OrdenesListadoPage.ts`

```diff
-    return this.page.getByTestId('ordenes-lista');
+    return this.page.getByTestId('ordenes-list');
```

Razón: el locator real se había verificado contra el DOM del sandbox el 2026-10-02
con el smoke test (`tests/bdd/_smoke-locators.mjs`, 22/22 verificaciones OK, donde
`ordenes-list` está presente). La regresión se introdujo al renombrar el testid en
el POM.

## 4. Por qué este archivo y no otro

Según `references/healing-guardrails.md`:

- `pages/` → **whitelist**: "locators, esperas, navegación".
- `features/*.feature` → **blacklist**: nunca se modifica automáticamente.
- `steps/` → solo glue, y nunca la expresión Cucumber de un `Given/When/Then`.
- `.env`, `data/`, `src/` → fuera de alcance.

El fix es de un locator en un POM: es el cambio más pequeño que restaura el
comportamiento esperado, y deja el escenario igual de estricto.

## 5. Verificación posterior

| Corrida | Resultado |
|---|---|
| Antes de romper | 11/11 steps PASS |
| Con el testid roto | 1 failed, 7 skipped, 3 passed (falla en `veo el listado de órdenes con sus columnas`) |
| Con el fix aplicado | 11/11 steps PASS |

## 6. Nota sobre la ejecución

Los comandos `/pw-ia:*` de `SKILL.md` están pensados para `CLAUDE.md` (Claude
Code). Este trabajo se hizo con OpenCode, así que **el Classifier se ejecutó con
su script real** (`scripts/classify-failures.mjs`, determinista, sin IA) y **el
Healer se aplicó siguiendo los guardrails de este mismo documento**, de forma
manual y con los gates verificados uno por uno en la sección 1.

El Classifier sí corre dentro del workflow en GitHub Actions. **El Healer no
debe correr en CI**: la skill exige cero llamadas a modelos en el pipeline, así
que se ejecuta localmente sobre el `CLASIF_*.json` descargado del artifact.