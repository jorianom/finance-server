// Entry point: Load env, build app, start server

import { env } from './infrastructure/config/env.js';
import { buildApp } from './app.js';

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
