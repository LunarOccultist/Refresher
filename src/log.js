const config = require('./config.json');

const COLORS = {
  RESET: '\u001b[0m',
  FG_CYAN: '\u001b[36m',
  FG_YELLOW: '\u001b[33m',
  FG_RED: '\u001b[31m',
  FG_GREEN: '\u001b[32m',
  FG_BLUE: '\u001b[34m',
};

function info(msg) {
  console.log(`${COLORS.FG_CYAN}💡 [INFO]${COLORS.RESET} ${msg}`);
}

function warn(msg) {
  console.log(`${COLORS.FG_YELLOW}⚡ [WARN]${COLORS.RESET} ${msg}`);
}

function error(msg) {
  console.log(`${COLORS.FG_RED}✖ [ERROR]${COLORS.RESET} ${msg}`);
}

function success(msg) {
  console.log(`${COLORS.FG_GREEN}✓ [SUCCESS]${COLORS.RESET} ${msg}`);
}

function debug(msg) {
  if (config.debug && config.debug.debugStatus) {
    console.log(`${COLORS.FG_BLUE}🐞 [DEBUG]${COLORS.RESET} ${msg}`);
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  success,
};
