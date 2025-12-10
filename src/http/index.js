const express = require('express');
const routes = require('./routes');
const log = require('../log');

const app = express();

app.use(express.json());
app.use('/api', routes);
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Refresher API' });
});

app.use((err, req, res, next) => {
  log.error(`Unhandled error: ${err.stack || err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;