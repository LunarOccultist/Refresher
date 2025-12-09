const utility = require('./utility.js');
const db = require('./db.js');
const menu = require('./menu.js');
const scraper = require('./scraper.js');
const config = require('./config.json');
const pkg = require('./package.json');
const { chromium } = require('playwright');
const { log, sleep, clear } = require('./utility.js');

(async () => {
  try {
    await db.connect();
    while (true) {
      const mode = await menu.printMenu({ 
        dbConnected: db.status.connected,
        configLoaded: !!config,
        pkgLoaded: !!pkg
      });

      // Handle selection
      if (mode === '1' || mode === '2') {
        await scraper.login();
        await scraper.scraperInit();
        const projects = await db.getProjects();
        const page = scraper.scrapePage;

        for (const project of projects) {
          const address = project.address;
          log.info(`Processing project at address: ${address}`);

          await scraper.selectJob(address);
          await scraper.estimate(address);
          await scraper.jobCost(address);
          await scraper.invoices(address);
          await scraper.changeOrders(address);

          log.success(`Finished processing project at address: ${address}`);
        }
        console.log(`\n\n\n`)
        log.success(`Finished processing projects...`);
        await scraper.scraperQuit();
        sleep(1250);
      }

      if (mode === '1' || mode === '3') {
        const projects = await db.getAllProjects();

        for (const project of projects) {
          const address = project.address;
          log.debug(`${address} bug :3`);
        }
        console.log(`\n\n\n`)
        log.warn("Push not yet implemented.");
        sleep(1250);
      }

      if (mode === 'q') {
        log.info("Exiting...");
        await clear(1250)
        process.exit(0);
      }
      console.log("\nReturning to menu...\n");

      if (mode === '`') {
        log.info("Test");
        log.success("Test");
        log.warn("Test");
        log.error("Test");
        log.debug("Test");
        await clear(5000);
      }
    }

  } catch (err) {
    log.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
})();