// Riverside Public Library — progressive enhancements. The page is fully readable without this file.
// Source file; the page loads the minified build (js/main.min.js, made by `npm run build`).
(() => {
  'use strict';

  /* Opening status: read the hours table and say whether the library is open right now. */
  const status = document.querySelector('[data-open-status]');
  const rows = [...document.querySelectorAll('[data-hours] tr[data-days]')];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hoursFor = (day) => rows.find((r) => r.dataset.days.split(' ').includes(String(day)));

  function openingStatus(now) {
    const today = now.getDay();
    const current = now.getHours() * 60 + now.getMinutes();
    const row = hoursFor(today);
    if (row && current >= minutes(row.dataset.open) && current < minutes(row.dataset.close)) {
      return `Open now · closes at ${row.dataset.close}`;
    }
    if (row && current < minutes(row.dataset.open)) return `Closed now · opens today at ${row.dataset.open}`;
    for (let offset = 1; offset <= 7; offset++) {
      const day = (today + offset) % 7;
      const next = hoursFor(day);
      if (next) return `Closed now · opens ${offset === 1 ? 'tomorrow' : DAY_NAMES[day]} at ${next.dataset.open}`;
    }
    return 'See opening hours below';
  }

  if (status && rows.length) status.textContent = openingStatus(new Date());

  /* Sign-up form: accessible inline errors instead of browser bubbles. */
  const form = document.querySelector('[data-signup]');
  if (!form) return;
  const formStatus = form.querySelector('[data-form-status]');
  const fields = [...form.querySelectorAll('[data-error]')];
  form.noValidate = true; // keep native constraints, show our own messages

  function check(field) {
    const error = document.getElementById(`${field.id}-error`);
    const valid = field.checkValidity();
    if (valid) field.removeAttribute('aria-invalid');
    else field.setAttribute('aria-invalid', 'true');
    error.textContent = valid ? '' : field.dataset.error;
    error.hidden = valid;
    return valid;
  }

  // After a field has been flagged, re-check it as the user types so the message clears straight away.
  form.addEventListener('input', (event) => {
    if (event.target.hasAttribute('aria-invalid')) check(event.target);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = fields.filter((field) => !check(field));
    formStatus.classList.toggle('is-error', invalid.length > 0);
    if (invalid.length) {
      formStatus.textContent = `${invalid.length} ${invalid.length === 1 ? 'field needs' : 'fields need'} attention. The first one has been selected.`;
      invalid[0].focus();
      return;
    }
    const name = form.elements.name.value.trim().split(/\s+/)[0];
    form.reset();
    formStatus.textContent = `Thank you, ${name}. Your card would be ready to collect from your home branch in 2 working days. (Demo only: nothing was sent.)`;
  });
})();
