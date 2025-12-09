const utility = require('./utility.js');
const db = require('./db.js');
const config = require('./config.json');
const pkg = require('./package.json');
const { colors, log, centerTextBlock, termLine, clear } = utility;

const fs = require('fs');
const path = require('path');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rawTitle = `
░█████████                 ░████                                ░██                            
░██     ░██               ░██                                   ░██                            
░██     ░██  ░███████  ░████████ ░██░████  ░███████   ░███████  ░████████   ░███████  ░██░████ 
░█████████  ░██    ░██    ░██    ░███     ░██    ░██ ░██        ░██    ░██ ░██    ░██ ░███     
░██   ░██   ░█████████    ░██    ░██      ░█████████  ░███████  ░██    ░██ ░█████████ ░██      
░██    ░██  ░██           ░██    ░██      ░██               ░██ ░██    ░██ ░██        ░██      
░██     ░██  ░███████     ░██    ░██       ░███████   ░███████  ░██    ░██  ░███████  ░██      

${colors.RESET}Refresher ${colors.FG_BLUE}v${pkg.version}${colors.RESET}
`;

const title = centerTextBlock(rawTitle);

function printTitle(status = {}) {
  const pkgIcon = status.pkgLoaded
    ? `${colors.FG_GREEN}✔${colors.RESET}`
    : `${colors.FG_RED}✖${colors.RESET}`;
    
  const configIcon = status.configLoaded
    ? `${colors.FG_GREEN}✔${colors.RESET}`
    : `${colors.FG_RED}✖${colors.RESET}`;

  const dbIcon = status.dbConnected
    ? `${colors.FG_GREEN}✔${colors.RESET}`
    : `${colors.FG_RED}✖${colors.RESET}`;

  const statusLine = `${pkgIcon} Package  –  ${configIcon} Config  –  ${dbIcon} Database`;

  console.log(termLine);
  console.log(title);
  console.log(termLine);
  console.log(centerTextBlock(statusLine));
  console.log(termLine);
  console.log();
}


async function printMenu(status = {}) {
  const configPath = path.join(__dirname, 'config.json');
  while (true) {
    clear();
    printTitle(status);
    console.log("Select mode:");
    console.log(" 1. Scrape & Push to Monday");
    console.log(" 2. Scrape Only");
    console.log(" 3. Push Only");
    console.log(" s. Settings");
    console.log(" q. Quit");

    const choice = await new Promise(resolve => {
      rl.question("\nEnter choice: ", answer => {
        const val = answer.trim();
        console.log();
        resolve(val);
      });
    });
    if (['1', '2', '3'].includes(choice)) {
      clear();
      printTitle(status);
      return choice;
    } else if (choice === 's') {

      // Settings submenu
      while (true) {
        clear();
        printTitle(status);
        console.log(termLine);
        console.log(centerTextBlock('Settings'));
        console.log(termLine);
        console.log(`1. Toggle Debug Mode (current: ${config.debug.debugStatus})`);
        console.log(`2. Toggle Headless Mode (current: ${config.debug.headless})`);
        console.log("b. Back");
        console.log("q. Quit");
        const sChoice = await new Promise(resolve => {
          rl.question("\nEnter choice: ", answer => {
            const sel = answer.trim();
            resolve(sel);
          });
        });
        if (sChoice === '1') {
          config.debug.debugStatus = !config.debug.debugStatus;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } else if (sChoice === '2') {
          config.debug.headless = !config.debug.headless;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } else if (sChoice === 'b') {
          clear();
          break;
        } else if (choice === 'q') {
          log.info("Exiting...");
          await clear(1250)
          process.exit(0);
        } else {
          console.log("Invalid choice.\n");
        }
      }
    } else if (choice === 'q') {
      return 'q';
    } else if (choice === '`') {
      return '`';
    } else {
      console.log("Invalid choice. Please enter 1, 2, 3, s, or q.\n");
    }
  }
}

module.exports = {
  title,
  printTitle,
  printMenu
};