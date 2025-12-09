const { chromium } = require('playwright');
const config = require('./config.json');
const db = require('./db.js');
const { parseCurrency, log, sleep, clear } = require('./utility.js');
const { updateProject } = db;

const selectors = {
  searchInput: 'input#JobSearch',
  clearSearch: 'button[data-testid="clear-search"]',
  jobItem: 'li.JobListItem div.ItemRowJobName',
  estimate: {
    bc: 'div[data-testid="expression-total"] span.ant-statistic-content-value span',
    cp: 'div[data-testid="expression-balance"] span.ant-statistic-content-value span'
  },
  jobCost: { },
  invoices: {
    total: 'td[data-testid="invoiceAmount--footer"] span',
    paid: 'td[data-testid="amountPaid--footer"] span'
  },
  changeOrders: {
    bc: 'td[data-testid="builderCost--footer"] span',
    cp: 'td[data-testid="ownerPrice--footer"] span'
  }
};

let storedCookies = null;
let storedState = null;

let scrapeBrowser = null;
let scrapeContext = null;
let scrapePage = null;

// Login
async function login() {
  const loginBrowser = await chromium.launch({ headless: false });
  const loginContext = await loginBrowser.newContext();
  const loginPage = await loginContext.newPage();

  await loginPage.goto(config.buildertrend.urls.landing);

  if (await loginPage.isVisible('#userName')) {
    await loginPage.fill('#userName', config.buildertrend.username);
    await loginPage.click('#usernameSubmit');

    const captchaFrame = await loginPage.$('iframe[title="reCAPTCHA"]');
    if (captchaFrame && await captchaFrame.isVisible()) {
      await loginPage.waitForFunction(() => !document.querySelector('iframe[title="reCAPTCHA"]'), { timeout: 0 });
    }

    await loginPage.waitForSelector('input[type="password"]', { timeout: 10000 });
    await loginPage.fill('input[type="password"]', config.buildertrend.password);
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  await loginPage.goto(config.buildertrend.urls.landing, { waitUntil: 'networkidle' });

  storedCookies = await loginContext.cookies();
  storedState = await loginContext.storageState();

  log.success("Login completed, session stored.");

  await loginBrowser.close();
}

async function scraperInit() {
  scrapeBrowser = await chromium.launch({ headless: config.debug.headless });
  scrapeContext = await scrapeBrowser.newContext({ storageState: storedState });
  scrapePage = await scrapeContext.newPage();
  await scrapePage.goto(config.buildertrend.urls.landing, { waitUntil: 'networkidle' });
  log.debug("Scrape page initialized.");

  log.debug("Scrape browser initialized after login.");
}

async function scrapeField(page, selector, address, dbKey, fieldName) {
  const el = await page.$(selector);
  if (!el) {
    log.warn(`${fieldName} skipped (element not found).`);
    return null;
  }
  const text = (await el.textContent()).trim();
  if (!text || text === '--' || text.toLowerCase() === 'n/a') {
    log.warn(`${fieldName} skipped (placeholder value: "${text}")`);
    return null;
  }
  const value = parseCurrency(text);
  if (value !== null) await updateProject(address, { [dbKey]: value });
  log.debug(`Updated DB (${fieldName}): ${value}`);
  return value;
}

async function scraperQuit() {
  await scrapeBrowser.close();
  log.debug("Scrape browser closed.");
}

async function selectJob(jobName) {
  try {
    const clearButton = await scrapePage.$(selectors.clearSearch);
    if (clearButton) await clearButton.click();

    const searchInput = await scrapePage.$(selectors.searchInput);
    if (!searchInput) throw new Error("Search input not found");
    await searchInput.fill(jobName);

    const jobItem = await scrapePage.locator(selectors.jobItem).getByText(jobName);
    await jobItem.click();
    await scrapePage.waitForTimeout(2000);

    log.debug(`Selected job: ${jobName}`);
    return true;
  } catch (err) {
    log.error(`Failed to select job "${jobName}": ${err.message}`);
    return false;
  }
}

async function estimate(address) {
  try {
    log.debug("Scraping Estimate page...");
    await scrapePage.goto(config.buildertrend.urls.estimate, { waitUntil: 'networkidle' });
    await scrapeField(scrapePage, selectors.estimate.bc, address, "est_bc", "Estimate BC");
    await scrapeField(scrapePage, selectors.estimate.cp, address, "est_cp", "Estimate CP");
  } catch (err) {
    log.error(`Estimate scrape failed: ${err.message}`);
  }
}

async function jobCost(address) {
  try {
    log.debug("Scraping Job Cost page...");
    await scrapePage.goto(config.buildertrend.urls.job_cost, { waitUntil: 'networkidle' });

    // Header Scan
    const headerThs = await scrapePage.$$('tr.BudgetRowHeader th');
    if (!headerThs || headerThs.length === 0) {
      log.warn("Job Cost skipped: header not found.");
      return;
    }

    // Pending Exist
    let hasPending = false;
    for (let i = 0; i < headerThs.length; i++) {
      const txt = (await headerThs[i].innerText() || '').trim().toLowerCase();
      if (txt.includes("pending cost")) {
        hasPending = true;
        break;
      }
    }

    // If Pending 6 Else 5
    const nth = hasPending ? 6 : 5;
    const selector = `tr.FooterRow td.ant-table-cell:nth-of-type(${nth}) span`;
    const value = await scrapeField(scrapePage, selector, address, "job_cost", "Job Cost");
    if (value === null) {
      log.warn("Job Cost skipped: extracted footer value null.");
      return;
    }
    log.debug(`Job Cost scraped successfully (nth=${nth})`);
  } catch (err) {
    log.error(`JobCost scrape failed: ${err.message}`);
  }
}

async function invoices(address) {
  try {
    log.debug("Scraping Invoices page...");
    await scrapePage.goto(config.buildertrend.urls.invoices, { waitUntil: 'networkidle' });
    const total = await scrapeField(scrapePage, selectors.invoices.total, address, "inv_t", "Invoice Total");
    const paid = await scrapeField(scrapePage, selectors.invoices.paid, address, "inv_p", "Invoice Paid");
    if (total !== null && paid !== null) {
      const inv_d = Math.round((total - paid) * 100) / 100;
      await updateProject(address, { inv_d });
      log.debug(`Updated DB (Invoice Due): ${inv_d}`);
    }
  } catch (err) {
    log.error(`Invoices scrape failed: ${err.message}`);
  }
}

async function changeOrders(address) {
  try {
    log.debug("Scraping Change Orders page...");
    await scrapePage.goto(config.buildertrend.urls.change_orders, { waitUntil: 'networkidle' });
    await scrapeField(scrapePage, selectors.changeOrders.bc, address, "co_bc", "Change Order BC");
    await scrapeField(scrapePage, selectors.changeOrders.cp, address, "co_cp", "Change Order CP");
  } catch (err) {
    log.error(`ChangeOrders scrape failed: ${err.message}`);
  }
}

function getCookies() {
    return storedCookies;
}

function getStorageState() {
    return storedState;
}

module.exports = {
  login,
  getCookies,
  getStorageState,
  scraperInit,
  scraperQuit,
  selectJob,
  estimate,
  jobCost,
  invoices,
  changeOrders
};