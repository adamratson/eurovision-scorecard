const STORAGE_KEY = 'eurovision-2026-scores';
const FINAL_DATE  = new Date('2026-05-16T19:00:00Z'); // 21:00 CEST

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

let contestants = [];
let scores = {};

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

  const avgEl = document.getElementById('avg-score');
  const countEl = document.getElementById('scored-count');

  if (entries.length === 0) {
    avgEl.textContent = '—';
    countEl.textContent = '';
    return;
  }

  const avg = entries.reduce((sum, s) => sum + parseFloat(s.score), 0) / entries.length;
  avgEl.textContent = avg.toFixed(1);
  countEl.textContent = `${entries.length} / ${contestants.length} scored`;
}

function sliderBackground(value) {
  const pct = (value / 10) * 100;
  return `linear-gradient(to right, var(--gold) ${pct}%, var(--border) ${pct}%)`;
}

function makeRow(contestant, index) {
  const saved = scores[contestant.country] || {};
  const scoreVal = saved.score ?? '';
  const notesVal = saved.notes ?? '';

  const tr = document.createElement('tr');
  tr.dataset.country = contestant.country;

  if (scoreVal !== '') tr.classList.add('has-score');

  const sliderNum = scoreVal !== '' ? parseFloat(scoreVal) : 0;

  tr.innerHTML = `
    <td class="col-num"><span class="row-num">${index + 1}</span></td>
    <td class="col-flag"><span class="flag">${flagEmoji(contestant.countryCode)}</span></td>
    <td class="col-country">
      <span class="country-name">${contestant.country}</span>
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
    </td>
  `;

  const slider = tr.querySelector('.score-slider');
  const numInput = tr.querySelector('.score-number');
  const notes = tr.querySelector('.notes-input');

  function setScore(val) {
    const n = Math.min(10, Math.max(0, parseFloat(val)));
    slider.value = n;
    numInput.value = n;
    slider.style.background = sliderBackground(n);
    if (!scores[contestant.country]) scores[contestant.country] = {};
    scores[contestant.country].score = n;
    tr.classList.add('has-score');
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
      order: i + 1,
      country: c.country,
      countryCode: c.countryCode,
      artist: c.artist,
      song: c.song,
      score: scoreMap[c.country]?.score ?? null,
      notes: scoreMap[c.country]?.notes ?? '',
    })),
  };
}

function exportJSON() {
  const scorerName = document.getElementById('scorer-name').value.trim();
  const data = buildExportData(contestants, scores, scorerName);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
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

async function init() {
  startCountdown();
  loadScores();

  try {
    const resp = await fetch('data/contestants.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    contestants = await resp.json();
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
  document.getElementById('export-btn').addEventListener('click', exportJSON);
  document.getElementById('clear-btn').addEventListener('click', clearAll);
}

if (typeof module === 'undefined') {
  init();
} else {
  module.exports = { flagEmoji, sliderBackground, computeCountdown, loadScores, buildExportData, FINAL_DATE, STORAGE_KEY };
}
