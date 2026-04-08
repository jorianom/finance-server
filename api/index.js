// Vercel serverless handler — wraps the compiled Fastify app
// El build (npm run build) compila TypeScript a dist/ antes de que Vercel despliegue esto.

let app;

async function getApp() {
  if (!app) {
    const { buildApp } = require('../dist/app.js');
    app = buildApp();
    await app.ready();
  }
  return app;
}

module.exports = async (req, res) => {
  const fastify = await getApp();
  fastify.server.emit('request', req, res);
};
