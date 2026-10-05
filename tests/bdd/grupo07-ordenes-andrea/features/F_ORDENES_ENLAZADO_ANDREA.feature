@grupo07 @web @ordenes
Feature: Flujo enlazado de órdenes
  Como usuario del sistema
  Quiero crear una orden desde el front web
  Para verificar que el flujo funciona de principio a fin

  # Un escenario enlazado de punta a punta, como pide la consigna: el mismo
  # recorrido va del listado al detalle y termina verificado contra la base.

  Background:
    Given que obtengo un usuario activo del sandbox
    And que estoy autenticado en el sandbox como ese usuario

  # criterio: RF-G7-01 listado de órdenes, RF-G7-02 alta de orden y RF-G7-03 detalle de la orden — recorrido completo de principio a fin
  @OE-G07-01 @smoke @crea-datos
  Scenario: Listado → crear orden → detalle
    # RF-G7-01 — accedo al listado y veo la tabla con sus columnas.
    When navego a "/ordenes"
    Then veo el listado de órdenes con sus columnas

    # RF-G7-02 — creo una orden desde el formulario con un ítem válido.
    When creo una orden con un ítem válido
    Then soy redirigido al detalle de la orden creada

    # RF-G7-03 — el detalle muestra la orden con sus ítems.
    Then veo el detalle de la orden con cabecera e ítems
    And el detalle muestra el producto que invoqué
    And el monto del detalle coincide con el del servidor
    And el estado de la orden es "pendiente"
    And la orden existe en la base de datos