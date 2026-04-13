// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
var SUPABASE_URL = 'https://mremxexoltefqoyapnnc.supabase.co';
var SUPABASE_KEY = 'sb_publishable_yqwSAUdDZu75T9E8PyshCQ_y2DWF8_o';
// ────────────────────────────────────────────

var SCORES = {
  ownership_status: { owner:30, renter:0 },
  home_type: { detached:30, semi_detached:20, townhouse:15, condo:10 },
  bathroom_count: { "1":10, "2":20, "3_plus":30 },
  renovation_count: { "1":10, "2":20, "3_plus":30 },
  renovation_timeline: { asap:30, "3_months":25, "6_months":15, browsing:5 },
  bathroom_style: { modern:10, classic:10, spa:10, undecided:5 },
  renovation_type: { full_remodel:30, tub_to_shower:25, refresh:15, accessibility:20, undecided:5 },
  country: { CA:20, US:20, other:0 }
};

var AUTO_ADVANCE_DELAY = 300;

// ═══════════════════════════════════════════
// URL TRACKING PARAMS (captured on page load)
// Usage: ?c=paid&m=meta&r=gta&a=womanvideo&t=safety
// ═══════════════════════════════════════════
var urlParams = new URLSearchParams(window.location.search);
var tracking = {
  campaign: urlParams.get('c') || '',
  medium: urlParams.get('m') || '',
  region: urlParams.get('r') || '',
  ad: urlParams.get('a') || '',
  content_type: urlParams.get('t') || ''
};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
var currentScreen = 0;
var hist = [0];
var answers = {};
var registroSaved = false;

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function goTo(n) {
  var curr = document.querySelector('.screen.active');
  if (curr) { curr.classList.remove('active'); curr.classList.add('exit-left'); }
  setTimeout(function(){ document.querySelectorAll('.screen.exit-left').forEach(function(s){ s.classList.remove('exit-left'); }); }, 350);
  var next = document.querySelector('[data-screen="'+n+'"]');
  if (next) { next.classList.add('active'); next.scrollTop = 0; }
  currentScreen = n;
  hist.push(n);
}

function goBack() {
  if (hist.length <= 1) return;
  hist.pop();
  var prev = hist[hist.length - 1];
  var curr = document.querySelector('.screen.active');
  if (curr) { curr.classList.remove('active'); curr.style.transform='translateX(50px)'; curr.style.opacity='0'; }
  var target = document.querySelector('[data-screen="'+prev+'"]');
  if (target) {
    target.style.transform = 'translateX(-50px)'; target.style.opacity = '0';
    target.classList.add('active'); target.scrollTop = 0;
    requestAnimationFrame(function(){
      target.style.transform = ''; target.style.opacity = '';
      if (curr) { curr.style.transform = ''; curr.style.opacity = ''; }
    });
  }
  currentScreen = prev;
}

// ═══════════════════════════════════════════
// HELP POPUP
// ═══════════════════════════════════════════
function openHelp() { document.getElementById('helpOverlay').classList.add('open'); }
function closeHelp() { document.getElementById('helpOverlay').classList.remove('open'); }

// ═══════════════════════════════════════════
// SELECTION + AUTO-ADVANCE
// ═══════════════════════════════════════════
function sel(card, field, value, nextAction) {
  card.closest('.options').querySelectorAll('.option-card').forEach(function(c){ c.classList.remove('selected'); });
  card.classList.add('selected');
  answers[field] = value;
  if (nextAction) {
    setTimeout(function(){ nextAction(); }, AUTO_ADVANCE_DELAY);
  }
}

// ═══════════════════════════════════════════
// BATHROOM COUNT → RENOVATION COUNT LOGIC
// ═══════════════════════════════════════════
function handleBathroomCountNext() {
  var count = answers.bathroom_count;
  if (count === '1') {
    answers.renovation_count = '1';
  } else {
    var reno3plus = document.getElementById('reno-3plus');
    if (count === '2') {
      reno3plus.style.display = 'none';
    } else {
      reno3plus.style.display = '';
    }
    document.querySelectorAll('[data-screen="5"] .option-card').forEach(function(c){ c.classList.remove('selected'); });
  }
  goTo(4);
}

