# Grupo 03 — Pagos de Servicios

**Módulo:** Pago de facturas (ANDE, ESSAP, telefonía)
**Rama:** `grupo-03-pagos-servicios`

## Integrantes

- (completar: nombre y email — ver `inscripcion-grupos-bdd2.xlsx`)
- Juan Morel - jospz077@gmail.com
- Ana Segovia - annyse.28@gmail.com
- Lennys Cantero - lennyscantero@gmail.com
- Enzo Ruiz Diaz - enzoruizdiaz96@gmail.com
- Stefanía Cubas - stefi.cubas08@gmail.comm

## Alcance

- TODO: objetivo del flujo automatizado
- TODO: supuestos
- TODO: riesgos
- TODO: cobertura incluida / excluida

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance
- [ ] BDD — `features/` (mínimo 3 escenarios: happy path, negativo, edge case)
- [ ] API — colección Postman/Newman (si aplica al módulo)
- [ ] UI — `tests/e2e/` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo


# Trazabilidad BDD → API

Scenario: Pago exitoso de factura de ANDE
Given un usuario en el sistema
When POST /api/v1/sql/update
Then status 200 y actualizado almenos un registro 

Postman: POST https://aiquaa-sandbox-api.vercel.app/api/v1/sql/update
Body: {
  "sql": "UPDATE facturas SET estado = $1 WHERE usuario_id = $2 AND proveedor = $3",
  "params": [
    "pagada",
    "{{UsuarioID}}",
    "ANDE"
  ]
}
Test: / Validar que la API responda 200 OK
pm.test("Pago confirmado correctamente", function () {
    pm.response.to.have.status(200);
});

//Validar que se actualize almenos una factura
pm.test("Al menos una factura cambia a pagada", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.rowCount).to.be.above(0);
});
