const fs = require('node:fs');
fs.mkdirSync('results', { recursive: true });
module.exports = {
  default: {
    paths: ['features/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['support/**/*.ts', 'steps/**/*.ts'],
    format: ['progress', 'json:results/cucumber-report.json', 'html:results/cucumber-report.html'],
    parallel: 0,
    retry: 0
  }
};
