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

module.exports = {
  scrapeAndSnapshotJob,
  scrapeAndSnapshotJobsBatch,
  listJobs,
  getJobWithLatestSnapshot,
  setJobActiveFlag,
};
