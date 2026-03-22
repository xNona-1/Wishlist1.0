require('dotenv').config();
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const nodemailer = require('nodemailer');

const ERROR_LOG_FILE = path.join(__dirname, "error.log");
const DEBUG_LOG_FILE = path.join(__dirname, "debug.log");
const MAX_LOG_SIZE = 5 * 1024 * 1024;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendPriceAlert(item, oldPrice, newPrice) {
  try {
    const korting = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `Prijsdaling: ${item.title} nu €${newPrice}!`,
      html: `
        <h2>🎉 Prijsdaling gedetecteerd!</h2>
        <p><strong>${item.title}</strong> is in prijs gedaald.</p>
        <p>Oude prijs: <s>€${oldPrice}</s></p>
        <p>Nieuwe prijs: <strong style="color: green;">€${newPrice}</strong></p>
        <p>Korting: <strong>${korting}%</strong></p>
        ${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" width="200" />` : ''}
        <p><a href="${item.url}" style="background-color: #35524A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Bekijk product</a></p>
      `,
    });
    debugLog('SUCCESS', 'Email', `Prijsdaling e-mail verstuurd voor ${item.title}`);
  } catch (error) {
    debugLog('ERROR', 'Email', `Fout bij versturen e-mail: ${error.message}`);
    logError('sendPriceAlert', error, { itemTitle: item.title });
  }
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

function getTimestamp() {
  const now = new Date();
  return now.toLocaleString('nl-NL', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function debugLog(level, context, message, data = null) {
  const timestamp = getTimestamp();
  const levelColors = {
    INFO: colors.cyan,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
    DEBUG: colors.magenta
  };
  
  const color = levelColors[level] || colors.white;
  const consoleMsg = `${colors.dim}[${timestamp}]${colors.reset} ${color}${level.padEnd(7)}${colors.reset} ${colors.bright}${context}${colors.reset}: ${message}`;
  
  console.log(consoleMsg);
  if (data) {
    console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  }
  
  const logLine = `[${timestamp}] ${level.padEnd(7)} ${context}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
  try {
    fs.appendFileSync(DEBUG_LOG_FILE, logLine);
  } catch (err) {
    console.error("Fout bij schrijven naar debug log:", err);
  }
}

function logError(context, error, additionalInfo = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...additionalInfo
  };
  
  const logLine = `[${timestamp}] ${context}: ${error.message}\n${JSON.stringify(logEntry, null, 2)}\n\n`;
  
  try {
    if (fs.existsSync(ERROR_LOG_FILE)) {
      const stats = fs.statSync(ERROR_LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const oldLog = path.join(__dirname, `error.log.${Date.now()}.old`);
        fs.renameSync(ERROR_LOG_FILE, oldLog);
      }
    }
    fs.appendFileSync(ERROR_LOG_FILE, logLine);
    console.error(logLine);
  } catch (logErr) {
    console.error("Fout bij schrijven naar error log:", logErr);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "../src/data/wishlist.json");

