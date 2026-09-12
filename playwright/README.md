# Playwright template

Base sugerida para los equipos:

## Suites minimas

- `auth.spec.ts`
- `onboarding.spec.ts`
- `checkout.spec.ts`
- `negative.spec.ts`

## Recomendaciones

- usar `data-testid` cuando exista
- resetear o seedear antes del flujo
- dejar capturas en `evidence/`
- separar smoke vs regression

## Smoke sugerido

1. login valido
2. acceso al catalogo
3. add to cart
4. checkout
