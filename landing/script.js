// ═══════════════════════════════════════════
// LANDING — LEAD FORM HANDLER
// Mirrors quiz/script.js patterns for Supabase + pixel firing
// ═══════════════════════════════════════════

var SUPABASE_URL = 'https://mremxexoltefqoyapnnc.supabase.co';
var SUPABASE_KEY = 'sb_publishable_yqwSAUdDZu75T9E8PyshCQ_y2DWF8_o';
var SOURCE       = 'landing';
var THANK_YOU_URL = 'thank-you.html';

// ═══════════════════════════════════════════
// URL TRACKING PARAMS (captured on page load)
// Usage: ?c=paid&m=meta&r=gta&a=womanvideo&t=safety
// ═══════════════════════════════════════════
var urlParams = new URLSearchParams(window.location.search);
var tracking = {
  campaign:     urlParams.get('c') || '',
  medium:       urlParams.get('m') || '',
  region:       urlParams.get('r') || '',
  ad:           urlParams.get('a') || '',
  content_type: urlParams.get('t') || ''
};

// ═══════════════════════════════════════════
// ELEMENTS
// ═══════════════════════════════════════════
var form        = document.getElementById('leadForm');
var nameEl      = document.getElementById('nameInput');
var phoneEl     = document.getElementById('phoneInput');
var zipEl       = document.getElementById('zipInput');
var zipHintEl   = document.getElementById('zipHint');
var renoTypeEl  = document.getElementById('renoTypeSelect');
var errorEl     = document.getElementById('formError');
var submitBtn   = document.getElementById('submitBtn');

// ═══════════════════════════════════════════
// INPUT SANITISATION & ZIP AUTO-DETECTION
// ═══════════════════════════════════════════

// Name: letters, spaces, hyphens, apostrophes only
nameEl.addEventListener('input', function() {
  nameEl.value = nameEl.value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');
  clearFieldError(nameEl);
});

// Phone: digits only, max 10
phoneEl.addEventListener('input', function() {
  phoneEl.value = phoneEl.value.replace(/\D/g, '').substring(0, 10);
  clearFieldError(phoneEl);
});

// ZIP: auto-detect Canadian (A1A 1A1) vs US (12345)
zipEl.addEventListener('input', function() {
  var raw = zipEl.value.trim();
  clearFieldError(zipEl);

  // First char decides: letter → Canadian, digit → US
  var firstChar = raw.replace(/\s/g, '').charAt(0);

  if (/[A-Za-z]/.test(firstChar)) {
    // Canadian: A1A 1A1
    zipEl.setAttribute('maxlength', '7');
    var clean = raw.replace(/\s/g, '').toUpperCase();
    var result = '';
    for (var i = 0; i < clean.length && i < 6; i++) {
      var ch = clean[i];
      if (i % 2 === 0) {
        if (/[A-Z]/.test(ch)) result += ch;
      } else {
        if (/[0-9]/.test(ch)) result += ch;
      }
    }
    zipEl.value = result.length > 3
      ? result.substring(0, 3) + ' ' + result.substring(3)
      : result;
    zipHintEl.textContent = 'Canadian postal code (e.g. M5V 2T6)';
  } else if (/[0-9]/.test(firstChar)) {
    // US: 12345
    zipEl.setAttribute('maxlength', '5');
    zipEl.value = raw.replace(/\D/g, '').substring(0, 5);
    zipHintEl.textContent = 'US ZIP code (5 digits)';
  } else {
    zipEl.setAttribute('maxlength', '7');
    zipEl.value = '';
    zipHintEl.textContent = "We'll auto-detect Canadian or US format.";
  }
});

renoTypeEl.addEventListener('change', function() { clearFieldError(renoTypeEl); });

