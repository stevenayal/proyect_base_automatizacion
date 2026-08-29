# Grupo 09 — Reportes y Dashboard
# Módulo: Panel de control / reportes financieros
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Reportes y Dashboard

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case
  # Todo: Scenario: Comparativa

# Scenario 1: happy path
Scenario: Generar reporte financiero correctamente
  Given el usuario se encuentra en el módulo de reportes
  When solicita generar un reporte financiero
  Then el sistema debe generar y mostrar el reporte correctamente

Caso Positivo -Claudio Cabrera
Escenario: Visualizar reporte financiero del mes 
Dado que el usuario ha iniciado sesión
Cuando consulta el reporte financiero del mes actual
Entonces se cargan las métricas y gráficos del panel de control.

Caso Negativo -Claudio Cabrera
Escenario: Consultar reporte en un período sin datos 
Dado que el usuario ha iniciado sesión
Cuando filtra el reporte para un año sin transacciones
Entonces se muestra un mensaje de "Sin datos disponibles".

Caso Limite - Claudio Cabrera
Escenario: Filtrar el rango máximo de años permitido 
Dado que el usuario ha iniciado sesión
Cuando selecciona un rango de fechas de 10 años
Entonces el reporte se genera agrupando los datos sin dar error de tiempo de espera.


 # Escenarios de Leila Ruiz — Control de acceso por rol

  # Caso Positivo
  Scenario Outline: Visualizar indicadores según el rol del usuario
    Given que el usuario tiene el rol "<rol>"
    When accede al panel de reportes financieros
    Then debe visualizar únicamente los indicadores "<indicadores_visibles>"

    Examples:
      | rol                      | indicadores_visibles                                        |
      | Administrador            | ingresos, egresos, utilidad neta, flujo de caja, auditoria |
      | Gerente Financiero       | ingresos, egresos, utilidad neta, flujo de caja             |
      | Analista Financiero      | ingresos, egresos, utilidad neta                             |
      | Auditor                  | flujo de caja, auditoria                                     |
      | Invitado (solo lectura)  | ingresos, egresos                                            |

  # Caso Negativo
  Scenario: Denegar acceso al panel a un rol sin permisos
    Given que el usuario tiene el rol "Sin permisos"
    When intenta acceder al panel de reportes financieros
    Then el sistema debe denegar el acceso y mostrar un mensaje de "Acceso restringido"

  # Caso Negativo
  Scenario: Rol no reconocido por el sistema
    Given que el usuario tiene el rol "Rol-Desconocido-999" no configurado en el sistema
    When intenta acceder al panel de reportes financieros
    Then el sistema debe mostrar un error de configuración de permisos

  # Caso Límite
  Scenario: Usuario cuyo rol fue revocado mientras tenia una sesion activa
    Given que el usuario tiene el rol "Analista Financiero" con la sesion ya iniciada
    And el administrador revoca ese rol durante la sesion activa
    When el usuario intenta refrescar o navegar dentro del panel de reportes financieros
    Then el sistema debe re-validar los permisos
    And debe cerrar la sesion o denegar el acceso a los indicadores restringidos