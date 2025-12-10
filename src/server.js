const log = require('./log');
const { verifyLogin } = require('./buildertrend');

async function main() {
  log.info('Starting Buildertrend login verification...');

  const url = await verifyLogin();
  log.success(`Verified Buildertrend login, landed on: ${url}`);
}

main().catch((err) => {
  log.error(`Error in Buildertrend login test: ${err.stack || err.message}`);
  process.exitCode = 1;
});
