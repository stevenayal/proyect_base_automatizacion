@grupo-3 @api
Feature: Pagos de Servicios
  Como titular de facturas de servicios (ANDE, ESSAP, COPACO, Tigo, Personal)
  Quiero consultar, registrar y pagar mis facturas
  Para mantener mis cuentas de servicios al día

  # Datos: cada escenario crea su propia factura (número de factura único) porque las
  # escrituras del sandbox no están aisladas entre grupos y una factura se paga una
  # sola vez. El titular de prueba no está fijo en este archivo: al iniciar la corrida
  # la automatización elige al usuario activo con menos facturas pendientes, porque el
  # listado está limitado a 100 registros (un titular con 100 pendientes nunca vería
  # sus facturas nuevas). La configuración permite fijar uno.
  #
  # Verificación: todo resultado se comprueba con lo que la API responde o volviendo a
  # consultar la factura. El módulo no tiene un endpoint que liste pagos, así que los
  # pasos "en la base de datos…" se verifican con el endpoint de consultas de solo
  # lectura del sandbox (POST /api/v1/sql/select) sobre la tabla pagos.
  #
  # Rate limit: 30 req/min por API key — por eso los escenarios con varias consultas de
  # verificación son pocos, a propósito.
  #
  # Tags: @db = el escenario verifica la base de datos.
  #
  # Lenguaje: los pasos describen el comportamiento en lenguaje natural. El detalle
  # técnico (verbo HTTP, código de respuesta, código de error, campos JSON, cómo se
  # recuerda la factura de cada escenario) vive en los step definitions y queda
  # documentado en cada comentario "# criterio:".
  #
  # Tags: @RF-G3-0X = requerimiento funcional · @ande @essap @copaco @tigo @personal
  # = proveedor involucrado · @RF-transversal = reglas comunes a toda la API.

  Background:
    Given el usuario tiene una API key válida y activa

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-03 — Pagar una factura
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-03 — una factura pendiente se paga con un medio válido
  #           (200 · data.factura.estado=pagada · data.pago.estado=procesado)
  @smoke @RF-G3-03 @ande @web
  Scenario: Pago exitoso de una factura pendiente
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario paga la factura con el medio de pago "tarjeta"
    Then la factura se paga correctamente
    And la factura queda en estado "pagada"
    And el pago queda en estado "procesado"
    And el pago se registra con el medio de pago "tarjeta"

  # criterio: RF-G3-03 — el importe del pago lo toma el sistema de la factura, no el cliente
  #           (200 · data.pago.monto = data.factura.monto)
  @RF-G3-03 @essap
  Scenario: El importe del pago se copia de la factura
    Given el usuario tiene una factura de "ESSAP" pendiente de pago
    When el usuario paga la factura con el medio de pago "cuenta" e intenta indicar un monto de 1
    Then la factura se paga correctamente
    And el monto pagado es igual al monto de la factura y no al indicado por el usuario

  # criterio: RF-G3-03 — el titular del pago es el titular de la factura
  #           (200 · data.pago.usuario_id = titular de la factura)
  @RF-G3-03 @copaco
  Scenario: El titular del pago se copia de la factura
    Given el usuario tiene una factura de "COPACO" pendiente de pago
    When el usuario paga la factura con el medio de pago "efectivo"
    Then la factura se paga correctamente
    And el pago queda a nombre del titular de la factura

  # criterio: RF-G3-03 — cada medio de pago aceptado (tarjeta, cuenta, efectivo) permite pagar
  #           (200 · data.pago.metodo_pago = medio elegido)
  @smoke @RF-G3-03 @ande @essap @tigo @personal
  Scenario Outline: Se puede pagar con cada medio de pago permitido
    Given el usuario tiene una factura de "<proveedor>" pendiente de pago
    When el usuario paga la factura con el medio de pago "<medio>"
    Then la factura se paga correctamente
    And el pago se registra con el medio de pago "<medio>"
    And la factura queda en estado "pagada"

    Examples:
      | proveedor | medio    |
      | ANDE      | tarjeta  |
      | ESSAP     | cuenta   |
      | Tigo      | efectivo |
      | Personal  | tarjeta  |

  # criterio: RF-G3-03 — una factura vencida sí puede pagarse, por el importe original y sin recargos
  #           (200 · data.factura.estado=pagada · data.pago.monto = monto original)
  #           La API no permite dejar una factura en estado vencida, por eso se usa una vencida
  #           que ya venga en los datos sembrados. Como una factura se paga una sola vez, este
  #           escenario consume esa factura y solo puede repetirse mientras queden vencidas.
  @RF-G3-03 @datos-sembrados
  Scenario: Pago de una factura vencida es aceptado
    Given existe una factura vencida sin pagar
    When el usuario paga la factura con el medio de pago "tarjeta"
    Then la factura se paga correctamente
    And la factura queda en estado "pagada"
    And el monto pagado es igual al monto original de la factura, sin recargos

  # criterio: RF-G3-03 + sección 5 (reglas transversales) — el pago NO filtra por activo=true.
  #           Es una inconsistencia real y documentada del sandbox: una factura dada de baja
  #           sigue pudiendo pagarse, pero después ya no se puede consultar por id.
  #           (pago: 200 · data.factura.estado=pagada · consulta posterior: 404 NOT_FOUND)
  #           Si la API cambia y empieza a rechazar este pago, este escenario debe fallar
  #           para que el cambio quede visible.
  @edge-case @inconsistencia-documentada @RF-G3-03 @RF-G3-06 @copaco
  Scenario: Una factura dada de baja todavía puede pagarse (inconsistencia conocida del sandbox)
    Given el usuario tiene una factura de "COPACO" pendiente de pago
    And la factura fue dada de baja
    When el usuario paga la factura con el medio de pago "tarjeta"
    Then la factura se paga correctamente
    And la factura queda en estado "pagada"
    But al consultar el detalle de la factura el sistema informa que no fue encontrada

  # criterio: RF-G3-03 — una factura no se puede pagar dos veces y no se registra un segundo pago
  #           (404 NOT_FOUND · "Factura no encontrada o ya pagada." ·
  #           SELECT COUNT(*) FROM pagos WHERE factura_id = factura → 1)
  @negativo @db @RF-G3-03 @ande
  Scenario: Pagar dos veces la misma factura falla la segunda vez
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    And la factura ya fue pagada con el medio de pago "tarjeta"
    When el usuario intenta pagar nuevamente la factura con el medio de pago "tarjeta"
    Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada
    And se muestra el mensaje "Factura no encontrada o ya pagada."
    And al consultar el detalle de la factura, sigue en estado "pagada"
    And en la base de datos queda registrado un solo pago para la factura

  # criterio: RF-G3-03 — un medio de pago fuera de la lista es rechazado y la factura conserva su estado
  #           (400 VALIDATION_ERROR · la consulta posterior sigue mostrando estado pendiente)
  @negativo @RF-G3-03 @essap
  Scenario: Pago con un medio de pago no permitido
    Given el usuario tiene una factura de "ESSAP" pendiente de pago
    When el usuario paga la factura con el medio de pago "cripto"
    Then el sistema rechaza el pago por datos inválidos
    And al consultar el detalle de la factura, sigue en estado "pendiente"

  # criterio: RF-G3-03 — el medio de pago es obligatorio
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-03 @ande
  Scenario: Pago sin indicar el medio de pago
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario intenta pagar la factura sin indicar el medio de pago
    Then el sistema rechaza el pago por datos inválidos

  # criterio: RF-G3-03 — pagar una factura inexistente es rechazado y no crea ningún pago
  #           (404 NOT_FOUND · SELECT COUNT(*) FROM pagos WHERE factura_id = id inexistente → 0)
  @negativo @db @RF-G3-03
  Scenario: Pago de una factura que no existe
    When el usuario intenta pagar una factura que no existe
    Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada
    And en la base de datos no queda registrado ningún pago para esa factura

  # criterio: RF-G3-03 — el identificador de la factura debe ser un entero positivo
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-03
  Scenario Outline: Pago con un identificador de factura inválido
    When el usuario intenta pagar una factura con el identificador inválido "<id>"
    Then el sistema rechaza el pago por datos inválidos

    Examples:
      | id   |
      | abc  |
      | -5   |
      | 0    |

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-01 — Listar facturas
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-01 — al filtrar por estado pendiente, todas las facturas devueltas tienen ese estado
  #           (200 · data[].estado=pendiente)
  @smoke @RF-G3-01 @ande @web
  Scenario: Listar facturas filtrando por estado pendiente
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario consulta las facturas en estado "pendiente"
    Then el sistema devuelve el listado de facturas
    And todas las facturas del listado están en estado "pendiente"

  # criterio: RF-G3-01 — al combinar titular y estado se cumplen ambas condiciones
  #           (200 · data[].usuario_id = titular · data[].estado=pendiente)
  @RF-G3-01 @copaco @web
  Scenario: Listar facturas combinando titular y estado
    Given el usuario tiene una factura de "COPACO" pendiente de pago
    When el usuario consulta las facturas del titular en estado "pendiente"
    Then el sistema devuelve el listado de facturas
    And todas las facturas del listado pertenecen al titular
    And todas las facturas del listado están en estado "pendiente"

  # criterio: RF-G3-01 — un estado fuera de la lista permitida es rechazado
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-01
  Scenario: Listar facturas con un estado que no existe
    When el usuario consulta las facturas en estado "anulada"
    Then el sistema rechaza la consulta por datos inválidos

  # criterio: RF-G3-01 — un identificador de titular no numérico es rechazado
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-01
  Scenario: Listar facturas con un identificador de usuario no numérico
    When el usuario consulta las facturas de un usuario con el identificador no numérico "abc"
    Then el sistema rechaza la consulta por datos inválidos

  # criterio: RF-G3-01 — un titular sin facturas devuelve una lista vacía, no un error
  #           (200 · data=[])
  @RF-G3-01 @web
  Scenario: Listar facturas de un titular sin facturas
    When el usuario consulta las facturas de un usuario que no tiene facturas
    Then el sistema devuelve el listado de facturas
    And el listado está vacío

  # criterio: RF-G3-01 — el listado está limitado a 100 registros
  #           (200 · data.length <= 100)
  @RF-G3-01
  Scenario: El listado no supera las 100 facturas
    When el usuario consulta todas las facturas sin filtros
    Then el sistema devuelve el listado de facturas
    And el listado tiene como máximo 100 facturas

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-02 — Consultar una factura
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-02 — consultar una factura existente devuelve su detalle
  #           (200 · data.numero_factura · data.proveedor · data.estado)
  @smoke @RF-G3-02 @personal @web
  Scenario: Consultar el detalle de una factura existente
    Given el usuario tiene una factura de "Personal" pendiente de pago
    When el usuario consulta el detalle de la factura
    Then el sistema devuelve el detalle de la factura
    And la factura tiene número de factura
    And la factura es del proveedor "Personal"
    And la factura está en estado "pendiente"

  # criterio: RF-G3-02 — una factura inexistente es informada como no encontrada
  #           (404 NOT_FOUND · "Factura no encontrada.")
  @negativo @RF-G3-02
  Scenario: Consultar una factura que no existe
    When el usuario consulta el detalle de una factura que no existe
    Then el sistema informa que la factura no fue encontrada
    And se muestra el mensaje "Factura no encontrada."

  # criterio: RF-G3-02 — el identificador debe ser un entero positivo
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-02
  Scenario: Consultar una factura con un identificador inválido
    When el usuario consulta el detalle de una factura con el identificador inválido "abc"
    Then el sistema rechaza la consulta por datos inválidos

  # criterio: RF-G3-02 — después de pagar, la consulta muestra la factura como pagada
  #           (200 · data.estado=pagada)
  @RF-G3-02 @RF-G3-03 @ande
  Scenario: La factura consultada refleja el pago realizado
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    And la factura ya fue pagada con el medio de pago "cuenta"
    When el usuario consulta el detalle de la factura
    Then el sistema devuelve el detalle de la factura
    And la factura está en estado "pagada"

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-04 — Crear una factura
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-04 — registrar una factura con datos válidos la crea en estado pendiente
  #           (201 Created · data.estado=pendiente · la consulta posterior la muestra pendiente)
  @smoke @RF-G3-04 @ande
  Scenario: Registrar una factura con datos válidos
    When el usuario registra una factura de "ANDE" por 150000.50 con vencimiento "2026-12-31"
    Then la factura se registra correctamente
    And la factura queda en estado "pendiente"
    And al consultar el detalle de la factura, figura en estado "pendiente"

  # criterio: RF-G3-04 — el cliente no puede elegir el estado inicial
  #           (201 Created · data.estado=pendiente aunque se envíe estado=pagada)
  @RF-G3-04 @essap
  Scenario: El estado inicial siempre es pendiente aunque se indique otro
    When el usuario registra una factura de "ESSAP" por 80000 con vencimiento "2026-12-31" indicando que ya está "pagada"
    Then la factura se registra correctamente
    And la factura queda en estado "pendiente"

  # criterio: RF-G3-04 — la factura registrada aparece en el listado del titular
  #           (200 · data[] contiene la factura creada)
  @RF-G3-04 @RF-G3-01 @tigo @web
  Scenario: La factura registrada aparece en el listado del titular
    Given el usuario tiene una factura de "Tigo" pendiente de pago
    When el usuario consulta las facturas del titular en estado "pendiente"
    Then el sistema devuelve el listado de facturas
    And la factura aparece en el listado

  # criterio: RF-G3-04 — un número de factura repetido es rechazado
  #           (409 CONFLICT)
  @negativo @RF-G3-04 @ande
  Scenario: Registrar una factura con un número que ya existe
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario intenta registrar otra factura con el mismo número de factura
    Then el sistema rechaza la factura porque el número de factura ya existe

  # criterio: RF-G3-04 — un proveedor fuera de la lista es rechazado
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-04
  Scenario: Registrar una factura de un proveedor no permitido
    When el usuario intenta registrar una factura del proveedor "Claro"
    Then el sistema rechaza la factura por datos inválidos

  # criterio: RF-G3-04 — un titular inexistente es rechazado
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-04
  Scenario: Registrar una factura para un usuario que no existe
    When el usuario intenta registrar una factura para un usuario que no existe
    Then el sistema rechaza la factura por datos inválidos

  # criterio: RF-G3-04 — los campos obligatorios y el monto mayor que cero se validan
  #           (400 VALIDATION_ERROR en cada caso)
  @negativo @RF-G3-04
  Scenario Outline: Registrar una factura con datos incompletos o inválidos
    When el usuario intenta registrar una factura <caso>
    Then el sistema rechaza la factura por datos inválidos

    Examples:
      | caso                                  |
      | sin indicar el usuario                |
      | sin indicar el proveedor              |
      | sin indicar el número de factura      |
      | sin indicar el monto                  |
      | con monto cero                        |
      | con monto negativo                    |
      | sin indicar la fecha de vencimiento   |

  # criterio: RF-G3-04 — una fecha de vencimiento no interpretable es un error de ejecución
  #           (400 EXECUTION_ERROR)
  @negativo @RF-G3-04
  Scenario: Registrar una factura con una fecha de vencimiento no válida
    When el usuario intenta registrar una factura con vencimiento "no-es-una-fecha"
    Then el sistema rechaza la factura porque no puede interpretar la fecha de vencimiento

  # criterio: RF-G3-04 — el sandbox no valida que el vencimiento sea una fecha futura
  #           (201 Created · data.estado=pendiente)
  @RF-G3-04 @copaco
  Scenario: Registrar una factura con fecha de vencimiento ya pasada es aceptado
    When el usuario registra una factura de "COPACO" con vencimiento ya pasado "2020-01-01"
    Then la factura se registra correctamente
    And la factura queda en estado "pendiente"

  # criterio: transversal — un cuerpo mal formado es rechazado con el mensaje "Invalid JSON body."
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-04 @RF-transversal
  Scenario: Registrar una factura con datos mal formados
    When el usuario intenta registrar una factura con datos mal formados
    Then el sistema rechaza la factura por datos inválidos
    And se muestra el mensaje "Invalid JSON body."

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-05 — Reemplazar una factura
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-05 — modificar el monto de una factura pendiente la actualiza y el estado sigue pendiente
  #           (200 · data.monto=275000.00 · data.estado=pendiente)
  @smoke @RF-G3-05 @ande @web
  Scenario: Modificar el monto de una factura pendiente
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario modifica el monto de la factura a 275000
    Then la factura se actualiza correctamente
    And la factura queda con monto 275000.00
    And la factura queda en estado "pendiente"

  # criterio: RF-G3-05 — la modificación nunca cambia el estado
  #           (200 · data.estado=pendiente aunque se envíe estado=pagada)
  @RF-G3-05 @essap
  Scenario: La modificación ignora un cambio de estado
    Given el usuario tiene una factura de "ESSAP" pendiente de pago
    When el usuario modifica la factura indicando que ya está "pagada"
    Then la factura se actualiza correctamente
    And la factura queda en estado "pendiente"

  # criterio: RF-G3-05 — usar el número de otra factura existente es rechazado
  #           (409 CONFLICT)
  @negativo @RF-G3-05 @ande @essap
  Scenario: Modificar una factura con el número de otra factura existente
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    And el usuario tiene otra factura de "ESSAP" pendiente de pago
    When el usuario modifica la factura de "ESSAP" asignándole el número de la factura de "ANDE"
    Then el sistema rechaza la modificación porque el número de factura ya pertenece a otra factura

  # criterio: RF-G3-05 — modificar una factura inexistente es informado como no encontrada
  #           (404 NOT_FOUND)
  @negativo @RF-G3-05
  Scenario: Modificar una factura que no existe
    When el usuario intenta modificar una factura que no existe
    Then el sistema informa que la factura no fue encontrada

  # criterio: RF-G3-05 — modificar una factura dada de baja es informado como no encontrada
  #           (404 NOT_FOUND)
  @negativo @RF-G3-05 @tigo
  Scenario: Modificar una factura dada de baja
    Given el usuario tiene una factura de "Tigo" pendiente de pago
    And la factura fue dada de baja
    When el usuario intenta modificar la factura
    Then el sistema informa que la factura no fue encontrada

  # criterio: RF-G3-05 — faltan campos obligatorios, proveedor no permitido o monto inválido
  #           (400 VALIDATION_ERROR en cada caso)
  @negativo @RF-G3-05 @ande
  Scenario Outline: Modificar una factura con datos incompletos o inválidos
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario intenta modificar la factura <caso>
    Then el sistema rechaza la modificación por datos inválidos

    Examples:
      | caso                              |
      | con un proveedor no permitido     |
      | sin indicar el proveedor          |
      | con monto cero                    |

  # ═══════════════════════════════════════════════════════════════
  # RF-G3-06 — Dar de baja una factura
  # ═══════════════════════════════════════════════════════════════

  # criterio: RF-G3-06 — dar de baja una factura vigente es una baja lógica, sin borrado
  #           (204 No Content · la consulta posterior por id responde 404)
  @smoke @RF-G3-06 @ande
  Scenario: Dar de baja una factura vigente
    Given el usuario tiene una factura de "ANDE" pendiente de pago
    When el usuario da de baja la factura
    Then la factura se da de baja correctamente
    And al consultar el detalle de la factura, el sistema informa que no fue encontrada

  # criterio: RF-G3-06 — tras la baja, la factura ya no se puede consultar por id
  #           (404 NOT_FOUND)
  @RF-G3-06 @RF-G3-02 @essap
  Scenario: Una factura dada de baja deja de poder consultarse
    Given el usuario tiene una factura de "ESSAP" pendiente de pago
    And la factura fue dada de baja
    When el usuario consulta el detalle de la factura
    Then el sistema informa que la factura no fue encontrada

  # criterio: RF-G3-06 — tras la baja, la factura deja de aparecer en el listado
  #           (200 · data[] no contiene la factura)
  @RF-G3-06 @RF-G3-01 @copaco @web
  Scenario: Una factura dada de baja deja de aparecer en el listado
    Given el usuario tiene una factura de "COPACO" pendiente de pago
    And la factura fue dada de baja
    When el usuario consulta las facturas del titular en estado "pendiente"
    Then el sistema devuelve el listado de facturas
    And la factura no aparece en el listado

  # criterio: RF-G3-06 — una factura ya pagada también puede darse de baja, sin afectar el pago registrado
  #           (204 No Content · SELECT COUNT(*) FROM pagos WHERE factura_id = factura → 1)
  @db @RF-G3-06 @tigo
  Scenario: Dar de baja una factura ya pagada no afecta el pago registrado
    Given el usuario tiene una factura de "Tigo" pendiente de pago
    And la factura ya fue pagada con el medio de pago "efectivo"
    When el usuario da de baja la factura
    Then la factura se da de baja correctamente
    And en la base de datos el pago de la factura se conserva

  # criterio: RF-G3-06 — dar de baja una factura inexistente es informado como no encontrada
  #           (404 NOT_FOUND)
  @negativo @RF-G3-06
  Scenario: Dar de baja una factura que no existe
    When el usuario intenta dar de baja una factura que no existe
    Then el sistema informa que la factura no fue encontrada

  # criterio: RF-G3-06 — el identificador debe ser un entero positivo
  #           (400 VALIDATION_ERROR)
  @negativo @RF-G3-06
  Scenario: Dar de baja una factura con un identificador inválido
    When el usuario intenta dar de baja una factura con el identificador inválido "abc"
    Then el sistema rechaza la baja por datos inválidos

  # ═══════════════════════════════════════════════════════════════
  # Reglas transversales de la API
  # ═══════════════════════════════════════════════════════════════

  # criterio: transversal — sin una API key válida no se puede operar sobre las facturas
  #           (401 UNAUTHORIZED en cada caso)
  @negativo @RF-transversal
  Scenario Outline: Sin API key válida no se puede operar sobre las facturas
    Given el usuario tiene una API key inválida
    When el usuario intenta <accion>
    Then el sistema rechaza el acceso por API key inválida

    Examples:
      | accion                                |
      | consultar el listado de facturas      |
      | consultar el detalle de una factura   |
      | dar de baja una factura               |

  # criterio: transversal — sin una API key válida no se puede pagar una factura
  #           (401 UNAUTHORIZED)
  @negativo @RF-transversal @RF-G3-03
  Scenario: Sin API key válida no se puede pagar una factura
    Given el usuario tiene una API key inválida
    When el usuario intenta pagar una factura con el medio de pago "tarjeta"
    Then el sistema rechaza el acceso por API key inválida

  # criterio: transversal — la operación de pago solo admite el método previsto; otro método es rechazado
  #           (405 Method Not Allowed · GET sobre /facturas/{id}/pagar)
  @negativo @RF-transversal @RF-G3-03
  Scenario: La operación de pago no admite otro tipo de solicitud
    When el usuario intenta usar la operación de pago de una factura con un tipo de solicitud no permitido
    Then el sistema indica que la operación no está permitida
