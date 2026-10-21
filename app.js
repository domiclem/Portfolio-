/* ==========================================================
   DOMINION PORTFOLIO — Interactive behaviour
   Update PROFILE_EMAIL and the social links in index.html.
   ========================================================== */
'use strict';

document.documentElement.classList.add('js-ready');

// Personalise this address before using the contact form.
const PROFILE_EMAIL = 'dominionclement1@gmail.com';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// --- Theme toggle (remembers a visitor's preference) ---
const themeToggle = $('#themeToggle');
const savedTheme = safeStorageGet('dominion-portfolio-theme');
if (savedTheme === 'light' || savedTheme === 'dark') {
  document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : '';
  if (savedTheme === 'dark') document.documentElement.removeAttribute('data-theme');
}
updateThemeButton();

themeToggle?.addEventListener('click', () => {
  const isLight = document.documentElement.dataset.theme === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    safeStorageSet('dominion-portfolio-theme', 'dark');
  } else {
    document.documentElement.dataset.theme = 'light';
    safeStorageSet('dominion-portfolio-theme', 'light');
  }
  updateThemeButton();
});

function updateThemeButton() {
  const isLight = document.documentElement.dataset.theme === 'light';
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    themeToggle.title = isLight ? 'Switch to dark theme' : 'Switch to light theme';
  }
  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = isLight ? '#f4f7fb' : '#0a1020';
}

function safeStorageGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeStorageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* Private browsing may block storage. */ }
}

// --- Mobile menu ---
const menuToggle = $('#menuToggle');
const primaryNav = $('#primaryNav');
function closeMenu() {
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation menu');
  primaryNav?.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}
menuToggle?.addEventListener('click', () => {
  const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(willOpen));
  menuToggle.setAttribute('aria-label', willOpen ? 'Close navigation menu' : 'Open navigation menu');
  primaryNav?.classList.toggle('is-open', willOpen);
  document.body.classList.toggle('menu-open', willOpen);
});
$$('.nav-link').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 790) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

// --- Animated job-focus text ---
const typingTarget = $('#typingText');
const focusPhrases = [
  'digital experiences.',
  'systems with security in mind.',
  'useful tools with Python.',
  'clear, responsive websites.',
  'workflows that save time.'
];
let phraseIndex = 0;
let characterIndex = focusPhrases[0].length;
let deleting = false;
let typingTimer;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function typeNextCharacter() {
  if (!typingTarget || reducedMotion) return;
  const phrase = focusPhrases[phraseIndex];
  if (!deleting) {
    characterIndex += 1;
    typingTarget.textContent = phrase.slice(0, characterIndex);
    if (characterIndex >= phrase.length) {
      deleting = true;
      typingTimer = window.setTimeout(typeNextCharacter, 1750);
      return;
    }
    typingTimer = window.setTimeout(typeNextCharacter, 42);
  } else {
    characterIndex -= 1;
    typingTarget.textContent = phrase.slice(0, characterIndex);
    if (characterIndex <= 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % focusPhrases.length;
      typingTimer = window.setTimeout(typeNextCharacter, 280);
      return;
    }
    typingTimer = window.setTimeout(typeNextCharacter, 23);
  }
}
if (typingTarget && !reducedMotion) {
  typingTimer = window.setTimeout(() => {
    typingTarget.textContent = '';
    characterIndex = 0;
    typeNextCharacter();
  }, 2200);
}

// --- Scroll progress, back-to-top, active navigation ---
const progressBar = $('#scrollProgress');
const backToTop = $('#backToTop');
const navLinks = $$('.nav-link');
const navSections = navLinks.map(link => $(link.getAttribute('href'))).filter(Boolean);
let scrollTicking = false;
function updateScrollUI() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const percentage = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  backToTop?.classList.toggle('visible', window.scrollY > 500);
  let currentId = 'home';
  for (const section of navSections) {
    if (section.getBoundingClientRect().top <= 150) currentId = section.id;
  }
  navLinks.forEach(link => {
    const isCurrent = link.getAttribute('href') === `#${currentId}`;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(updateScrollUI);
    scrollTicking = true;
  }
}, { passive: true });
window.addEventListener('resize', updateScrollUI);
updateScrollUI();
backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

// --- Reveal-on-scroll animation with a graceful fallback ---
const revealItems = $$('.reveal');
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('in-view'));
}

// --- Project category filters ---
const filterButtons = $$('.filter-button');
const projectCards = $$('.project-card');
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    filterButtons.forEach(candidate => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    projectCards.forEach(card => {
      const categories = (card.dataset.category || '').split(/\s+/);
      const shouldShow = filter === 'all' || categories.includes(filter);
      card.hidden = !shouldShow;
      if (shouldShow) card.classList.add('in-view');
    });
    const projectCount = projectCards.filter(card => !card.hidden).length;
    const projectsHeading = $('#projectsGrid');
    if (projectsHeading) projectsHeading.setAttribute('aria-label', `${projectCount} projects shown`);
  });
});