function handleAfterNutrition1() {
  if (answers.bathroom_count === '1') {
    goTo(9); // Skip renovation count, go straight to reno type
  } else {
    goTo(5);
  }
}

// ═══════════════════════════════════════════
// COUNTRY → ZIP LOGIC
// ═══════════════════════════════════════════
function handleCountryNext() {
  var country = answers.country;
  if (country === 'CA' || country === 'US') {
    var zi = document.getElementById('zipInput');
    var zh = document.getElementById('zipHint');
    var zt = document.getElementById('zipTitle');
    var ze = document.getElementById('zipError');
    ze.textContent = '';
    zi.value = '';
    document.getElementById('zipBtn').classList.remove('active');
    if (country === 'US') {
      zt.textContent = 'What is your ZIP code?';
      zi.placeholder = '12345';
      zi.maxLength = 5;
      zh.textContent = 'Enter your 5-digit US ZIP code';
    } else {
      zt.textContent = 'What is your postal code?';
      zi.placeholder = 'A1A1A1';
      zi.maxLength = 7;
      zh.textContent = 'Enter your Canadian postal code';
    }
    goTo(11);
    setTimeout(function(){ zi.focus(); }, 400);
  } else {
    saveRegistro();
    goTo(12);
  }
}

// ═══════════════════════════════════════════
// ZIP INPUT WITH VALIDATION
// ═══════════════════════════════════════════
function handleZipInput() {
  var zi = document.getElementById('zipInput');
  var ze = document.getElementById('zipError');
  var raw = zi.value;

  if (answers.country === 'US') {
    // US: only digits, max 5
    zi.value = raw.replace(/\D/g, '').substring(0, 5);
    var valid = zi.value.length === 5;
    ze.textContent = (zi.value.length > 0 && !valid) ? 'Enter 5 digits' : '';
    document.getElementById('zipBtn').classList.toggle('active', valid);
  } else {
    // Canada: A1A1A1 — strip spaces, force uppercase, enforce pattern
    var clean = raw.replace(/\s/g, '').toUpperCase();
    // Enforce alternating letter-number pattern
    var result = '';
    for (var i = 0; i < clean.length && i < 6; i++) {
      var ch = clean[i];
      if (i % 2 === 0) {
        // Even positions: letters only
        if (/[A-Z]/.test(ch)) result += ch;
      } else {
        // Odd positions: numbers only
        if (/[0-9]/.test(ch)) result += ch;
      }
    }
    // Insert space after 3rd character for display
    if (result.length > 3) {
      zi.value = result.substring(0, 3) + ' ' + result.substring(3);
    } else {
      zi.value = result;
    }
    var valid = result.length === 6;
    ze.textContent = (result.length > 0 && !valid) ? 'Format: A1A 1A1' : '';
    document.getElementById('zipBtn').classList.toggle('active', valid);
  }
}

function handleZipNext() {
  answers.zip_code = document.getElementById('zipInput').value.trim().replace(/\s/g, '').toUpperCase();
  saveRegistro();
  goTo(12);
}

// ═══════════════════════════════════════════
// LEAD INPUT WITH VALIDATION
// ═══════════════════════════════════════════
function handleLeadInput() {
  var nameEl = document.getElementById('nameInput');
  var phoneEl = document.getElementById('phoneInput');

  // Name: strip numbers and special chars, allow letters, spaces, hyphens, apostrophes
  nameEl.value = nameEl.value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');

  // Phone: strip non-digits
  phoneEl.value = phoneEl.value.replace(/\D/g, '').substring(0, 10);

  var n = nameEl.value.trim();
  var p = phoneEl.value.trim();
  document.getElementById('leadBtn').classList.toggle('active', n.length > 1 && p.length === 10);
}

