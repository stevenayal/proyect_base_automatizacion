@echo off
rem ==========================================================================
rem  Grupo 03 - Plan final por endpoint: corrida desde la PC (demo en vivo).
rem
rem  Uso (doble clic o desde cualquier carpeta):
rem    GRUPO_03_demo_final.bat            modo demo: 5 muestras por endpoint, ~4 min
rem    GRUPO_03_demo_final.bat completa   modo completo: 30 muestras + saturacion, ~25 min
rem
rem  Requisitos: JMeter 5.6.3 (en el PATH o JMETER_HOME) y Python 3.
rem  Opcional:   el MCP compilado (MCP_HOME, por defecto C:\proyectos\aiquaa-performance-mcp-server)
rem              para el veredicto por endpoint contra los umbrales.
rem  Opcional:   API_KEY con otra clave; si no, la clave demo del archivo de propiedades.
rem
rem  Los resultados quedan en test-results\performance-final\ (ignorado por git).
rem ==========================================================================
setlocal
chcp 65001 >nul

set "MODO=%~1"
if "%MODO%"=="" set "MODO=demo"
if /i not "%MODO%"=="demo" if /i not "%MODO%"=="completa" (
  echo Modo desconocido: %MODO%. Usar demo o completa.
  exit /b 1
)

set "PERF=%~dp0"
set "REPO=%PERF%..\.."
set "PLAN=%PERF%plans\Grupo03_Plan_de_Pruebas_JMeter_CSV_Final.jmx"
set "PROPS=%PERF%properties\GRUPO_03_final_%MODO%.properties"
set "UMBRALES=%PERF%thresholds\GRUPO_03_thresholds_final.json"
set "PY=%PERF%scripts\GRUPO_03_resultados_final.py"

if defined JMETER_HOME (set "JMETER=%JMETER_HOME%\bin\jmeter.bat") else (set "JMETER=jmeter")
if not defined MCP_HOME set "MCP_HOME=C:\proyectos\aiquaa-performance-mcp-server"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "OUT=%REPO%\test-results\performance-final\%MODO%_%TS%"
mkdir "%OUT%" 2>nul

set "KEY_ARG="
if defined API_KEY set "KEY_ARG=-JapiKey=%API_KEY%"

echo.
echo === 1/4  JMeter (%MODO%) ===
echo Plan:       %PLAN%
echo Resultados: %OUT%
echo.
call "%JMETER%" -n -t "%PLAN%" -q "%PROPS%" %KEY_ARG% -JjtlFile="%OUT%\R_FINAL.jtl" -j "%OUT%\jmeter.log"
if not exist "%OUT%\R_FINAL.jtl" (
  echo JMeter no genero resultados. Ver %OUT%\jmeter.log
  exit /b 1
)

echo.
echo === 2/4  Resumen por endpoint ===
python "%PY%" separar --jtl "%OUT%\R_FINAL.jtl" --salida "%OUT%"
if errorlevel 1 exit /b 1

echo.
echo === 3/4  Veredicto por endpoint (MCP) ===
set "VEREDICTO=0"
if exist "%MCP_HOME%\dist\server.js" (
  node "%MCP_HOME%\dist\server.js" --evaluate "%OUT%\R_FINAL_ENDPOINTS.jtl" "%UMBRALES%" > "%OUT%\EVALUACION_FINAL.json"
  python "%PY%" veredicto --evaluacion "%OUT%\EVALUACION_FINAL.json" --umbrales "%UMBRALES%"
  if errorlevel 1 set "VEREDICTO=1"
) else (
  echo No se encontro %MCP_HOME%\dist\server.js: se omite el veredicto.
  echo Compilar el MCP con "npm ci ^&^& npm run build" o definir MCP_HOME.
)

echo.
echo === 4/4  Dashboard HTML de JMeter ===
call "%JMETER%" -g "%OUT%\R_FINAL_ENDPOINTS.jtl" -o "%OUT%\dashboard_ENDPOINTS" >nul
if exist "%OUT%\R_FINAL_SATURACION.jtl" call "%JMETER%" -g "%OUT%\R_FINAL_SATURACION.jtl" -o "%OUT%\dashboard_SATURACION" >nul
if exist "%OUT%\dashboard_ENDPOINTS\index.html" start "" "%OUT%\dashboard_ENDPOINTS\index.html"

echo.
echo Listo. Resultados en %OUT%
exit /b %VEREDICTO%
