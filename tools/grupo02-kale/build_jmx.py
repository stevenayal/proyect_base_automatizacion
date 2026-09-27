#!/usr/bin/env python3
"""Genera tests/performance/plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx (JMeter 5.6.3).

    python3 tools/grupo02-kale/build_jmx.py

El .jmx resultante se abre normalmente en la GUI de JMeter.
"""
from pathlib import Path
from xml.sax.saxutils import escape
import xml.dom.minidom

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tests/performance/plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx"


def esc(s: str) -> str:
    return escape(s, {'"': "&quot;"})


def rc_assert(name, code):
    return f"""
          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="{name}" enabled="true">
            <collectionProp name="Asserion.test_strings">
              <stringProp name="{code}">{code}</stringProp>
            </collectionProp>
            <stringProp name="Assertion.custom_message">Se esperaba HTTP {code}</stringProp>
            <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
            <boolProp name="Assertion.assume_success">false</boolProp>
            <intProp name="Assertion.test_type">8</intProp>
          </ResponseAssertion>
          <hashTree/>"""


def json_assert(name, path, value, regex=False):
    return f"""
          <JSONPathAssertion guiclass="JSONPathAssertionGui" testclass="JSONPathAssertion" testname="{name}" enabled="true">
            <stringProp name="JSON_PATH">{path}</stringProp>
            <stringProp name="EXPECTED_VALUE">{esc(value)}</stringProp>
            <boolProp name="JSONVALIDATION">true</boolProp>
            <boolProp name="EXPECT_NULL">false</boolProp>
            <boolProp name="INVERT">false</boolProp>
            <boolProp name="ISREGEX">{"true" if regex else "false"}</boolProp>
          </JSONPathAssertion>
          <hashTree/>"""


def duration(ms):
    return f"""
          <DurationAssertion guiclass="DurationAssertionGui" testclass="DurationAssertion" testname="Responde en menos de {ms} ms" enabled="true">
            <stringProp name="DurationAssertion.duration">{ms}</stringProp>
          </DurationAssertion>
          <hashTree/>"""


def extractor(var, path):
    return f"""
          <JSONPostProcessor guiclass="JSONPostProcessorGui" testclass="JSONPostProcessor" testname="Extraer {var}" enabled="true">
            <stringProp name="JSONPostProcessor.referenceNames">{var}</stringProp>
            <stringProp name="JSONPostProcessor.jsonPathExprs">{path}</stringProp>
            <stringProp name="JSONPostProcessor.match_numbers">1</stringProp>
            <stringProp name="JSONPostProcessor.defaultValues">NOT_FOUND</stringProp>
          </JSONPostProcessor>
          <hashTree/>"""


def groovy(kind, name, key, script):
    return f"""
          <{kind} guiclass="TestBeanGUI" testclass="{kind}" testname="{name}" enabled="true">
            <stringProp name="scriptLanguage">groovy</stringProp>
            <stringProp name="parameters"></stringProp>
            <stringProp name="filename"></stringProp>
            <stringProp name="cacheKey">{key}</stringProp>
            <stringProp name="script">{esc(script)}</stringProp>
          </{kind}>
          <hashTree/>"""


def sampler(name, method, path, body=None, children=""):
    raw = ""
    args = '<collectionProp name="Arguments.arguments"/>'
    if body is not None:
        raw = '<boolProp name="HTTPSampler.postBodyRaw">true</boolProp>'
        args = f"""<collectionProp name="Arguments.arguments">
              <elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">{esc(body)}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>"""
    return f"""
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="{name}" enabled="true">
          {raw}
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            {args}
          </elementProp>
          <stringProp name="HTTPSampler.path">{path}</stringProp>
          <stringProp name="HTTPSampler.method">{method}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        <hashTree>{children}
        </hashTree>"""


SETUP_SQL = '{"sql": "SELECT id FROM cuentas WHERE activa = $1 AND moneda = $2 ORDER BY id LIMIT 2", "params": [true, "PYG"]}'

SETUP_GROOVY = """// Datos dinamicos: las cuentas salen de la BD (no se hardcodean ids).
def json = new groovy.json.JsonSlurper().parseText(prev.getResponseDataAsString())
if (json?.data != null && json.data.size() >= 2) {
  props.put('g02.cuentaOrigenId', json.data[0].id.toString())
  props.put('g02.cuentaDestinoId', json.data[1].id.toString())
  log.info('Grupo02 cuentas dinamicas -> origen=' + json.data[0].id + ' destino=' + json.data[1].id)
} else {
  prev.setSuccessful(false)
  prev.setResponseMessage('No hay 2 cuentas activas en PYG para la prueba')
}"""

UNIQUE_GROOVY = """// descripcion unica por muestra: permite rastrear lo creado por esta
// corrida en la BD compartida del curso. Cuentas: las del setUp.
def runId = props.get('runId') ?: System.currentTimeMillis().toString()
vars.put('descripcionUnica', 'G02-PERF-' + runId + '-' + ctx.getThreadNum() + '-' + vars.getIteration() + ' ' + vars.get('descripcion'))
vars.put('cuentaOrigenId', props.get('g02.cuentaOrigenId'))
vars.put('cuentaDestinoId', props.get('g02.cuentaDestinoId'))"""

POST_BODY = """{
  "cuentaOrigenId": ${cuentaOrigenId},
  "cuentaDestinoId": ${cuentaDestinoId},
  "monto": ${monto},
  "descripcion": "${descripcionUnica}"
}"""

