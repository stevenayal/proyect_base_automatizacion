@grupo-8 @web
Feature: Reservas / Turnos

  # criterio: El sistema debe mostrar correctamente los turnos disponibles.
  @smoke
  Scenario: Consulta exitosa de turnos disponibles
    Given existen turnos disponibles para reservar
    When el usuario consulta los turnos disponibles
    Then el sistema debe mostrar los turnos disponibles correctamente

  # criterio: El sistema debe permitir consultar los datos de una reserva existente.
  @smoke
  Scenario: Consulta exitosa de una reserva existente
    Given existe una reserva registrada
    When el usuario consulta la reserva
    Then el sistema debe mostrar los datos de la reserva correctamente

  # criterio: El sistema no debe permitir realizar una reserva con una fecha anterior a la actual.
  @negativo
  Scenario: Reserva con fecha anterior a la actual
    Given existen turnos registrados en el sistema
    When el usuario intenta realizar una reserva para una fecha anterior a la actual
    Then el sistema debe rechazar la reserva

  # criterio: Si dos usuarios solicitan simultaneamente el ultimo turno disponible, solamente una reserva debe ser confirmada.
  Scenario: Reserva simultanea del ultimo turno disponible
    Given existe un unico turno disponible
    When dos usuarios intentan reservar el mismo turno al mismo tiempo
    Then el sistema debe confirmar la reserva para un solo usuario y rechazar la otra solicitud