function loadWishlist() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveWishlist(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

// Herbruikbare scrape functie voor prijscheck
async function scrapePrice(url) {
  let browser;
  try {
    debugLog('DEBUG', 'scrapePrice', `Starten prijscheck voor: ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable' 
        || '/usr/bin/chromium-browser' 
        || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    debugLog('DEBUG', 'scrapePrice', 'Browser gelanceerd, pagina laden...');
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const result = await page.evaluate(() => {
      const priceSelectors = [
        '[class*="price"]',
        '[class*="Price"]',
        '[data-price]',
        '[itemprop="price"]',
        '.sales-price',
        '.product-price',
      ];
      let price = null;
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.getAttribute("content") || el.innerText;
          const match = text?.match(/(\d+)[,.](\d{2})/);
          if (match) {
            price = parseFloat(`${match[1]}.${match[2]}`);
            break;
          }
        }
      }
      return { price };
    });

    debugLog('SUCCESS', 'scrapePrice', `Prijs gevonden: €${result.price || 'geen'}`);
    return result;
  } catch (err) {
    debugLog('ERROR', 'scrapePrice', `Fout bij scrapen: ${err.message}`);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  debugLog('INFO', 'API /scrape', `Nieuwe scrape request ontvangen voor: ${url}`);

  if (!url) {
    debugLog('WARNING', 'API /scrape', 'Geen URL opgegeven');
    return res.status(400).json({ error: "URL is verplicht" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable' 
        || '/usr/bin/chromium-browser' 
        || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const result = await page.evaluate(() => {
      // Titel
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
      const title = ogTitle || document.title || null;

      // Afbeelding
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
      const image = ogImage || null;

      // Prijs — probeer meerdere bekende selectors
      const priceSelectors = [
        '[class*="price"]',
        '[class*="Price"]',
        '[data-price]',
        '[itemprop="price"]',
        '.sales-price',
        '.product-price',
      ];

      let price = null;
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.getAttribute("content") || el.innerText;
          const match = text?.match(/(\d+)[,.](\d{2})/);
          if (match) {
            price = parseFloat(`${match[1]}.${match[2]}`);
            break;
          }
        }
      }

      return { title, image, price };
    });

    debugLog('SUCCESS', 'API /scrape', 'Product data succesvol gescrapet', { title: result.title, price: result.price });
    res.json(result);
  } catch (err) {
    debugLog('ERROR', 'API /scrape', `Scrapen mislukt: ${err.message}`);
    logError("Scrape endpoint", err, { url });
    res.status(500).json({ error: "Scrapen mislukt", detail: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Wishlist endpoints
app.post("/wishlist", (req, res) => {
  const items = req.body;
  debugLog('INFO', 'API /wishlist', `Wishlist opslaan: ${items.length} items`);
  saveWishlist(items);
  debugLog('SUCCESS', 'API /wishlist', 'Wishlist succesvol opgeslagen');
  res.json({ success: true });
});

app.get("/wishlist", (req, res) => {
  const items = loadWishlist();
  debugLog('INFO', 'API /wishlist', `Wishlist ophalen: ${items.length} items`);
  res.json(items);
});

// Test email endpoint
app.get('/test-email', async (req, res) => {
  try {
    debugLog('INFO', 'API /test-email', 'Test e-mail verzenden...');
    await sendPriceAlert(
      {
        title: 'Test Product',
        url: 'https://www.bol.com',
        thumbnailUrl: null,
      },
      350,
      299
    );
    debugLog('SUCCESS', 'API /test-email', 'Test e-mail succesvol verstuurd');
    res.json({ success: true, message: 'Test e-mail verstuurd!' });
  } catch (err) {
    debugLog('ERROR', 'API /test-email', `Fout bij versturen test e-mail: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error log endpoint
app.get("/error-log", (req, res) => {
  try {
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return res.json({ logs: [], message: "Geen errors gelogd" });
    }
    const logContent = fs.readFileSync(ERROR_LOG_FILE, "utf-8");
    const lines = parseInt(req.query.lines) || 100;
    const logLines = logContent.split("\n\n").filter(l => l.trim()).slice(-lines);
    res.json({ logs: logLines, count: logLines.length });
  } catch (err) {
    logError("Error log endpoint", err);
    res.status(500).json({ error: "Fout bij ophalen error log" });
  }
});

// Clear error log endpoint
app.delete("/error-log", (req, res) => {
  try {
    if (fs.existsSync(ERROR_LOG_FILE)) {
      fs.unlinkSync(ERROR_LOG_FILE);
    }
    res.json({ success: true, message: "Error log gewist" });
  } catch (err) {
    logError("Clear error log endpoint", err);
    res.status(500).json({ error: "Fout bij wissen error log" });
  }
});

// Handmatige prijscheck endpoint
app.post("/check-prices", async (req, res) => {
  debugLog('INFO', 'API /check-prices', 'Handmatige prijscheck gestart');
  res.json({ message: "Prijscheck gestart op de achtergrond" });
  
  const items = loadWishlist();
  let checkedCount = 0;
  let updatedCount = 0;
  
  for (const item of items) {
    if (!item.url || item.completed) continue;
    checkedCount++;
    try {
      const scraped = await scrapePrice(item.url);
      if (scraped.price) {
        const oldPrice = item.currentPrice;
        item.currentPrice = scraped.price;
        item.lastPriceCheckAt = new Date().toISOString();
        if (!item.priceHistory) item.priceHistory = [];
        item.priceHistory.push({
          date: new Date().toISOString(),
          price: scraped.price,
        });
        updatedCount++;
        if (oldPrice && scraped.price < oldPrice) {
          debugLog('SUCCESS', 'Prijscheck', `Prijs gedaald: ${item.title} - €${oldPrice} → €${scraped.price}`);
          await sendPriceAlert(item, oldPrice, scraped.price);
        } else if (oldPrice && oldPrice !== scraped.price) {
          debugLog('SUCCESS', 'Prijscheck', `Prijs gewijzigd: ${item.title} - €${oldPrice} → €${scraped.price}`);
        }
      }
    } catch (err) {
      debugLog('ERROR', 'Prijscheck', `Fout bij ${item.title}: ${err.message}`);
      logError("Handmatige prijscheck", err, { itemTitle: item.title, itemUrl: item.url });
    }
  }
  saveWishlist(items);
  debugLog('SUCCESS', 'API /check-prices', `Prijscheck voltooid: ${checkedCount} items gecheckt, ${updatedCount} prijzen bijgewerkt`);
});

// Nachtelijke prijscheck met cron (elke avond om 21:00)
cron.schedule("0 21 * * *", async () => {
  debugLog('INFO', 'Cron', '🌙 Avondelijke prijscheck gestart (21:00)');
  const items = loadWishlist();
  let checkedCount = 0;
  let changedCount = 0;
  
  for (const item of items) {
    if (!item.url || item.completed) continue;
    checkedCount++;
    
    try {
      const scraped = await scrapePrice(item.url);
      if (scraped.price && scraped.price !== item.currentPrice) {
        const oldPrice = item.currentPrice;
        item.currentPrice = scraped.price;
        item.lastPriceCheckAt = new Date().toISOString();
        
        if (!item.priceHistory) item.priceHistory = [];
        item.priceHistory.push({
          date: new Date().toISOString(),
          price: scraped.price,
        });
        
        changedCount++;
        if (scraped.price < oldPrice) {
          debugLog('SUCCESS', 'Cron', `💰 Prijs gedaald: ${item.title} - €${oldPrice} → €${scraped.price}`);
          await sendPriceAlert(item, oldPrice, scraped.price);
        } else {
          debugLog('SUCCESS', 'Cron', `💰 Prijs update: ${item.title} - €${oldPrice} → €${scraped.price}`);
        }
      }
    } catch (err) {
      debugLog('ERROR', 'Cron', `Fout bij ${item.title}: ${err.message}`);
      logError("Nachtelijke prijscheck", err, { itemTitle: item.title, itemUrl: item.url });
    }
  }
  
  saveWishlist(items);
  debugLog('SUCCESS', 'Cron', `✅ Avondelijke prijscheck voltooid: ${checkedCount} items gecheckt, ${changedCount} prijzen gewijzigd`);
});

app.listen(3001, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎁  WISHLIST BACKEND SERVER');
  console.log('='.repeat(60));
  debugLog('SUCCESS', 'Server', '✅ Backend gestart op http://localhost:3001');
  debugLog('INFO', 'Server', '📊 Debug logging actief');
  debugLog('INFO', 'Server', '🌙 Nachtelijke prijscheck: elke dag om 21:00');
  debugLog('INFO', 'Server', `📁 Data bestand: ${DATA_FILE}`);
  debugLog('INFO', 'Server', `📝 Debug log: ${DEBUG_LOG_FILE}`);
  debugLog('INFO', 'Server', `❌ Error log: ${ERROR_LOG_FILE}`);
  console.log('='.repeat(60) + '\n');
});
