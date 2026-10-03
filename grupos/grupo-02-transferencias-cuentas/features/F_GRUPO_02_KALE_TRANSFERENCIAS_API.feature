# language: es
# Grupo 02 — Transferencias entre Cuentas
# Escenarios BDD de API. Cada escenario está mapeado a un request de
# postman/C_GRUPO_02_KALE_TRANSFERENCIAS.postman_collection.json (ver docs/TRAZABILIDAD_BDD_API_KALE.md).
@grupo02 @api @transferencias
Característica: API de transferencias entre cuentas del mismo banco
  Como cliente del banco
  Quiero transferir dinero entre cuentas y consultar mis movimientos
  Para mover dinero de forma segura dentro del mismo banco

  Antecedentes:
    Dado que existen al menos dos cuentas activas en "PYG" obtenidas de la base de datos

  @TR-01 @consulta
  Escenario: Consultar una cuenta activa
    Cuando consulto la cuenta origen por su id
    Entonces la respuesta es 200 con los datos de la cuenta activa
    Y el número de cuenta y el saldo coinciden con la base de datos

  @TR-01b @consulta
  Escenario: Listar las cuentas activas de un usuario
    Cuando listo las cuentas del dueño de la cuenta origen
    Entonces todas las cuentas devueltas son de ese usuario y están activas

  @TR-02 @negativo
  Escenario: Una cuenta inactiva no se puede consultar
    Dado que la base de datos confirma que la cuenta está inactiva
    Cuando consulto esa cuenta por su id
    Entonces la respuesta es 404 "Cuenta no encontrada."

  @TR-03 @happy_path @sql
  Escenario: Realizar una transferencia interna exitosa
    Dado que la base de datos confirma que la cuenta origen y la destino están activas
    Cuando transfiero 15000 Gs desde la cuenta origen hacia la cuenta destino
    Entonces la respuesta es 201 con la transferencia en estado "pendiente"
    Y la base de datos registra la transferencia con los mismos datos

  @TR-04 @consulta
  Escenario: Consultar el comprobante de la transferencia creada
    Cuando consulto la transferencia creada por su id
    Entonces la respuesta es 200 con el mismo monto, cuentas y estado "pendiente"

  @TR-05 @consulta
  Escenario: El historial de la cuenta origen incluye la nueva transferencia
    Cuando listo las transferencias de la cuenta origen
    Entonces la transferencia creada aparece en el historial

  @TR-06 @negativo @sql @caso-propio
  Escenario: Rechazar una transferencia hacia la misma cuenta
    Cuando transfiero desde la cuenta origen hacia la misma cuenta origen
    Entonces la respuesta es 400 VALIDATION_ERROR por la regla "origen distinto de destino"
    Y la base de datos no registra ninguna transferencia nueva

  @TR-07 @negativo @sql
  Escenario: Rechazar una transferencia con monto cero
    Cuando transfiero 0 Gs desde la cuenta origen hacia la cuenta destino
    Entonces la respuesta es 400 VALIDATION_ERROR sobre el campo "monto"
    Y la base de datos no registra ninguna transferencia nueva

  @TR-08 @negativo @sql
  Escenario: Rechazar una transferencia hacia una cuenta inexistente
    Cuando transfiero hacia una cuenta destino que no existe en la base de datos
    Entonces la respuesta es 400 VALIDATION_ERROR por clave foránea
    Y la base de datos no registra ninguna transferencia nueva

  @TR-09 @negativo @seguridad
  Escenario: No se puede operar sin credenciales
    Cuando consulto una transferencia sin enviar la API key
    Entonces la respuesta es 401 UNAUTHORIZED

  @TR-10 @limpieza @sql
  Escenario: Anular la transferencia de prueba
    Cuando anulo la transferencia creada
    Entonces la respuesta es 204
    Y la base de datos marca la transferencia como inactiva
    Y al consultarla nuevamente la respuesta es 404