// --- Project detail dialog: scope and outcomes are build guidance ---
const projectData = {
  fraud: {
    category: 'SECURITY + DATA SCIENCE',
    title: 'Credit Card Fraud Detection',
    description: 'Build a supervised-learning demo that examines anonymised transaction features and predicts whether a transaction may be fraudulent. Fraud datasets are often highly imbalanced, so the project should focus on evaluation beyond accuracy alone.',
    scope: ['Load and inspect a labelled transaction dataset.', 'Prepare features and a reproducible train/test split.', 'Compare logistic regression and decision tree models.', 'Present a prediction and model metrics in a small Streamlit interface.'],
    outcomes: ['Confusion matrix, precision, recall, and F1-score.', 'Explain false positives and false negatives.', 'Document limits; do not present a demo as a production fraud-control system.']
  },
  soc: {
    category: 'CYBERSECURITY / PRACTICE LAB',
    title: 'SOC Alert Triage Lab',
    description: 'Create a safe, synthetic case study in which a junior analyst reviews example authentication events, identifies suspicious indicators, sets an initial priority, and writes down escalation decisions.',
    scope: ['Generate or use a small set of synthetic log events.', 'Define simple investigation questions and indicators.', 'Create a triage worksheet with evidence and time stamps.', 'Write a short incident summary and recommended next steps.'],
    outcomes: ['A reproducible investigation note.', 'Clear separation of observed evidence and assumptions.', 'A documented escalation and containment decision path.']
  },
  portfolio: {
    category: 'FRONT-END DEVELOPMENT',
    title: 'Responsive Portfolio Website',
    description: 'Build a polished multi-section portfolio with semantic HTML, responsive CSS layouts, accessible controls, and JavaScript interactions without needing a front-end framework.',
    scope: ['Use semantic sections, headings, and navigation landmarks.', 'Create responsive layouts with Grid and Flexbox.', 'Add a mobile menu, theme toggle, and project filters.', 'Validate form input and test keyboard navigation.'],
    outcomes: ['A responsive site across phone, tablet, and desktop widths.', 'Usable keyboard focus and reduced-motion support.', 'Cleanly organised files and a clear README.']
  },
  onchain: {
    category: 'BLOCKCHAIN + DATA RESEARCH',
    title: 'On-chain Wallet Explorer',
    description: 'Design a research workflow for inspecting publicly available blockchain activity, mapping transaction relationships, and documenting what the evidence does and does not establish.',
    scope: ['Select a public chain and use a read-only data source.', 'Represent transaction participants as nodes and transfers as edges.', 'Add labels, timestamps, amounts, and links to source transactions.', 'Document known attribution limits and avoid unsupported identity claims.'],
    outcomes: ['A clear wallet-activity timeline or graph.', 'Traceable references to public transactions.', 'A short methodology and limitations note.']
  },
  automation: {
    category: 'AI + WORKFLOW AUTOMATION',
    title: 'Form Feedback Automation',
    description: 'Connect a form submission to an automated acknowledgement. A reliable workflow should handle missing fields, duplicate events, delivery failures, and human follow-up where necessary.',
    scope: ['Capture a Google Forms response using a supported trigger.', 'Map the name and email fields into a message template.', 'Send an acknowledgement via a connected email service.', 'Log the run result and route errors for review.'],
    outcomes: ['A successful end-to-end test submission.', 'A clear workflow diagram and credential-safe setup.', 'Documented handling for invalid email and failed sends.']
  },
  education: {
    category: 'TECHNOLOGY EDUCATION',
    title: 'Beginner Coding Learning Hub',
    description: 'Create a small learning site for new programmers with concise lessons, code examples, practice prompts, and quizzes. Design the experience around understanding rather than memorising syntax.',
    scope: ['Organise topics into short learning paths.', 'Include practical HTML, CSS, JavaScript, and Python examples.', 'Add quizzes with feedback and a separated answer key.', 'Make content readable on phones and accessible by keyboard.'],
    outcomes: ['A learner can progress through a topic in order.', 'Practice tasks connect to everyday scenarios.', 'A teacher can update lesson content without rewriting the whole site.']
  }
};
const projectDialog = $('#projectDialog');
const dialogTitle = $('#dialogTitle');
const dialogCategory = $('#dialogCategory');
const dialogDescription = $('#dialogDescription');
const dialogScope = $('#dialogScope');
const dialogOutcomes = $('#dialogOutcomes');
const dialogClose = $('#dialogClose');
const dialogContact = $('#dialogContact');
$$('.project-details-button').forEach(button => {
  button.addEventListener('click', () => {
    const data = projectData[button.dataset.project];
    if (!data || !projectDialog) return;
    dialogCategory.textContent = data.category;
    dialogTitle.textContent = data.title;
    dialogDescription.textContent = data.description;
    fillList(dialogScope, data.scope);
    fillList(dialogOutcomes, data.outcomes);
    if (typeof projectDialog.showModal === 'function') projectDialog.showModal();
    else projectDialog.setAttribute('open', '');
    dialogClose?.focus();
  });
});
function fillList(list, items) {
  if (!list) return;
  list.replaceChildren(...items.map(item => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}
dialogClose?.addEventListener('click', () => closeProjectDialog());
projectDialog?.addEventListener('click', event => {
  if (event.target === projectDialog) closeProjectDialog();
});
projectDialog?.addEventListener('close', () => { /* Native dialog close event hook. */ });
function closeProjectDialog() {
  if (!projectDialog) return;
  if (typeof projectDialog.close === 'function') projectDialog.close();
  else projectDialog.removeAttribute('open');
}
dialogContact?.addEventListener('click', closeProjectDialog);

// --- Email display and copy button ---
const emailLink = $('#emailLink');
if (emailLink) {
  emailLink.textContent = PROFILE_EMAIL;
  emailLink.href = `mailto:${PROFILE_EMAIL}`;
}
const copyEmailButton = $('#copyEmail');
copyEmailButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(PROFILE_EMAIL);
    showToast('Email address copied.');
  } catch {
    // Clipboard access may be unavailable on plain local files; use a selectable fallback.
    const fallback = document.createElement('textarea');
    fallback.value = PROFILE_EMAIL;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    showToast(copied ? 'Email address copied.' : `Email: ${PROFILE_EMAIL}`);
  }
});
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