// ═══════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════
function validate() {
  var errors = [];
  var name = nameEl.value.trim();
  var phone = phoneEl.value.trim();
  var zipRaw = zipEl.value.trim().replace(/\s/g, '').toUpperCase();
  var renoType = renoTypeEl.value;

  if (name.length < 2) { markFieldError(nameEl); errors.push('Please enter your full name.'); }
  if (phone.length !== 10) { markFieldError(phoneEl); errors.push('Please enter a valid 10-digit phone number.'); }

  // ZIP: accept either CA (A1A1A1 pattern) or US (5 digits)
  var isCanadian = /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(zipRaw);
  var isUS       = /^\d{5}$/.test(zipRaw);
  if (!isCanadian && !isUS) { markFieldError(zipEl); errors.push('Please enter a valid postal or ZIP code.'); }

  if (!renoType) { markFieldError(renoTypeEl); errors.push('Please select the type of renovation.'); }

  return { valid: errors.length === 0, errors: errors, isCanadian: isCanadian };
}

function markFieldError(el) { el.classList.add('invalid'); }
function clearFieldError(el) { el.classList.remove('invalid'); }

// ═══════════════════════════════════════════
// SUBMIT HANDLER
// ═══════════════════════════════════════════
form.addEventListener('submit', function(e) {
  e.preventDefault();
  errorEl.textContent = '';

  var result = validate();
  if (!result.valid) {
    errorEl.textContent = result.errors[0];
    return;
  }

  submitBtn.classList.add('sending');
  submitBtn.disabled = true;

  var payload = buildPayload(result.isCanadian);

  saveToSupabase(payload)
    .catch(function(err) {
      console.error('Supabase lead save error:', err);
      // Non-blocking: proceed to thank-you anyway so we don't lose the user
    })
    .then(function() {
      fireConversionPixels(payload);
      // Small delay so pixels have a chance to fire before navigation
      setTimeout(function() {
        window.location.href = THANK_YOU_URL;
      }, 200);
    });
});

// ═══════════════════════════════════════════
// PAYLOAD
// ═══════════════════════════════════════════
function buildPayload(isCanadian) {
  var now = new Date();
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  return {
    source:              SOURCE,
    name:                nameEl.value.trim(),
    phone:               phoneEl.value.trim(),
    zip_code:            zipEl.value.trim().replace(/\s/g, '').toUpperCase(),
    country:             isCanadian ? 'CA' : 'US',
    renovation_type:     renoTypeEl.value,
    // Leave unused quiz fields empty for schema consistency
    ownership_status:    '',
    home_type:           '',
    bathroom_count:      '',
    renovation_count:    '',
    renovation_timeline: '',
    bathroom_style:      '',
    score:               null,
    // Tracking params from URL
    campaign:            tracking.campaign,
    medium:              tracking.medium,
    region:              tracking.region,
    ad:                  tracking.ad,
    content_type:        tracking.content_type,
    // Timestamp
    timestamp:           now.toISOString(),
    day:                 days[now.getDay()],
    hour:                now.getHours()
  };
}

// ═══════════════════════════════════════════
// SUPABASE → bathreno-leads
// ═══════════════════════════════════════════
function saveToSupabase(payload) {
  return fetch(SUPABASE_URL + '/rest/v1/bathreno-leads', {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    },
    body: JSON.stringify(payload)
  }).then(function(res) {
    if (!res.ok) {
      return res.text().then(function(text) {
        throw new Error('Supabase error ' + res.status + ': ' + text);
      });
    }
  });
}

// ═══════════════════════════════════════════
// CONVERSION TRACKING — fires on successful save
// ═══════════════════════════════════════════
function fireConversionPixels(payload) {
  try {
    // META PIXEL — Lead event (standard for form lead capture)
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'Landing form',
        value:        0,
        currency:     'CAD'
      });
    }

    // GOOGLE ANALYTICS 4
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        source:          'landing',
        renovation_type: payload.renovation_type,
        country:         payload.country
      });
    }

    // TIKTOK PIXEL
    if (typeof ttq !== 'undefined' && ttq.track) {
      ttq.track('SubmitForm', { content_name: 'Landing form' });
    }

    // GOOGLE ADS — uncomment & set your conversion ID when ready
    // if (typeof gtag === 'function') {
    //   gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXXXX' });
    // }
  } catch (err) {
    console.warn('Pixel fire error:', err);
  }
}
