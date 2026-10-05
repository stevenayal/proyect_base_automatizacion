@echo off
rem ==========================================================================
rem  Grupo 03 - Cucumber + Playwright (BDD + POM) desde la PC.
rem
rem  Uso (doble clic o desde cualquier carpeta):
rem    GRUPO_03_bdd.bat            suite web: los 8 escenarios @web (~3 min, demo en vivo)
rem    GRUPO_03_bdd.bat completa   suite completa: 46 escenarios / 61 ejecuciones (~10 min)
rem    GRUPO_03_bdd.bat dryrun     solo verifica que cada paso tenga step definition
rem
rem  Variables opcionales (si no estan definidas se usan los valores de clase):
rem    G3_WEB_EMAIL, G3_WEB_CURSO   login de la web (admin@aiquaa.com / curso 1)
rem    G3_API_KEY                   API key del sandbox (por defecto la demo)
rem    G3_RPM                       peticiones por minuto (por defecto 20)
rem    G3_TITULAR                   id del titular (vacio = el de menos pendientes)
rem    G3_HEADED=1                  ver el navegador mientras corre
rem
rem  Resultados en test-results\grupo-03-bdd\ (ignorado por git; se vacia al empezar cada corrida).
rem ==========================================================================
setlocal
chcp 65001 >nul

set "SUITE=%~1"
if "%SUITE%"=="" set "SUITE=web"
if /i "%SUITE%"=="web" set "PERFIL=g3-web"
if /i "%SUITE%"=="completa" set "PERFIL=g3-completa"
if /i "%SUITE%"=="dryrun" set "PERFIL=dryrun"
if not defined PERFIL (
  echo Suite desconocida: %SUITE%. Usar web, completa o dryrun.
  exit /b 1
)

set "G3=%~dp0"
pushd "%G3%..\.."
set "REPO=%CD%"
set "RESULTS=%REPO%\test-results\grupo-03-bdd"

rem Cada corrida empieza con la carpeta de resultados vacia: asi no se mezclan trazas ni
rem reportes de corridas anteriores (el dryrun no la toca).
if not "%PERFIL%"=="dryrun" if exist "%RESULTS%" (
  echo Limpiando resultados anteriores de %RESULTS%
  rmdir /s /q "%RESULTS%"
)

if not defined G3_WEB_EMAIL set "G3_WEB_EMAIL=admin@aiquaa.com"
if not defined G3_WEB_CURSO set "G3_WEB_CURSO=1"

if not exist "%REPO%\node_modules\@cucumber\cucumber\package.json" (
  echo Instalando dependencias del repo...
  call npm ci || goto :error
)
rem ts-node 10 necesita la API de compilador de TypeScript 5. TypeScript 7 (nativo) ya no la
rem trae y ts-node falla con "Cannot read properties of undefined (reading 'fileExists')".
set "TSMAJOR="
for /f %%v in ('node -p "require('typescript/package.json').version.split('.')[0]" 2^>nul') do set "TSMAJOR=%%v"
if not exist "%REPO%\node_modules\ts-node\package.json" set "TSMAJOR=falta"
if not "%TSMAJOR%"=="5" (
  echo Instalando ts-node 10 y typescript 5 sin modificar package.json ^(typescript encontrado: %TSMAJOR%^)...
  call npm install --no-save ts-node@10 typescript@5 || goto :error
)
if not "%PERFIL%"=="dryrun" call npx playwright install chromium >nul

echo.
echo === Cucumber + Playwright - Grupo 03 - %PERFIL% ===
echo.
call npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile %PERFIL%
set "RC=%ERRORLEVEL%"
if "%PERFIL%"=="dryrun" goto :fin

echo.
if not exist "%RESULTS%\cucumber-report.json" (
  echo Cucumber no genero resultados: revisar el error de arriba. No se genera el informe.
  goto :fin
)
echo === Informe PDF ===
python "%G3%reporter\g3_bdd_report.py" --results "%RESULTS%\cucumber-report.json" --perfil %PERFIL% --author "Grupo 03"
if exist "%RESULTS%\INFORME_BDD_GRUPO03_PAGOS_SERVICIOS.pdf" start "" "%RESULTS%\INFORME_BDD_GRUPO03_PAGOS_SERVICIOS.pdf"
echo Reporte HTML de Cucumber: %RESULTS%\cucumber-report.html

:fin
popd
exit /b %RC%

:error
echo No se pudieron instalar las dependencias.
popd
exit /b 1
