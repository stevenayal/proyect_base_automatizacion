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

## Scenario: Pago exitoso de factura de ANDE
      Given el usuario posee factura ANDE pendiente de pago
      When el usuario realiza el pago de la factura
      Then la factura cambia a estado pagada
      And se genera el comprobante de pago procesado
      And el monto del comprobante de pago coincide con el monto de la factura

Postman: POST https://aiquaa-sandbox-api.vercel.app/api/v1/facturas/{{ID_tabla}}/pagar
Body: {
  "metodoPago": "tarjeta"
}

Test: // Validar que la API responda 200 OK
pm.test("Pago confirmado correctamente", function () {
    pm.response.to.have.status(200);
});

// Validar que factura cambia a estado pagada
pm.test("El estado de la factura se actualizó a pagada", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.factura.estado).to.eql("pagada");
});

// Validar que el pago fue procesado correctamente
pm.test("Se generó el comprobante de pago en estado 'procesado'", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.pago.estado).to.eql("procesado");
});

// Validar consistencia de datos entre Factura y Pago
pm.test("El monto pagado coincide con el monto de la factura", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.pago.monto).to.eql(jsonData.data.factura.monto);
    pm.expect(jsonData.data.pago.factura_id).to.eql(jsonData.data.factura.id);
});

## Scenario: Pago de una factura de ANDE inexistente
    Given que el usuario ingresa un identificador de factura que no existe en el sistema
    When el usuario realiza el pago de la factura inexistente
    Then el sistema rechaza la operación
    And muestra el mensaje indicando que la factura no fue encontrada o ya pagada

Postman: POST https://aiquaa-sandbox-api.vercel.app/api/v1/facturas/{{ID_tabla}}/pagar
Body: {
  "metodoPago": "tarjeta"
}

Test:// Validar que la API responda con 404 Not Found
pm.test("La API rechaza la solicitud con código 404 Not Found", function () {
    pm.response.to.have.status(404);
});

// Validar el código de error interno de la API
pm.test("Respuesta no encontrado(NOT_FOUND)", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.error.code).to.eql("NOT_FOUND");
});

// Validar que el mensaje confirme que la factura no fue encontrada
pm.test("El mensaje indica que la factura no existe ", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.error.message).to.eql("Factura no encontrada o ya pagada.");
});

## Scenario: Factura de ANDE ya pagada anteriormente
    Given la factura de ANDE ya fue pagada con anterioridad
    When el usuario intenta pagar nuevamente la misma factura
    Then el sistema indica que la factura no fue encontrada o ya se encuentra pagada

Postman: POST https://aiquaa-sandbox-api.vercel.app/api/v1/facturas/{{ID_tabla}}/pagar
Body: {
  "metodoPago": "tarjeta"
}

Test:// Validar que la API responda con 404 Not Found
pm.test("La API rechaza la solicitud con código 404 Not Found", function () {
    pm.response.to.have.status(404);
});

// Validar el código de error interno de la API
pm.test("Respuesta no encontrado(NOT_FOUND)", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.error.code).to.eql("NOT_FOUND");
});

// Validar que el mensaje confirme que la factura no fue encontrada o ya está pagada
pm.test("El mensaje indica que la factura no existe o ya se encuentra pagada", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.error.message).to.eql("Factura no encontrada o ya pagada.");
});