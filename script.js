const STORAGE_KEY     = 'eurovision-2026-scores';
const CONTESTANTS_KEY = 'eurovision-2026-contestants-v1';
const LIVE_ACT_KEY    = 'eurovision-2026-live-act';
const FINAL_DATE      = new Date('2026-05-16T19:00:00Z'); // 21:00 CEST

const REACTIONS = ['🔥', '👑', '💫', '😬', '🐍', '🎭'];

let contestants = [];
let scores      = {};
let currentAct  = null;

function computeCountdown(diff) {
  if (diff <= 0) return null;
  return {
    days:  Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    mins:  Math.floor((diff % 36e5)  / 6e4),
    secs:  Math.floor((diff % 6e4)   / 1e3),
  };
}

function startCountdown() {
  const el = document.getElementById('countdown');

  function tick() {
    const result = computeCountdown(FINAL_DATE - Date.now());

    if (!result) {
      el.innerHTML = '<span class="countdown-live">✦ THE SHOW IS LIVE ✦</span>';
      return;
    }

    const pad = n => String(n).padStart(2, '0');
    document.getElementById('cd-days').textContent  = pad(result.days);
    document.getElementById('cd-hours').textContent = pad(result.hours);
    document.getElementById('cd-mins').textContent  = pad(result.mins);
    document.getElementById('cd-secs').textContent  = pad(result.secs);
  }

  tick();
  setInterval(tick, 1000);
}

function flagEmoji(code) {
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
}

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    scores = raw ? JSON.parse(raw) : {};
  } catch {
    scores = {};
  }
  return scores;
}

function persistScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  refreshSummary();
}

function refreshSummary() {
  const entries = contestants
    .map(c => scores[c.country])
    .filter(s => s && s.score !== '' && s.score !== null && s.score !== undefined);

  const avgEl   = document.getElementById('avg-score');
  const countEl = document.getElementById('scored-count');

  if (entries.length === 0) {
    avgEl.textContent   = '—';
    countEl.textContent = '';
    return;
  }

  const avg = entries.reduce((sum, s) => sum + parseFloat(s.score), 0) / entries.length;
  avgEl.textContent   = avg.toFixed(1);
  countEl.textContent = `${entries.length} / ${contestants.length} scored`;
}

function sliderBackground(value) {
  const pct = (value / 10) * 100;
  return `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`;
}

