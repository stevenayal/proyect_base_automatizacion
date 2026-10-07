# language: es
@grupo-10 @web
Característica: Administración de roles desde la pantalla Roles
  Como administrador del sandbox
  Quiero asignar y revocar roles de un usuario desde la pantalla Roles
  Para que cada usuario tenga los permisos que le corresponden

  @smoke @S6-ROLES-01
  # criterio: S6-ROLES-01 - Al asignar un rol a un usuario sin roles, la pantalla confirma la asignación y el rol queda Asignado (RF-G10-03)
  Escenario: S6-ROLES-01 Asignar un rol a un usuario sin roles
    Dado que existe un usuario de prueba
    Y que inicio sesión con el usuario de prueba
    Y que estoy en la pantalla de roles
    Cuando asigno el rol "soporte"
    Entonces veo el mensaje "Rol asignado."
    Y el rol "soporte" figura como "Asignado"

  # DEFECTO CONOCIDO (hallazgo S6-H01): el proxy de la web responde 500 al DELETE (la API devuelve 204);
  # la pantalla muestra "Error inesperado." y no refresca. La revocación sí se aplica en el backend.
  @defecto-conocido @S6-ROLES-02
  # criterio: S6-ROLES-02 - Al revocar un rol asignado se pide confirmación; al aceptar, la pantalla confirma la revocación y el rol queda Sin asignar (RF-G10-04)
  Escenario: S6-ROLES-02 Revocar un rol asignado con confirmación
    Dado que existe un usuario de prueba
    Y que el usuario de prueba tiene el rol "soporte"
    Y que inicio sesión con el usuario de prueba
    Y que estoy en la pantalla de roles
    Cuando revoco el rol "soporte"
    Y confirmo la revocación del rol "soporte"
    Entonces veo el mensaje "Rol revocado."
    Y el rol "soporte" figura como "Sin asignar"

  @negativo @S6-ROLES-03
  # criterio: S6-ROLES-03 - Si se cancela la confirmación de la revocación, el rol sigue Asignado
  Escenario: S6-ROLES-03 Cancelar la revocación mantiene el rol asignado
    Dado que existe un usuario de prueba
    Y que el usuario de prueba tiene el rol "soporte"
    Y que inicio sesión con el usuario de prueba
    Y que estoy en la pantalla de roles
    Cuando revoco el rol "soporte"
    Y cancelo la revocación del rol "soporte"
    Entonces el rol "soporte" figura como "Asignado"
    Y no veo ningún mensaje de éxito