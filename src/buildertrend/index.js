const { createAuthenticatedPage } = require('./session');
const log = require('../log');
const config = require('../config.json');

const selectors = {
  searchInput: 'input[data-testid="JobSearch"]',
  clearSearch: 'button[data-testid="clear-search"]',
  jobItem: 'li.JobListItem div.ItemRowJobName',
  estimate: {
    bc: 'div[data-testid="expression-total"] span.ant-statistic-content-value span',
    cp: 'div[data-testid="expression-balance"] span.ant-statistic-content-value span',
  },
  invoices: {
    total: 'td[data-testid="invoiceAmount--footer"] span',
    paid: 'td[data-testid="amountPaid--footer"] span',
  },
  changeOrders: {
    bc: 'td[data-testid="builderCost--footer"] span',
    cp: 'td[data-testid="ownerPrice--footer"] span',
  },
};

function parseCurrency(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') {
    return null;
  }

  const negative = trimmed.startsWith('(') ? true : false;
  const normalized = trimmed.replace(/[^0-9.,-]/g, '').replace(/,/g, '');

  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return null;
  return negative ? value * -1 : value;
}

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
  verifyLogin
};
