const log = require('../log');
const {
  upsertJob,
  getJobByAddress,
  listJobs,
  setJobActiveByAddress,
} = require('../db/jobs');
const {
  createSnapshot,
  getLatestSnapshotForJob,
  listSnapshotsForJob,
} = require('../db/snapshots');
const {
  selectJobOnPage,
  scrapeAllSectionsOnPage,
} = require('../buildertrend');
const { createAuthenticatedPage } = require('../buildertrend/session');


async function scrapeAndSnapshotJobByAddress(address, { active = true } = {}) {
  if (!address || typeof address !== 'string') {
    throw new Error('address is required and must be a non-empty string');
  }

  log.info(`Starting scrape for address "${address}"`);

  const job = await upsertJob({ address, active });
  log.debug(`Upserted job for address "${address}" with id=${job.id}`);

  const { browser, context, page } = await createAuthenticatedPage();
  let metrics;

  try {
    const ok = await selectJobOnPage(page, address);
    if (!ok) {
      throw new Error(`Could not select job for address "${address}"`);
    }

    metrics = await scrapeAllSectionsOnPage(page, address);
  } finally {
    await browser.close();
  }

  log.debug(`Scraped metrics for "${address}": ${JSON.stringify(metrics)}`);

  const snapshot = await createSnapshot({
    jobId: job.id,
    estBc: metrics.est_bc,
    estCp: metrics.est_cp,
    jobCost: metrics.job_cost,
    invT: metrics.inv_t,
    invP: metrics.inv_p,
    coBc: metrics.co_bc,
    coCp: metrics.co_cp,
  });

  log.success(
    `Created snapshot ${snapshot.id} for jobId=${job.id} (address="${address}")`,
  );

  return { job, snapshot, metrics };
}

async function getJobWithLatestSnapshotByAddress(address) {
  const job = await getJobByAddress(address);
  if (!job) return null;

  const snapshot = await getLatestSnapshotForJob(job.id);
  return { job, snapshot };
}

async function scrapeAndSnapshotJobsBatch(addresses, { active = true } = {}) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('addresses must be a non-empty array of strings');
  }

  const results = [];

  const { browser, context, page } = await createAuthenticatedPage();

  try {
    await page.reload({ waitUntil: 'domcontentloaded' });

    for (const address of addresses) {
      if (!address || typeof address !== 'string') {
        results.push({
          address,
          ok: false,
          error: 'address must be a non-empty string',
        });
        continue;
      }

      try {
        log.info(`Starting batch scrape for address "${address}"`);

        const job = await upsertJob({ address, active });
        log.debug(
          `Upserted job for address "${address}" with id=${job.id} (batch)`,
        );

        const ok = await selectJobOnPage(page, address);
        if (!ok) {
          log.warn(
            `Skipping snapshot for "${address}" because job could not be selected`,
          );
          results.push({ address, ok: false, error: 'job not found in Buildertrend' });
          continue;
        }

        const metrics = await scrapeAllSectionsOnPage(page, address);
        log.debug(
          `Scraped metrics for "${address}" (batch): ${JSON.stringify(
            metrics,
          )}`,
        );

        const snapshot = await createSnapshot({
          jobId: job.id,
          estBc: metrics.est_bc,
          estCp: metrics.est_cp,
          jobCost: metrics.job_cost,
          invT: metrics.inv_t,
          invP: metrics.inv_p,
          coBc: metrics.co_bc,
          coCp: metrics.co_cp,
        });

        log.success(
          `Created snapshot ${snapshot.id} for jobId=${job.id} (address="${address}", batch)`,
        );

        results.push({ address, ok: true, result: { job, snapshot, metrics } });
      } catch (err) {
        log.error(
          `Batch scrape failed for "${address}": ${err.stack || err.message}`,
        );
        results.push({
          address,
          ok: false,
          error: err.message,
        });
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

module.exports = {
  scrapeAndSnapshotJobByAddress,
  scrapeAndSnapshotJobsBatch,
  getJobWithLatestSnapshotByAddress,
  listJobs,
  setJobActiveByAddress,
  getLatestSnapshotForJob,
  listSnapshotsForJob,
};
