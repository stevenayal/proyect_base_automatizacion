# language: es
@grupo09 @leila @web
Característica: Control de acceso por rol y reportes del dashboard
  Como administrador del sandbox AIQUAA
  Quiero consultar los roles de cada usuario y su reporte de movimientos
  Para verificar que cada perfil ve solo la información que le corresponde

  # Los usuarios NO se hardcodean: se obtienen en tiempo de ejecución con
  # la API del sandbox (POST /api/v1/sql/select), igual que en la colección
  # Postman y el plan JMeter de Leila.

  Antecedentes:
    Dado que inicié sesión en el sandbox como administrador

  @GRUPO09-LEILA-01 @happy_path
  Escenario: Ver los roles asignados a un usuario auditor
    Dado que obtengo desde la API un usuario activo con el rol "auditor"
    Cuando consulto sus roles en el módulo Roles
    Entonces veo el título "Roles de" con el nombre del usuario
    Y el rol "auditor" figura como "Asignado"

  @GRUPO09-LEILA-02 @happy_path
  Escenario: El reporte del dashboard coincide con el resumen de la API
    Dado que obtengo desde la API un usuario activo con el rol "auditor"
    Cuando filtro el módulo Reportes por ese usuario
    Entonces la cantidad de movimientos coincide con el resumen de la API

  @GRUPO09-LEILA-03 @negativo
  Escenario: Reporte de un usuario que no existe
    Cuando filtro el módulo Reportes por el usuarioId "99999999"
    Entonces veo el mensaje "Sin resultados."
    Y la cantidad de movimientos mostrada es 0

  @GRUPO09-LEILA-04 @edge_case
  Escenario: Usuario activo sin ningún rol asignado
    Dado que obtengo desde la API un usuario activo sin roles asignados
    Cuando consulto sus roles en el módulo Roles
    Entonces todos los roles figuran como "Sin asignar"
