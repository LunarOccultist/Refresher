const { createAuthenticatedPage } = require('./session');
const log = require('../log');

/**
 * Example helper that simply verifies we can open an authenticated
 * Buildertrend landing page. This is a building block for real
 * scraping flows (estimate, job cost, invoices, change orders).
 */
async function verifyLogin() {
  const { browser, context, page } = await createAuthenticatedPage();

  try {
    log.info('Verifying Buildertrend authenticated session on landing page');
    const url = page.url();
    log.debug(`Current Buildertrend URL: ${url}`);
    return url;
  } finally {
    await browser.close();
  }
}

module.exports = {
  verifyLogin,
};