function haptic(pattern = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function setCurrentAct(country) {
  currentAct = country || null;
  if (currentAct) {
    localStorage.setItem(LIVE_ACT_KEY, currentAct);
  } else {
    localStorage.removeItem(LIVE_ACT_KEY);
  }
  document.querySelectorAll('tbody tr[data-country]').forEach(tr => {
    tr.classList.toggle('is-current-act', tr.dataset.country === currentAct);
    const btn = tr.querySelector('.live-btn');
    if (btn) btn.textContent = tr.dataset.country === currentAct ? '★' : '▶';
  });
  renderNowPlaying();
  if (currentAct) {
    const row = document.querySelector(`tr[data-country="${CSS.escape(currentAct)}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function renderNowPlaying() {
  const bar = document.getElementById('now-playing-bar');
  if (!bar) return;

  if (!currentAct) {
    bar.classList.remove('visible');
    return;
  }

  const c = contestants.find(c => c.country === currentAct);
  if (!c) { bar.classList.remove('visible'); return; }

  const idx     = contestants.indexOf(c);
  const hasNext = idx < contestants.length - 1;

  bar.innerHTML = `
    <div class="np-inner">
      <span class="np-pill">NOW PLAYING</span>
      <span class="np-flag">${flagEmoji(c.countryCode)}</span>
      <div class="np-info">
        <span class="np-country">#${idx + 1} ${c.country}</span>
        <span class="np-song">&ldquo;${c.song}&rdquo; &mdash; ${c.artist}</span>
      </div>
      <div class="np-actions">
        ${hasNext ? '<button class="np-btn np-next" id="np-next-btn">Next →</button>' : ''}
        <button class="np-btn np-close" id="np-close-btn">✕</button>
      </div>
    </div>
  `;
  bar.classList.add('visible');

  if (hasNext) {
    document.getElementById('np-next-btn').addEventListener('click', () => {
      haptic(15);
      setCurrentAct(contestants[idx + 1].country);
    });
  }
  document.getElementById('np-close-btn').addEventListener('click', () => {
    setCurrentAct(null);
  });
}

function makeRow(contestant, index) {
  const saved    = scores[contestant.country] || {};
  const scoreVal = saved.score ?? '';
  const notesVal = saved.notes ?? '';
  const reactions = saved.reactions || [];

  const tr = document.createElement('tr');
  tr.dataset.country = contestant.country;

  if (scoreVal !== '') tr.classList.add('has-score');
  if (currentAct === contestant.country) tr.classList.add('is-current-act');

  const sliderNum = scoreVal !== '' ? parseFloat(scoreVal) : 0;
  const isLive    = currentAct === contestant.country;

  const tapButtons = Array.from({ length: 11 }, (_, i) => {
    const active = scoreVal !== '' && Math.round(parseFloat(scoreVal)) === i;
    return `<button class="tap-btn${active ? ' active' : ''}" data-value="${i}">${i}</button>`;
  }).join('');

  const reactionButtons = REACTIONS.map(r =>
    `<button class="reaction-btn${reactions.includes(r) ? ' active' : ''}" data-reaction="${r}">${r}</button>`
  ).join('');

  tr.innerHTML = `
    <td class="col-num"><span class="row-num">${index + 1}</span></td>
    <td class="col-flag">
      <span class="flag">${flagEmoji(contestant.countryCode)}</span>
      <button class="live-btn" title="Set as now playing">${isLive ? '★' : '▶'}</button>
    </td>
    <td class="col-country">
      <span class="country-name">${contestant.country}</span>
      <span class="mobile-meta">${contestant.artist} &mdash; <em>&ldquo;${contestant.song}&rdquo;</em></span>
    </td>
    <td class="col-song">
      <div class="artist">${contestant.artist}</div>
      <div class="song-title">&ldquo;${contestant.song}&rdquo;</div>
    </td>
    <td class="col-notes">
      <textarea class="notes-input" placeholder="notes…" rows="1">${notesVal}</textarea>
    </td>
    <td class="col-score">
      <div class="score-cell">
        <input type="range" class="score-slider" min="0" max="10" step="0.1"
          value="${sliderNum}" style="background:${sliderBackground(sliderNum)}">
        <input type="number" class="score-number" min="0" max="10" step="0.1"
          value="${scoreVal}" placeholder="—">
      </div>
      <div class="tap-score-grid">${tapButtons}</div>
      <div class="reaction-chips">${reactionButtons}</div>
    </td>
  `;

  const slider   = tr.querySelector('.score-slider');
  const numInput = tr.querySelector('.score-number');
  const notes    = tr.querySelector('.notes-input');
  const liveBtn  = tr.querySelector('.live-btn');

  function setScore(val) {
    const n = Math.min(10, Math.max(0, parseFloat(val)));
    slider.value               = n;
    numInput.value             = n;
    slider.style.background    = sliderBackground(n);
    if (!scores[contestant.country]) scores[contestant.country] = {};
    scores[contestant.country].score = n;
    tr.classList.add('has-score');
    tr.querySelectorAll('.tap-btn').forEach(btn => {
      btn.classList.toggle('active', Math.round(n) === parseInt(btn.dataset.value));
    });
    persistScores();
  }

  slider.addEventListener('input', () => setScore(slider.value));

  numInput.addEventListener('change', () => {
    if (numInput.value === '') return;
    setScore(numInput.value);
  });

  numInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') numInput.blur();
  });

  notes.addEventListener('input', () => {
    if (!scores[contestant.country]) scores[contestant.country] = {};
    scores[contestant.country].notes = notes.value;
    persistScores();
    notes.style.height = 'auto';
    notes.style.height = Math.min(notes.scrollHeight, 96) + 'px';
  });

  tr.querySelectorAll('.tap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic(10);
      setScore(parseInt(btn.dataset.value));
    });
  });

  tr.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic(8);
      if (!scores[contestant.country]) scores[contestant.country] = {};
      const current = scores[contestant.country].reactions || [];
      const r = btn.dataset.reaction;
      if (current.includes(r)) {
        scores[contestant.country].reactions = current.filter(x => x !== r);
        btn.classList.remove('active');
      } else {
        scores[contestant.country].reactions = [...current, r];
        btn.classList.add('active');
      }
      persistScores();
    });
  });

  liveBtn.addEventListener('click', () => {
    haptic(15);
    setCurrentAct(currentAct === contestant.country ? null : contestant.country);
  });

  return tr;
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  contestants.forEach((c, i) => tbody.appendChild(makeRow(c, i)));
  refreshSummary();
}

function buildExportData(contestantList, scoreMap, scorerName) {
  return {
    ...(scorerName ? { scorerName } : {}),
    event: 'Eurovision Song Contest 2026 — Grand Final',
    exportedAt: new Date().toISOString(),
    contestants: contestantList.map((c, i) => ({
      order:       i + 1,
      country:     c.country,
      countryCode: c.countryCode,
      artist:      c.artist,
      song:        c.song,
      score:       scoreMap[c.country]?.score ?? null,
      notes:       scoreMap[c.country]?.notes ?? '',
    })),
  };
}

function exportJSON() {
  const scorerName = document.getElementById('scorer-name').value.trim();
  const data = buildExportData(contestants, scores, scorerName);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'eurovision-2026-scores.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearAll() {
  if (!confirm('Clear all scores and notes? This cannot be undone.')) return;
  scores = {};
  localStorage.removeItem(STORAGE_KEY);
  renderTable();
}

async function loadContestants() {
  const cached = localStorage.getItem(CONTESTANTS_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  const resp = await fetch('data/contestants.json');
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  try { localStorage.setItem(CONTESTANTS_KEY, JSON.stringify(data)); } catch {}
  return data;
}

async function init() {
  startCountdown();
  loadScores();
  currentAct = localStorage.getItem(LIVE_ACT_KEY) || null;

  try {
    contestants = await loadContestants();
  } catch (err) {
    document.getElementById('table-body').innerHTML = `
      <tr class="placeholder-row">
        <td colspan="6">
          Failed to load contestants.json — serve this directory over HTTP
          (e.g. <code>python3 -m http.server</code> or VS Code Live Server).
        </td>
      </tr>`;
    console.error(err);
    return;
  }

  const nameInput = document.getElementById('scorer-name');
  nameInput.value = localStorage.getItem('eurovision-2026-name') || '';
  nameInput.addEventListener('input', () =>
    localStorage.setItem('eurovision-2026-name', nameInput.value.trim())
  );

  renderTable();
  renderNowPlaying();
  document.getElementById('export-btn').addEventListener('click', exportJSON);
  document.getElementById('clear-btn').addEventListener('click', clearAll);
}

if (typeof module === 'undefined') {
  init();
} else {
  module.exports = { flagEmoji, sliderBackground, computeCountdown, loadScores, buildExportData, FINAL_DATE, STORAGE_KEY };
}
