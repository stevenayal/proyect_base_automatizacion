# Grupo 07 — Carrito de Compras / E-commerce
# Módulo: Checkout de un e-commerce
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Carrito de Compras / E-commerce

  Scenario: Calcular el total del carrito con múltiples productos
    Given el usuario tiene los siguientes productos en el carrito:
      | producto   | cantidad | precio |
      | Zapatillas | 1        | 250000 |
      | Medias     | 2        | 15000  |
      | Remera     | 1        | 80000  |
    When el sistema calcula el total del carrito
    Then el total debe ser 360000

  #Scenario: Completar una compra con productos disponibles - Juan Barreto
    Given que el cliente tiene productos disponibles en el carrito
    And el cliente corresponde a un usuario válido
    When confirma la compra
    Then el pedido se registra correctamente
    And se muestra la confirmación de la compra

  #Scenario: No permitir finalizar una compra con el carrito vacío - Juan Barreto
    Given que el cliente tiene el carrito vacío
    And el cliente corresponde a un usuario válido
    When intenta confirmar la compra
    Then el sistema debe impedir finalizar la compra
    And debe indicar que los datos de la compra no son válidos

  #Scenario: Confirmar la compra de la última unidad disponible - Juan Barreto
    Given que el cliente tiene un producto en el carrito con cantidad cero
    And el cliente corresponde a un usuario válido
    When intenta confirmar la compra
    Then el sistema debe impedir finalizar la compra
    And debe indicar que la cantidad del producto no es válida


Feature: Agregar producto en stock al carrito

Como usuario del e-commerce
Quiero agregar productos disponibles al carrito
Para realizar una compra de los productos seleccionados

# Scenario: happy path - Armin Avezada Aquino
Scenario: Agregar producto disponible al carrito
Given el usuario se encuentra en la página de productos
And existe un producto disponible con stock
When selecciona el producto y lo agrega al carrito
Then el producto debe ser agregado correctamente al carrito
And la cantidad del producto en el carrito debe ser 1
And el stock disponible del producto debe actualizarse correctamente

# Scenario: caso negativo - Armin Avezada Aquino
Scenario: Intentar agregar un producto sin stock al carrito
Given el usuario se encuentra en la página de productos
And existe un producto sin stock disponible
When intenta agregar el producto al carrito
Then el producto no debe ser agregado al carrito
And debe visualizar un mensaje indicando que el producto no está disponible

# Scenario: edge case- Armin Avezada Aquino
Scenario: Agregar al carrito la cantidad máxima disponible en stock
Given el usuario se encuentra en la página de productos
And existe un producto con una cantidad limitada de stock
When agrega al carrito una cantidad igual al stock disponible
Then el producto debe ser agregado correctamente al carrito
And la cantidad agregada debe coincidir con el stock disponible
And el producto no debe permitir agregar una cantidad superior al stock disponible


Feature: Eliminar producto del carrito   - Andrea Escurra
  Como cliente del e-commerce
  quiero eliminar productos de mi carrito
  para ajustar mi compra antes del checkout

  Scenario: Eliminar un producto existente del carrito (happy path)   - Andrea Escurra
    Given el carrito contiene "Auriculares Bluetooth" con cantidad 1
    When elimino el producto "Auriculares Bluetooth" del carrito
    Then el producto ya no se lista en el carrito
    And se muestra el mensaje "Tu carrito esta vacio"

  Scenario: Intentar eliminar un producto inexistente en el carrito (caso negativo)   - Andrea Escurra
    Given el carrito contiene solo "Teclado USB"
    When intento eliminar el producto "Mouse Gamer" que no esta en el carrito
    Then el sistema muestra el error "El producto no existe en el carrito"
    And el carrito conserva el producto "Teclado USB"

  Scenario: Doble clic en eliminar sobre un producto ya removido (edge case)   - Andrea Escurra
    Given el carrito contiene solo "Cable HDMI"
    When elimino el producto "Cable HDMI" del carrito
    And hago doble clic sobre el boton eliminar del item ya removido
    Then el sistema no muestra errores
    And el carrito permanece vacio con total 0