function handleLeadSubmit() {
  var btn = document.getElementById('leadBtn');
  btn.classList.add('sending');
  var payload = buildPayload('lead');
  payload.name = document.getElementById('nameInput').value.trim();
  payload.phone = document.getElementById('phoneInput').value.trim();

  saveToSupabase(payload)
    .catch(function(err) { console.error('Supabase lead save error:', err); })
    .then(function() {
      btn.classList.remove('sending');
      showThankYou();
    });
}

// ═══════════════════════════════════════════
// THANK YOU
// ═══════════════════════════════════════════
function showThankYou() {
  goTo(13);
}

// ═══════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════
function calcScore() {
  var total = 0;
  for (var field in answers) {
    if (SCORES[field] && SCORES[field][answers[field]] !== undefined) {
      total += SCORES[field][answers[field]];
    }
  }
  return total;
}

// ═══════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════
function buildPayload(type) {
  return {
    type: type,
    ownership_status: answers.ownership_status || '',
    home_type: answers.home_type || '',
    bathroom_count: answers.bathroom_count || '',
    renovation_count: answers.renovation_count || '',
    renovation_timeline: answers.renovation_timeline || '',
    bathroom_style: answers.bathroom_style || '',
    renovation_type: answers.renovation_type || '',
    country: answers.country || '',
    zip_code: answers.zip_code || '',
    score: calcScore(),
    campaign: tracking.campaign,
    medium: tracking.medium,
    region: tracking.region,
    ad: tracking.ad,
    content_type: tracking.content_type
  };
}

function saveRegistro() {
  if (registroSaved) return;
  registroSaved = true;
  var payload = buildPayload('registro');
  saveToSupabase(payload).catch(function(err) {
    console.error('Supabase registro save error:', err);
  });

  // ═══════════════════════════════════════════
  // 🔥 CONVERSION TRACKING — FIRE HERE
  // META PIXEL:
fbq('track', 'CompleteRegistration', { value: payload.score, currency: 'CAD' });
  //
  // GOOGLE ADS:
  // gtag('event', 'conversion', { send_to: 'AW-XXXXXXXXX/XXXXXX' });
  //
  // GOOGLE ANALYTICS:
gtag('event', 'quiz_completed', { score: payload.score, country: payload.country });
  // ═══════════════════════════════════════════
}

// ═══════════════════════════════════════════
// SUPABASE — routes to bathreno-registro or bathreno-leads
// ═══════════════════════════════════════════
function saveToSupabase(payload) {
  var now = new Date();
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var isLead = payload.type === 'lead';
  var table  = isLead ? 'bathreno-leads' : 'bathreno-registro';

  console.log('[Supabase] type:', payload.type, '→ table:', table);

  var record = {
    ownership_status:    payload.ownership_status,
    home_type:           payload.home_type,
    bathroom_count:      payload.bathroom_count,
    renovation_count:    payload.renovation_count,
    renovation_timeline: payload.renovation_timeline,
    bathroom_style:      payload.bathroom_style,
    renovation_type:     payload.renovation_type,
    country:             payload.country,
    zip_code:            payload.zip_code,
    score:               payload.score,
    campaign:            payload.campaign,
    medium:              payload.medium,
    region:              payload.region,
    ad:                  payload.ad,
    content_type:        payload.content_type,
    timestamp:           now.toISOString(),
    day:                 days[now.getDay()],
    hour:                now.getHours()
  };

  if (isLead) {
    record.name  = payload.name  || null;
    record.phone = payload.phone || null;
  }

  return fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    },
    body: JSON.stringify(record)
  }).then(function(res) {
    if (!res.ok) {
      return res.text().then(function(text) {
        console.error('[Supabase] INSERT failed — table:', table, '— status:', res.status, '— response:', text);
        throw new Error('Supabase error ' + res.status + ': ' + text);
      });
    }
    console.log('[Supabase] INSERT success — table:', table);
  });
}
