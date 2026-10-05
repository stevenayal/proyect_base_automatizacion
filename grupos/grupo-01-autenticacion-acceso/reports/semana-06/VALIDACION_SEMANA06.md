# Validación Semana 06

Fecha: 3 de octubre de 2026 (America/Asuncion).
Rama: `semana-06/grupo-01-cucumber-playwright`.

## Resultado final

- `npm run test:semana06`: código 0; **3 escenarios y 22 pasos aprobados**.
- Undefined: 0. Ambiguous: 0. Fallidos: 0. Omitidos en la ejecución real: 0.
- AUT-01: HTTP 200, email esperado, usuario activo, URL raíz, saludo y botón Cerrar sesión visibles.
- AUT-02: HTTP 400 y mensaje Usuario no encontrado o inactivo.; permanece en login.
- AUT-03: botón deshabilitado con email vacío y ningún POST de login.

## Cambio autorizado en AUT-01

Se reemplazó la expectativa de backend caído por login exitoso de usuario activo, con autorización
expresa de la usuaria. Cambiaron título, tags y los dos Then de AUT-01, y la descripción general.
AUT-02 y AUT-03 se conservaron. El Page Object y los nuevos steps verifican respuesta e interfaz reales.
SHA-256 actual del feature: `3cec4888132ec31626e81b23e56f758d68cbac5bd182cb7afa70ce77f992f969`.

## Verificaciones

- Perfil dry: 3 escenarios y 22 pasos definidos, sin undefined/ambiguous.
- `npx tsc --noEmit`: aprobado.
- Reporter: 7 pruebas de regresión aprobadas.
- JSON final: un único feature Semana 06; pasos y hooks aprobados.
- Capturas y metadatos adjuntos coinciden con los archivos en disco.
- JSON, HTML y PDF regenerados para esta ejecución.
- Evidencias actuales: `evidence/semana-06/2026-10-03T10-17-50-628Z/` (3 JSON y 3 PNG).
- Las carpetas anteriores son evidencia histórica, no resultados de la ejecución actual.
- YAML y package.json verificados en la revisión previa; no cambiaron en esta actualización.

## Archivos de esta actualización

- Feature `F_AUTENTICACION_SEMANA06.feature`.
- Page Object `LoginPage.ts` y `login.steps.ts` de Semana 06.
- README-semana06.md y este documento.
- cucumber-report.json, cucumber-report.html e INFORME_SEMANA06.pdf.
- Seis archivos de evidencia de la ejecución actual.

## Alcance y entrega

Validación local verde y lista para preparar commits técnicos y push de Semana 06.
GitHub Actions remoto y regresión E2E de semanas anteriores no ejecutados.
Node local 24.20.0 emite advertencia de Cucumber; CI fija Node 22.
Los cambios preexistentes de LAB-LOGIN-001 y del World global están fuera de esta entrega.
No se hicieron commits, push, merge ni PR. Seleccionar sólo archivos de Semana 06 al preparar commits.