// --- Contact form: validate in the browser, then submit to the Node.js server ---
const contactForm = $('#contactForm');
const nameInput = $('#name');
const senderEmailInput = $('#email');
const topicInput = $('#topic');
const messageInput = $('#message');
const websiteInput = $('#website'); // Honeypot: real visitors should leave this empty.
const formStatus = $('#formStatus');
const submitButton = contactForm?.querySelector('button[type="submit"]');
const originalSubmitButtonHTML = submitButton?.innerHTML || 'Submit message';
const formFields = [
  { input: nameInput, error: $('#nameError'), validate: value => value.trim().length >= 2 ? '' : 'Enter your name (at least 2 characters).' },
  { input: senderEmailInput, error: $('#emailError'), validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'Enter a valid email address.' },
  { input: messageInput, error: $('#messageError'), validate: value => value.trim().length >= 10 ? '' : 'Please write at least 10 characters.' }
];
formFields.forEach(field => {
  field.input?.addEventListener('input', () => {
    field.input.classList.remove('invalid');
    if (field.error) field.error.textContent = '';
    if (formStatus) formStatus.textContent = '';
  });
});

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  let firstInvalid = null;
  let valid = true;
  formFields.forEach(field => {
    const message = field.validate(field.input?.value || '');
    if (field.error) field.error.textContent = message;
    field.input?.classList.toggle('invalid', Boolean(message));
    if (message) {
      valid = false;
      if (!firstInvalid) firstInvalid = field.input;
    }
  });
  if (!valid) {
    if (formStatus) formStatus.textContent = 'Please correct the highlighted fields.';
    firstInvalid?.focus();
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    email: senderEmailInput.value.trim(),
    topic: topicInput.value,
    message: messageInput.value.trim(),
    website: websiteInput?.value.trim() || ''
  };

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
  }
  if (formStatus) formStatus.textContent = 'Submitting your message securely…';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) throw new Error('Too many submissions. Please wait a little while and try again.');
      if (response.status === 400) throw new Error(result.message || 'Please review your details and try again.');
      throw new Error(result.message || 'The server could not accept your message. Please try again later.');
    }

    if (formStatus) formStatus.textContent = result.message || 'Thank you. Your message has been received.';
    contactForm.reset();
    formFields.forEach(field => {
      field.input?.classList.remove('invalid');
      if (field.error) field.error.textContent = '';
    });
  } catch (error) {
    if (formStatus) {
      formStatus.textContent = error instanceof TypeError
        ? 'Could not reach the server. Start the website with “node server.js” and try again.'
        : error.message;
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalSubmitButtonHTML;
    }
  }
});

// --- Footer year ---
const currentYear = $('#currentYear');
if (currentYear) currentYear.textContent = new Date().getFullYear();
