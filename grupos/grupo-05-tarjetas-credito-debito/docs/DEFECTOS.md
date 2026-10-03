# Defectos detectados — Grupo 05, Tarjetas de Crédito/Débito

Registro de los defectos encontrados por el equipo sobre el sandbox AIQUAA.

---

## DEF-G05-01 — Los botones "Bloquear" y "Activar" del listado de tarjetas no ejecutan la acción

| Campo | Valor |
| :--- | :--- |
| **Estado** | Abierto |
| **Severidad** | Alta — la operación es inaccesible desde la interfaz |
| **Prioridad** | Media — existe workaround por API |
| **Detectado** | 2026-09-19 |
| **Detectado por** | Matias Murto |
| **Componente** | Web — `https://aiquaa-sandbox-web.vercel.app/tarjetas` (curso 1) |
| **Escenario relacionado** | `Bloqueo de tarjeta desde el listado web` (`@manual @defecto`) |

### Precondiciones

- Sesión iniciada con un cliente activo del curso 1 (`bruno.ramirez@example.com`).
- Una tarjeta en estado `activa` perteneciente al usuario filtrado.

### Pasos para reproducir

1. Iniciar sesión y entrar al módulo **Tarjetas**.
2. Filtrar el listado por `usuarioId = 1`.
3. Ubicar una tarjeta con estado `activa`.
4. Hacer click en el botón **Bloquear** de esa fila
   (`data-testid="tarjetas-row-{id}-bloquear"`).

### Resultado esperado

La tarjeta pasa a estado `bloqueada`: el listado lo refleja y el cambio queda persistido.

### Resultado obtenido

No ocurre nada. El estado sigue en `activa` en pantalla y en la API.

### Evidencia técnica

Capturando el tráfico del navegador durante el click:

- **Cero peticiones** de escritura: no se dispara ningún `POST`, `PUT` ni `PATCH`. Solo se
  observan los prefetch `GET /tarjetas/{id}?_rsc=...` que Next.js hace sobre los enlaces visibles.
- `GET /api/v1/tarjetas/{id}` inmediatamente después del click devuelve `"estado": "activa"`.
- El botón está presente y habilitado:
  `<button type="button" data-testid="tarjetas-row-256-bloquear">Bloquear</button>`.

### Alcance acotado

| Vía | Resultado |
| :--- | :--- |
| `PATCH /api/v1/tarjetas/{id}/bloquear` (API directa) | ✅ funciona — `estado: "bloqueada"`, verificado también en la base |
| Formulario de edición del detalle (`tarjetas-row-{id}-edit-submit`) | ✅ funciona — envía `PUT /api/proxy/tarjetas/{id}` y persiste |
| Botón **Bloquear** / **Activar** del listado | ❌ no dispara ninguna petición |

El backend y el proxy funcionan: el problema está en el handler de esos dos botones del listado.

### Impacto en las pruebas

El escenario quedó documentado en el `.feature` con tags `@manual @defecto` y **no se automatizó
en verde**, para no registrar el comportamiento defectuoso como esperado. La cobertura de
bloqueo/desbloqueo se mantiene por API (`G05-TARJ-002` y `G05-TARJ-003`).

### Acciones pendientes

- [ ] Reportar al responsable del sandbox.
- [ ] Al corregirse, mover el escenario a `@web` y automatizarlo con `TarjetasPage.bloquear()`,
      que ya está implementado y a la espera.
