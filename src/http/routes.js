const express = require('express');
const jobsController = require('./controllers/jobsController');
const statusController = require('./controllers/statusController');

const router = express.Router();

// Health / status
router.get('/status', statusController.getStatus);

// Job-related endpoints
router.get('/jobs', jobsController.listJobs);
router.get('/jobs/:address/latest', jobsController.getJobWithLatestSnapshot);
router.post('/jobs/:address/active', jobsController.setJobActiveFlag);
router.post('/jobs/scrape', jobsController.scrapeAndSnapshotJob);
router.post('/jobs/scrape-batch', jobsController.scrapeAndSnapshotJobsBatch);

module.exports = router;