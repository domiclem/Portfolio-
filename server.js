'use strict';

// Small dependency-free Node.js server for the portfolio and contact form.
// Contact submissions are stored privately in data/contact-submissions.jsonl.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'contact-submissions.jsonl');
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const BODY_LIMIT_BYTES = 12 * 1024;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 8;
const rateBuckets = new Map();

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/favicon.svg', ['assets/favicon.svg', 'image/svg+xml; charset=utf-8']]
]);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' mailto:; " +
    "script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self';"
  );
}

function sendJson(res, statusCode, body) {
  const output = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(output),
    'Cache-Control': 'no-store'
  });
  res.end(output);
}

function getClientAddress(req) {
  // Set TRUST_PROXY=true only when hosted behind a trusted proxy that overwrites this header.
  if (process.env.TRUST_PROXY === 'true' && req.headers['x-forwarded-for']) {
    return String(req.headers['x-forwarded-for']).split(',')[0].trim().slice(0, 100);
  }
  return req.socket.remoteAddress || 'unknown';
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Non-browser clients do not always send Origin.
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function takeRateLimitToken(address) {
  const now = Date.now();
  // Periodically discard expired entries so a long-running server does not keep stale keys.
  for (const [key, value] of rateBuckets) {
    if (now - value.startedAt > RATE_WINDOW_MS) rateBuckets.delete(key);
  }
  const bucket = rateBuckets.get(address);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(address, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      const error = new Error('Please submit the form using the website.');
      error.statusCode = 415;
      reject(error);
      req.resume();
      return;
    }

    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        if (!tooLarge) {
          tooLarge = true;
          const error = new Error('Your submission is too large. Please shorten your message.');
          error.statusCode = 413;
          reject(error);
        }
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const error = new Error('The submitted data was not valid JSON.');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function validateSubmission(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Invalid form submission.';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  const allowedTopics = new Set([
    'General conversation', 'Cybersecurity opportunity', 'Software or website project',
    'Data analysis', 'AI automation', 'Teaching or mentoring', 'Other'
  ]);

  if (name.length < 2 || name.length > 80) return 'Name must be between 2 and 80 characters.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Please provide a valid email address.';
  if (!allowedTopics.has(topic)) return 'Please choose a valid topic.';
  if (message.length < 10 || message.length > 3000) return 'Message must be between 10 and 3,000 characters.';
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(name + email + topic + message)) return 'Your submission contains unsupported characters.';
  return null;
}

async function handleContact(req, res) {
  if (!allowedOrigin(req)) {
    sendJson(res, 403, { message: 'This form submission was blocked.' });
    return;
  }

  const clientAddress = getClientAddress(req);
  if (!takeRateLimitToken(clientAddress)) {
    sendJson(res, 429, { message: 'Too many submissions. Please wait a little while and try again.' });
    return;
  }

  let data;
  try {
    data = await readJsonBody(req);
  } catch (error) {
    if (!res.headersSent && !res.destroyed) {
      sendJson(res, error.statusCode || 400, { message: error.message || 'Unable to read the submission.' });
    }
    return;
  }

  // Honeypot field catches a portion of simple automated spam. Return a generic success.
  if (typeof data.website === 'string' && data.website.trim()) {
    sendJson(res, 201, { message: 'Thank you. Your message has been received.' });
    return;
  }

  const validationError = validateSubmission(data);
  if (validationError) {
    sendJson(res, 400, { message: validationError });
    return;
  }

  const record = {
    id: require('node:crypto').randomUUID(),
    submittedAt: new Date().toISOString(),
    name: data.name.trim(),
    email: data.email.trim(),
    topic: data.topic.trim(),
    message: data.message.trim()
  };

  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    await fs.promises.appendFile(SUBMISSIONS_FILE, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
    sendJson(res, 201, { message: 'Thank you. Your message has been received successfully.' });
  } catch (error) {
    // Avoid exposing filesystem paths or internal errors to the visitor.
    console.error('Contact submission could not be saved:', error.code || error.name || 'unknown error');
    sendJson(res, 500, { message: 'The server could not save your message. Please try again later.' });
  }
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/api/contact') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { message: 'Use POST to submit this form.' });
      return;
    }
    await handleContact(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendJson(res, 405, { message: 'Method not allowed.' });
    return;
  }

  const fileDetails = staticFiles.get(pathname);
  if (!fileDetails) {
    sendJson(res, 404, { message: 'Not found.' });
    return;
  }

  const [relativePath, contentType] = fileDetails;
  const fullPath = path.join(ROOT, relativePath);
  try {
    const content = await fs.promises.readFile(fullPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache'
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error('Static file could not be read:', error.code || error.name || 'unknown error');
    sendJson(res, 500, { message: 'The server could not load this page.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dominion portfolio server listening on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser.`);
  console.log('Contact form submissions are saved privately in data/contact-submissions.jsonl.');
});

function shutDown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
