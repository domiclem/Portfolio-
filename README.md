# Dominion — Personal Technology Portfolio

A responsive portfolio built with **HTML5, CSS3, and vanilla JavaScript**, plus a small **Node.js backend** for contact-form submissions. It brings together cybersecurity, software development, front-end development, data analysis, on-chain research, AI automation, teaching, and digital trust/compliance.

The server uses Node.js built-in modules only; there are no third-party runtime packages to install.

## 1. Project files

```text
dominion-portfolio/
├── index.html                     # Page content and contact form
├── styles.css                     # Responsive styling and themes
├── app.js                         # Browser interactions and POST request
├── server.js                      # Static web server + contact API
├── package.json                   # Start scripts and Node version
├── .gitignore                     # Excludes private submitted messages
├── README.md                      # This guide
├── assets/
│   └── favicon.svg
└── data/                           # Created by server; private submissions
    └── contact-submissions.jsonl  # One JSON record per line (not public)
```

## 2. Requirements

- Node.js 18 or later (Node.js 20 or 22 is recommended).
- A browser and a code editor such as Visual Studio Code.
- Internet access only for the optional Google Fonts used by the design.

## 3. Run the full website and backend

**Do not open `index.html` directly or use a static-only Live Server for the contact form.** The form needs the Node server running.

1. Extract the ZIP file.
2. Open the `dominion-portfolio` folder in Visual Studio Code.
3. Open a terminal in that folder.
4. Run:

   ```bash
   node server.js
   ```

   Or, if you prefer npm scripts:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000` in your browser.
6. Fill the contact form and submit a test message.

The terminal should say that the portfolio server is listening on port 3000. Stop the server with **Ctrl+C**.

To use a different port:

```bash
# macOS/Linux
PORT=8080 node server.js

# Windows PowerShell
$env:PORT=8080; node server.js
```

Then visit `http://localhost:8080`.

## 4. How the contact form works

1. The browser validates the visitor's name, email address, topic, and message.
2. JavaScript sends a JSON `POST` request to `/api/contact`.
3. The Node.js server validates the data again. Browser-side validation alone is not trusted.
4. Accepted messages are appended to `data/contact-submissions.jsonl` with an ID and submission timestamp.
5. The server sends a success or error response, which the website displays on the page.

The configured public email address is **dominionclement1@gmail.com**. It appears in the contact section and is used by the copy-email button. At present the backend **stores** contact messages; it does not automatically email you a notification. You can review local submissions in `data/contact-submissions.jsonl` using a text editor. Each line is a separate JSON object.

Example record structure (example values only):

```json
{"id":"example-id","submittedAt":"2026-10-21T12:00:00.000Z","name":"Example Visitor","email":"visitor@example.com","topic":"General conversation","message":"I would like to discuss a project."}
```

Keep submitted messages private. Do not commit `data/` to GitHub or share the file publicly. The `.gitignore` file excludes it from ordinary Git commits.

## 5. Basic protections included

- Server-side validation of all required fields and allowed topic values.
- Request body limit and strict JSON content type for the API.
- Basic per-client rate limiting in memory (8 submissions per 15-minute window).
- Same-origin check when a browser supplies an `Origin` header.
- A honeypot field that catches some simple form bots.
- Security response headers, including a Content Security Policy.
- Submission data is written outside the public static-file allowlist.
- No endpoint is provided for unauthenticated visitors to list or download submissions.

These are learning-project safeguards, not a guarantee against all abuse. For a public production website, consider a mature database, persistent hosting storage, stronger spam protection, monitoring, a privacy notice, and a managed email delivery service if you need notifications.

## 6. Deploying the backend

A static host such as **GitHub Pages cannot run `server.js`**. To keep the contact form functional, deploy this project to a Node.js-capable host (for example, a service that supports Node start commands) or host the front end separately and configure a secure backend API.

Set the service's start command to:

```bash
node server.js
```

The server uses the platform's `PORT` environment variable when supplied.

**Storage warning:** `data/contact-submissions.jsonl` is a local file. Many application hosting platforms use ephemeral filesystems, which can erase messages during redeploys or restarts. For real visitor data, attach a persistent disk/volume or replace file storage with a database such as PostgreSQL. Back up and restrict access to stored messages. Do not enable `TRUST_PROXY=true` unless the service is behind a trusted proxy that correctly overwrites `X-Forwarded-For`.

## 7. Customise your portfolio

### Email address

The contact address is configured in `app.js`:

```js
const PROFILE_EMAIL = 'dominionclement1@gmail.com';
```

The visible email link is also in `index.html`. If changing the address later, update both places.

### Social links

Near the end of `index.html`, replace these example URLs with your real public profiles:

```html
https://github.com/your-username
https://www.linkedin.com/in/your-username
```

Remove a social link if you are not ready to publish it.

### Project descriptions

The six project cards are portfolio plans/case-study outlines. Update descriptions, tools, outcomes, links, and project status to reflect what you have actually built. Do not present a concept or unfinished lab as completed work.

### Professional summary and skills

Edit the About, Expertise, Toolkit, Teaching, and Values sections in `index.html` to match your experience and the role you are targeting.

## 8. Front-end and JavaScript concepts demonstrated

**HTML:** semantic landmarks, headings, articles, links, forms, labels, inputs, select controls, textarea, accessible dialog, metadata, favicon.

**CSS:** custom properties, dark/light themes, typography, Flexbox, Grid, responsive media queries, transitions, animations, focus states, and reduced-motion support.

**JavaScript:** constants, functions, arrays, objects, DOM selection and updates, event listeners, conditionals, iteration, template literals, local storage, form validation, async/await, `fetch`, JSON, `IntersectionObserver`, `requestAnimationFrame`, Clipboard API fallback, and the HTML dialog API.

**Backend:** Node.js HTTP server, routing, JSON request parsing, validation, rate limiting, security headers, file-system persistence, and HTTP status codes.

## 9. Before using it professionally

1. Run the site locally and submit both valid and invalid test messages.
2. Remove or replace placeholder social links.
3. Add real GitHub links and demos for projects you have completed.
4. Test keyboard navigation, mobile layouts, server restarts, and browser console/network errors.
5. Decide how you will store and protect real submissions before publishing the site.
