# Resumen de la corrida de Newman — Grupo 06

Generado por `scripts/resumen_newman.py` a partir del JSON de Newman (que no se versiona porque incluye la API key).

| Dato | Valor |
|---|---|
| Colección | Grupo 06 - Notificaciones y Alertas (AIQUAA) |
| Inicio | 04/10/2026 20:05 |
| Duración | 5 min 33 s |
| Requests ejecutados | 76 (fallidos: 0) |
| Assertions | 470 (fallidas: 0) |
| Scripts de test | 120 (fallidos: 0) |
| Tiempo de respuesta promedio | 325 ms |

## Detalle por carpeta

| Carpeta | Requests | Assertions OK | Assertions fallidas |
|---|---|---|---|
| 00 Setup - Higiene de datos de prueba | 8 | 36 | 0 |
| S1 @happy_path - Push tras transferencia exitosa (TRX-001) | 4 | 54 | 0 |
| S6 @happy_path - SMS tras transferencia exitosa (TRX-006) | 2 | 21 | 0 |
| S8 @alternative_path - Multicanal push + email (TRX-009) | 4 | 39 | 0 |
| S4 @alternative_path - Email de respaldo por token vencido (TRX-004) | 4 | 42 | 0 |
| S2 @negative - Canal desactivado por preferencia (TRX-002) | 5 | 37 | 0 |
| S7 @negative - Datos obligatorios invalidos en SMS (TRX-007) | 2 | 18 | 0 |
| S3 @edge_case - Reproceso del mismo evento (TRX-003) | 5 | 36 | 0 |
| S5 @edge_case - Entrega diferida por horario silencioso (TRX-005) | 6 | 52 | 0 |
| S9 @happy_path - Email como canal principal (TRX-010) | 3 | 27 | 0 |
| RF-G6-01 @negative - Reglas del filtro y del listado | 6 | 53 | 0 |
| RF-G6-02 @negative - Validaciones de alta | 3 | 27 | 0 |
| HG06-03 @edge_case - PATCH /leer ignora la baja logica | 5 | 34 | 0 |
| CONTRATO @negative - Recursos inexistentes (404) | 6 | 42 | 0 |
| SEG @negative - Seguridad y contrato de errores | 6 | 47 | 0 |
| E2E @sql - Validacion SQL sobre marcar leida | 7 | 53 | 0 |

## Fallos

Ninguno.
