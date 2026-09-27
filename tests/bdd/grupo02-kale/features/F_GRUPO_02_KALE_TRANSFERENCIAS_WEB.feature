# language: es
@grupo02 @web @transferencias
Característica: Transferencias entre cuentas desde la web
  Como cliente del banco
  Quiero transferir dinero entre cuentas del mismo banco
  Para mover dinero de forma segura

  Antecedentes:
    Dado que inicié sesión con un usuario activo de la base de datos
    Y que obtengo de la base de datos dos cuentas activas en "PYG"
    Y que estoy en la pantalla de nueva transferencia

  @WEB-TR-01 @happy_path @crea-datos
  Escenario: Realizar una transferencia interna exitosa
    Cuando transfiero 15000 desde la cuenta origen hacia la cuenta destino
    Entonces veo el comprobante "Transferencia creada."
    Y el comprobante muestra el estado "pendiente"
    Y la base de datos registra la transferencia con el monto 15000 en estado "pendiente"

  @WEB-TR-02 @negativo @regla-negocio
  Escenario: Rechazar una transferencia hacia la misma cuenta
    Cuando transfiero 5000 desde la cuenta origen hacia la misma cuenta origen
    Entonces veo un error de validación que menciona "check constraint"
    Y la base de datos no registra ninguna transferencia nueva

  @WEB-TR-03 @negativo
  Esquema del escenario: Rechazar montos inválidos antes de enviar
    Cuando intento transferir <monto> desde la cuenta origen hacia la cuenta destino
    Entonces el formulario no se envía y el campo monto queda inválido
    Y la base de datos no registra ninguna transferencia nueva

    Ejemplos:
      | monto |
      | 0     |
      | -500  |

  @WEB-TR-04 @crea-datos @consulta
  Escenario: La transferencia creada aparece en el historial de la cuenta origen
    Cuando transfiero 7500 desde la cuenta origen hacia la cuenta destino
    Y vuelvo a la pantalla de transferencias y filtro por la cuenta origen
    Entonces la transferencia creada aparece en la lista