setup_sampler = sampler(
    "SQL - Obtener 2 cuentas activas PYG", "POST", "/api/v1/sql/select", SETUP_SQL,
    rc_assert("SQL responde 200", 200)
    + groovy("JSR223PostProcessor", "Guardar cuentas en propiedades", "g02-setup", SETUP_GROOVY),
)
get_cuenta = sampler(
    "GET - Consultar cuenta origen", "GET", "/api/v1/cuentas/${__P(g02.cuentaOrigenId,1)}", None,
    rc_assert("Consulta responde 200", 200)
    + json_assert("La cuenta esta activa", "$.data.activa", "true")
    + duration(2000),
)
post_tr = sampler(
    "POST - Crear transferencia (CSV)", "POST", "/api/v1/transferencias", POST_BODY,
    groovy("JSR223PreProcessor", "Descripcion unica + cuentas dinamicas", "g02-unique", UNIQUE_GROOVY)
    + extractor("transferenciaId", "$.data.id")
    + rc_assert("Creacion responde 201", 201)
    + json_assert("Nace en estado pendiente", "$.data.estado", "pendiente")
    + duration(2000),
)
get_tr = sampler(
    "GET - Consultar transferencia creada (correlacion)", "GET", "/api/v1/transferencias/${transferenciaId}", None,
    rc_assert("Consulta responde 200", 200)
    # La API del curso 1 devuelve los ids como string ("81"): se compara con una
    # regex exacta para no depender del tipo (numero vs texto).
    + json_assert("Es la transferencia creada", "$.data.id", "^${transferenciaId}$", regex=True)
    + duration(2000),
)
del_tr = sampler(
    "DELETE - Anular transferencia (limpieza)", "DELETE", "/api/v1/transferencias/${transferenciaId}", None,
    rc_assert("Anulacion responde 204", 204),
)

JMX = f"""<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="P_GRUPO_02_KALE_TRANSFERENCIAS_CSV - Transferencias entre cuentas" enabled="true">
      <stringProp name="TestPlan.comments">Grupo 02. setUp: cuentas activas dinamicas via SQL. Carga: GET cuenta (consulta) + POST transferencia con datos del CSV (creacion), correlacion del id con GET y limpieza con DELETE. Paceado para el rate limit de 30 req/min del sandbox.</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">true</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="Variables">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="API AIQUAA Sandbox" enabled="true">
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="Variables HTTP">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>
        <stringProp name="HTTPSampler.domain">${{__P(host,aiquaa-sandbox-api.vercel.app)}}</stringProp>
        <stringProp name="HTTPSampler.port">${{__P(port,)}}</stringProp>
        <stringProp name="HTTPSampler.protocol">${{__P(protocol,https)}}</stringProp>
        <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>
        <stringProp name="HTTPSampler.connect_timeout">10000</stringProp>
        <stringProp name="HTTPSampler.response_timeout">15000</stringProp>
      </ConfigTestElement>
      <hashTree/>
      <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Headers API (x-api-key por propiedad)" enabled="true">
        <collectionProp name="HeaderManager.headers">
          <elementProp name="Content-Type" elementType="Header">
            <stringProp name="Header.name">Content-Type</stringProp>
            <stringProp name="Header.value">application/json</stringProp>
          </elementProp>
          <elementProp name="x-api-key" elementType="Header">
            <stringProp name="Header.name">x-api-key</stringProp>
            <stringProp name="Header.value">${{__P(apiKey,)}}</stringProp>
          </elementProp>
        </collectionProp>
      </HeaderManager>
      <hashTree/>
      <SetupThreadGroup guiclass="SetupThreadGroupGui" testclass="SetupThreadGroup" testname="setUp - Cuentas dinamicas desde la BD" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">stoptest</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Una vez">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">1</stringProp>
        <stringProp name="ThreadGroup.ramp_time">1</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
      </SetupThreadGroup>
      <hashTree>{setup_sampler}
      </hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Transferencias - consulta y creacion" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Iteraciones">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">${{__P(loops,3)}}</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">${{__P(threads,2)}}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${{__P(rampUp,4)}}</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="Datos de transferencias (CSV)" enabled="true">
          <stringProp name="filename">${{__P(csvPath,tests/performance/data/D_GRUPO_02_KALE_TRANSFERENCIAS.csv)}}</stringProp>
          <stringProp name="fileEncoding">UTF-8</stringProp>
          <stringProp name="variableNames">monto,descripcion</stringProp>
          <boolProp name="ignoreFirstLine">true</boolProp>
          <stringProp name="delimiter">,</stringProp>
          <boolProp name="quotedData">false</boolProp>
          <boolProp name="recycle">true</boolProp>
          <boolProp name="stopThread">false</boolProp>
          <stringProp name="shareMode">shareMode.all</stringProp>
        </CSVDataSet>
        <hashTree/>
        <ConstantThroughputTimer guiclass="TestBeanGUI" testclass="ConstantThroughputTimer" testname="Paceo - respetar 30 req/min del sandbox" enabled="true">
          <intProp name="calcMode">2</intProp>
          <stringProp name="throughput">${{__P(throughputPerMin,20.0)}}</stringProp>
        </ConstantThroughputTimer>
        <hashTree/>{get_cuenta}{post_tr}
        <IfController guiclass="IfControllerPanel" testclass="IfController" testname="Solo si se obtuvo el id" enabled="true">
          <stringProp name="IfController.condition">${{__groovy(vars.get('transferenciaId') != 'NOT_FOUND')}}</stringProp>
          <boolProp name="IfController.evaluateAll">false</boolProp>
          <boolProp name="IfController.useExpression">true</boolProp>
        </IfController>
        <hashTree>{get_tr}{del_tr}
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
"""

xml.dom.minidom.parseString(JMX)  # valida que sea XML bien formado
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(JMX, encoding="utf-8")
print(f"JMX generado: {OUT.relative_to(ROOT)} ({JMX.count('<HTTPSamplerProxy')} samplers)")
