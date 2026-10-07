// Perfil de Cucumber del Grupo 10: solo carga su feature, los pasos genéricos
// del proyecto base, el soporte (World/hooks) y sus propios pasos.
module.exports = {
  default: {
    paths: ['grupos/grupo-10-roles-permisos/features/F_GRUPO_10_ROLES_PERMISOS.feature'],
    require: [
      'tests/bdd/steps/web.steps.ts',
      'tests/bdd/support/**/*.ts',
      'grupos/grupo-10-roles-permisos/tests/bdd/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress',
      'json:results/grupo10/cucumber-report.json',
      'html:results/grupo10/cucumber-report.html',
    ],
    formatOptions: { snippetInterface: 'async-await' },
  },
};