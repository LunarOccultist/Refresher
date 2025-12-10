const { chromium } = require('playwright');
const config = require('../config.json');
const log = require('../log');

let storedStorageState = null;

function getHeadlessFlag() {
  if (config && config.debug && typeof config.debug.headless === 'boolean') {
    return config.debug.headless;
  }
  return true;
}

async function performLogin(page) {
  const landingUrl = config.buildertrend.urls.landing;
  const username = config.buildertrend.username;
  const password = config.buildertrend.password;

  if (!landingUrl || !username || !password) {
    throw new Error('Buildertrend credentials or URL missing from config.json');
  }

  log.info('Navigating to Buildertrend landing page for login');
  await page.goto(landingUrl, { waitUntil: 'domcontentloaded' });

  // In a fresh context we expect to see the username field at some point.
  // Wait indefinitely so the user can click through any intermediate screens
  // (e.g., "session expired" notices) until the login form appears.
  log.debug('Waiting for Buildertrend username field (#userName) to appear...');
  const usernameField = await page.waitForSelector('#userName', { timeout: 0 });

  await usernameField.fill(username);
  await page.click('#usernameSubmit');

  try {
    const captchaFrame = await page.$('iframe[title="reCAPTCHA"]');
    if (captchaFrame) {
      log.info('reCAPTCHA frame detected; waiting for it to be resolved manually');
      await page.waitForFunction(
        () => !document.querySelector('iframe[title="reCAPTCHA"]'),
        null,
        { timeout: 0 }
      );
    }
  } catch (err) {
    log.warn(`Error while waiting for reCAPTCHA to clear: ${err.message}`);
  }

  log.debug('Filling Buildertrend password and submitting login form');
  await page.waitForSelector('input[type="password"]', { timeout: 30000 });
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle' });
  log.success('Buildertrend login completed');
}

/**
 * Perform an interactive login flow and cache the resulting storage state.
 * Returns the storageState object that can be reused for future contexts.
 */
async function loginAndCacheSession() {
  // Always show the login browser so a user can handle captchas or failures.
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await performLogin(page);

    storedStorageState = await context.storageState();
    log.success('Buildertrend session storage state cached in memory');
    return storedStorageState;
  } finally {
    await browser.close();
  }
}

/**
 * Ensure we have a cached storage state; perform login if we do not.
 */
async function ensureSession() {
  if (storedStorageState) return storedStorageState;
  return loginAndCacheSession();
}

/**
 * Create a new browser/context/page using the cached storage state.
 * Caller is responsible for closing browser when finished.
 */
async function createAuthenticatedPage() {
  await ensureSession();

  const browser = await chromium.launch({ headless: getHeadlessFlag() });
  const context = await browser.newContext({ storageState: storedStorageState });
  const page = await context.newPage();

  await page.goto(config.buildertrend.urls.landing, { waitUntil: 'networkidle' });
  log.debug('Authenticated Buildertrend page created');

  return { browser, context, page };
}

function getStoredStorageState() {
  return storedStorageState;
}

module.exports = {
  ensureSession,
  loginAndCacheSession,
  createAuthenticatedPage,
  getStoredStorageState,
};