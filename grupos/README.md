# Grupos — Tarea BDD

Cada subcarpeta es el **vertical slice** de un grupo: contiene todo lo que ese grupo necesita
para su módulo (BDD, UI, page objects, evidencias), separado del resto para que cada equipo
trabaje y entregue un PR sin pisar el trabajo de los demás.

Lista de grupos (según `inscripcion-grupos-bdd2.xlsx`):

| Grupo | Carpeta / Rama | Módulo |
|-------|----------------|--------|
| 01 | `grupo-01-autenticacion-acceso` | Login / Logout / Recuperación de contraseña |
| 02 | `grupo-02-transferencias-cuentas` | Transferencias internas (mismo banco) |
| 03 | `grupo-03-pagos-servicios` | Pago de facturas (ANDE, ESSAP, telefonía) |
| 04 | `grupo-04-registro-onboarding` | Alta de nuevo cliente (KYC básico) |
| 05 | `grupo-05-tarjetas-credito-debito` | Gestión de tarjetas |
| 06 | `grupo-06-notificaciones-alertas` | Sistema de notificaciones (push/email/SMS) |
| 07 | `grupo-07-carrito-ecommerce` | Checkout de un e-commerce |
| 08 | `grupo-08-reservas-turnos` | Sistema de reserva de citas |
| 09 | `grupo-09-reportes-dashboard` | Panel de control / reportes financieros |
| 10 | `grupo-10-roles-permisos` | Gestión de usuarios internos (backoffice) |

## Flujo de entrega

1. Cambiar a la rama del grupo: `git checkout grupo-XX-modulo`
2. Trabajar únicamente dentro de `grupos/grupo-XX-modulo/`
3. Completar el checklist del `README.md` de la carpeta (ver también [ENTREGABLES.md](../ENTREGABLES.md))
4. `npm run test:e2e` y `npm run test:bdd` corren automáticamente los tests de todos los grupos
   (incluida esta carpeta), gracias a la configuración en `playwright.config.ts` y `package.json`
5. Abrir 1 Pull Request de `grupo-XX-modulo` hacia `main` usando la plantilla del repo
