const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const pkg = require('./package.json');

// Colors
const colors = {
  RESET: "\x1b[0m",
  BRIGHT: "\x1b[1m",
  DIM: "\x1b[2m",
  UNDERSCORE: "\x1b[4m",
  BLINK: "\x1b[5m",
  REVERSE: "\x1b[7m",
  HIDDEN: "\x1b[8m",

  FG_BLACK: "\x1b[30m",
  FG_RED: "\x1b[31m",
  FG_GREEN: "\x1b[32m",
  FG_YELLOW: "\x1b[33m",
  FG_BLUE: "\x1b[34m",
  FG_MAGENTA: "\x1b[35m",
  FG_CYAN: "\x1b[36m",
  FG_WHITE: "\x1b[37m",

  BG_BLACK: "\x1b[40m",
  BG_RED: "\x1b[41m",
  BG_GREEN: "\x1b[42m",
  BG_YELLOW: "\x1b[43m",
  BG_BLUE: "\x1b[44m",
  BG_MAGENTA: "\x1b[45m",
  BG_CYAN: "\x1b[46m",
  BG_WHITE: "\x1b[47m"
};

// Logging utilities
const log = {
    info: (msg) => console.log(`${colors.FG_CYAN}💡 [INFO]${colors.RESET} ${msg}`),
    warn: (msg) => console.log(`${colors.FG_YELLOW}⚡ [WARN]${colors.RESET} ${msg}`),
    error: (msg) => console.log(`${colors.FG_RED}✖ [ERROR]${colors.RESET} ${msg}`),
    success: (msg) => console.log(`${colors.FG_GREEN}✓ [SUCCESS]${colors.RESET} ${msg}`),
    debug: (msg) => {
      if (config.debug.debugStatus) {
        console.log(`${colors.FG_BLUE}🐞 [DEBUG]${colors.RESET} ${msg}`);
      }
    }
}

// Terminal utilities
const termWidth = process.stdout.columns || 105;
const termLine = "–".repeat(termWidth);

function centerTextBlock(block) {
  return block
    .split("\n")
    .map(line => {
      const lineLen = line.replace(/\x1b\[[0-9;]*m/g, "").length;
      if (lineLen >= termWidth) return line;
      const padding = Math.floor((termWidth - lineLen) / 2);
      return " ".repeat(Math.max(0, padding)) + line;
    })
    .join("\n");
}

// Parse currency string to number
function parseCurrency(str) {
  if (typeof str !== 'string') return NaN;
  const cleaned = str.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned);
}

// Basic utilities
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clear(ms = 0) {
  if (ms > 0) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
  console.clear();
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function isNumeric(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

module.exports = {
  colors,
  log,
  termLine,
  termWidth,
  centerTextBlock,
  parseCurrency,
  sleep,
  clear,
  clamp,
  isNumeric
};