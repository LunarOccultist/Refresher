const app = require('./http');
const log = require('./log');
const { verifyLogin } = require('./buildertrend');
const { getDb } = require('./db');

// Ensure SQLite database exists and schema is initialized on startup
getDb();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  log.success(`Refresher API server listening on port ${PORT}`);

  (async () => {
    try {
      log.info('Warming up Buildertrend session via verifyLogin()...');
      const url = await verifyLogin();
      log.success(`Buildertrend session ready; landed on: ${url}`);
    } catch (err) {
      log.error(
        `Background verifyLogin failed (server will still accept requests): ${
          err.stack || err.message
        }`,
      );
    }
  })();
});

function shutdown(code = 0) {
  log.info('Shutting down server...');
  server.close(() => {
    log.success('Server closed. Exiting process.');
    process.exit(code);
  });
}

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('unhandledRejection', (err) => {
  log.error(`Unhandled promise rejection: ${err.stack || err}`);
  shutdown(1);
});

process.on('uncaughtException', (err) => {
  log.error(`Uncaught exception: ${err.stack || err}`);
  shutdown(1);
});
