// config.ts — configuración de la corrida, solo por variables de entorno (prefijo G3_).
// Nada de credenciales en el código: la API key demo es la pública del sandbox de clase.

const env = (nombre: string, porDefecto = ''): string => {
  const v = process.env[nombre];
  return v === undefined || v.trim() === '' ? porDefecto : v.trim();
};

const sinBarraFinal = (u: string) => u.replace(/\/+$/, '');

export const config = {
  /** API del sandbox (misma variable que usan Newman y JMeter en CI). */
  apiUrl: sinBarraFinal(env('G3_API_URL', 'https://aiquaa-sandbox-api.vercel.app')),
  /** Web que muestra el listado de facturas. */
  webUrl: sinBarraFinal(env('G3_WEB_URL', 'https://aiquaa-sandbox-web.vercel.app')),
  apiKey: env('G3_API_KEY', 'sbx_demo_f581ca21e68a347288c94d71'),
  apiKeyInvalida: env('G3_API_KEY_INVALIDA', 'sbx_invalida_grupo03'),
  /** Login de la web: email y número de curso (curso-option-<n>). Obligatorios para @web. */
  webEmail: env('G3_WEB_EMAIL'),
  webCurso: env('G3_WEB_CURSO'),
  /** Peticiones por minuto que se permite la corrida (la API key es compartida entre grupos). */
  rpm: Math.max(1, Number(env('G3_RPM', '20')) || 20),
  /** Reintentos ante 429 por petición (respetando Retry-After, tope esperaMax429). */
  reintentos429: Number(env('G3_REINTENTOS_429', '3')) || 3,
  esperaMax429Seg: Number(env('G3_ESPERA_MAX_429', '60')) || 60,
  /** Titular fijo de las facturas de prueba; vacío = usuario activo con menos pendientes. */
  titularFijo: env('G3_TITULAR'),
  /** Ids que no existen en el sandbox (mismos que la colección Postman Final). */
  facturaInexistente: 999999999,
  usuarioInexistente: 999999999,
  usuarioSinFacturas: 999999999,
  /** Navegador visible: G3_HEADED=1. */
  headed: env('G3_HEADED') === '1' || env('G3_HEADED').toLowerCase() === 'true',
  /** Carpeta de resultados (la fija cucumber.js dentro de test-results/, ignorado por git). */
  results: env('G3_RESULTS', 'test-results/grupo-03-bdd'),
};

/** Datos de login de la web; falla con un mensaje claro si faltan. */
export function credencialesWeb(): { email: string; curso: string } {
  const faltan = [
    !config.webEmail && 'G3_WEB_EMAIL',
    !config.webCurso && 'G3_WEB_CURSO',
  ].filter(Boolean);
  if (faltan.length) {
    throw new Error(
      `Faltan ${faltan.join(' y ')} para iniciar sesión en la web. ` +
        'En CI son los secrets GRUPO03_WEB_EMAIL y GRUPO03_WEB_CURSO; en la PC los define GRUPO_03_bdd.bat.',
    );
  }
  return { email: config.webEmail, curso: config.webCurso };
}
