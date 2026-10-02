# BDD + Playwright — Sandbox POM

Suite aislada del catálogo genérico de steps del repositorio. Usa Cucumber, Playwright y Page
Objects para validar el inicio de sesión de AIQUAA Sandbox sin persistir secretos.

```powershell
$env:SANDBOX_API_KEY = '<clave del sandbox>'
npm run test:bdd:sandbox
Remove-Item Env:SANDBOX_API_KEY
```

Escenarios:

- Rechazo de un email inexistente.
- Inicio de sesión con el primer usuario activo obtenido mediante la consulta SQL parametrizada.

Los selectores se verificaron en la UI real: curso de automatización, campo `Email`, botón
`Ingresar` y encabezado de bienvenida. Cada escenario recibe un contexto nuevo; traces y
capturas se conservan solo al fallar.
