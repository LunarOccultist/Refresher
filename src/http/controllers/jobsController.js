const jobService = require('../../services/jobService');
const log = require('../../log');

async function scrapeAndSnapshotJob(req, res) {
  const { address, active } = req.body || {};

  if (!address || typeof address !== 'string') {
    return res
      .status(400)
      .json({ error: 'address is required and must be a non-empty string' });
  }

  try {
    const result = await jobService.scrapeAndSnapshotJobByAddress(address, {
      active,
    });
    return res.status(200).json(result);
  } catch (err) {
    log.error(
      `scrapeAndSnapshotJob failed for "${address}": ${
        err.stack || err.message
      }`,
    );
    return res
      .status(500)
      .json({ error: 'Failed to scrape and snapshot job' });
  }
}

async function scrapeAndSnapshotJobsBatch(req, res) {
  const { addresses, active } = req.body || {};

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return res
      .status(400)
      .json({ error: 'addresses must be a non-empty array of strings' });
  }

  try {
    const results = await jobService.scrapeAndSnapshotJobsBatch(addresses, {
      active,
    });
    return res.status(200).json({ results });
  } catch (err) {
    log.error(
      `scrapeAndSnapshotJobsBatch failed: ${err.stack || err.message}`,
    );
    return res
      .status(500)
      .json({ error: 'Failed to scrape and snapshot jobs batch' });
  }
}

async function listJobs(req, res) {
  const { activeOnly } = req.query;

  try {
    const jobs = await jobService.listJobs({ activeOnly: activeOnly === 'true' });
    return res.json(jobs);
  } catch (err) {
    log.error(`listJobs failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to list jobs' });
  }
}

async function getJobWithLatestSnapshot(req, res) {
  const { address } = req.params;

  try {
    const result = await jobService.getJobWithLatestSnapshotByAddress(address);
    if (!result) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(result);
  } catch (err) {
    log.error(`getJobWithLatestSnapshot failed for "${address}": ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to fetch job with latest snapshot' });
  }
}

async function setJobActiveFlag(req, res) {
  const { address } = req.params;
  const { active } = req.body || {};

  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be a boolean' });
  }

  try {
    const changes = await jobService.setJobActiveByAddress(address, active);
    return res.json({ address, active, changes });
  } catch (err) {
    log.error(`setJobActiveFlag failed for "${address}": ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to update job active flag' });
  }
}

async function listJobsOverview(req, res) {
  const { activeOnly } = req.query;

  try {
    const rows = await jobService.listJobsWithLatestSnapshot({ activeOnly: activeOnly === 'true' });
    const result = rows.map(({ job, snapshot }) => ({
      id: job.id,
      address: job.address,
      active: !!job.active,
      mondayId: job.monday_id || null,
      latestCapturedAt: snapshot ? snapshot.captured_at : null,
      latestMetrics: snapshot
        ? {
            est_bc: snapshot.est_bc,
            est_cp: snapshot.est_cp,
            job_cost: snapshot.job_cost,
            inv_t: snapshot.inv_t,
            inv_p: snapshot.inv_p,
          }
        : null,
    }));
    return res.json(result);
  } catch (err) {
    log.error(`listJobsOverview failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to load jobs overview' });
  }
}

async function getJobSnapshots(req, res) {
  const { address } = req.params;

  try {
    const data = await jobService.getJobSnapshotsByAddress(address);
    if (!data) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(data);
  } catch (err) {
    log.error(`getJobSnapshots failed for \"${address}\": ${err.stack || err.message}`);
    return res.status(500).json({ error: 'Failed to load job snapshots' });
  }
}

async function createJob(req, res) {
  const { address, mondayId, monday_id } = req.body || {};
  const rawAddress = typeof address === 'string' ? address.trim() : '';

  if (!rawAddress) {
    return res
      .status(400)
      .json({ error: 'address is required and must be a non-empty string' });
  }

  const effectiveMondayId = mondayId ?? monday_id ?? null;

  try {
    const job = await jobService.createJob({
      address: rawAddress,
      mondayId: effectiveMondayId,
      active: true,
    });

    return res.status(201).json({
      id: job.id,
      address: job.address,
      active: !!job.active,
      mondayId: job.monday_id || null,
    });
  } catch (err) {
    log.error(
      `createJob failed for \"${rawAddress}\": ${err.stack || err.message}`,
    );
    return res.status(500).json({ error: 'Failed to create job' });
  }
}

module.exports = {
  scrapeAndSnapshotJob,
  scrapeAndSnapshotJobsBatch,
  listJobs,
  getJobWithLatestSnapshot,
  setJobActiveFlag,
  listJobsOverview,
  getJobSnapshots,
  createJob,
};
