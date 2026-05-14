const SCORER_COLORS = ['#ff2d9a', '#ffd700', '#9b30ff', '#00d4ff', '#ff8c42', '#4cff91', '#ff4444', '#c8ff00'];

let scorers = []; // { id, name, color, contestants: [...] }
let nextId   = 0;

function flagEmoji(code) {
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
}

// ── File handling ─────────────────────────────────────────────────────────────

function handleFiles(files) {
  [...files].forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.contestants || !Array.isArray(json.contestants)) {
          alert(`${file.name}: not a valid Eurovision score export.`);
          return;
        }
        const label = json.scorerName || file.name.replace(/\.json$/i, '');
        addScorer(label, json.contestants);
      } catch {
        alert(`${file.name}: could not parse JSON.`);
      }
    };
    reader.readAsText(file);
  });
}

function addScorer(name, contestants) {
  const id    = nextId++;
  const color = SCORER_COLORS[scorers.length % SCORER_COLORS.length];
  scorers.push({ id, name, color, contestants });
  renderScorers();
  renderLeaderboard();
}

function removeScorer(id) {
  scorers = scorers.filter(s => s.id !== id);
  renderScorers();
  renderLeaderboard();
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregate() {
  const countries = new Map();

  for (const scorer of scorers) {
    for (const c of scorer.contestants) {
      if (!countries.has(c.country)) {
        countries.set(c.country, {
          country:     c.country,
          countryCode: c.countryCode,
          artist:      c.artist,
          song:        c.song,
          order:       c.order,
          scores:      new Map(), // scorerId → score
        });
      }
      if (c.score !== null && c.score !== undefined) {
        countries.get(c.country).scores.set(scorer.id, Number(c.score));
      }
    }
  }

  const rows = [...countries.values()].map(c => {
    const vals = [...c.scores.values()];
    const avg  = vals.length > 0
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : null;
    return { ...c, avg, scoreCount: vals.length };
  });

  rows.sort((a, b) => {
    if (a.avg === null && b.avg === null) return (a.order ?? 99) - (b.order ?? 99);
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return b.scoreCount - a.scoreCount; // tiebreak: more votes wins
  });

  // assign ranks (shared rank for ties)
  let displayRank = 1;
  rows.forEach((r, i) => {
    if (r.avg === null) { r.rank = null; return; }
    if (i > 0 && rows[i - 1].avg !== null && rows[i - 1].avg === r.avg) {
      r.rank = rows[i - 1].rank;
    } else {
      r.rank = displayRank;
    }
    displayRank++;
  });

  return rows;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderScorers() {
  const el = document.getElementById('scorers-list');
  el.innerHTML = '';
  scorers.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'scorer-chip';
    chip.style.setProperty('--scorer-color', s.color);

    const scoredCount = s.contestants.filter(c => c.score !== null).length;

    chip.innerHTML = `
      <span class="scorer-dot"></span>
      <span class="scorer-name">${escHtml(s.name)}</span>
      <span class="scorer-meta">${scoredCount} / ${s.contestants.length} scored</span>
      <button class="scorer-remove" aria-label="Remove">✕</button>
    `;
    chip.querySelector('.scorer-remove').addEventListener('click', () => removeScorer(s.id));
    el.appendChild(chip);
  });
}

function renderLeaderboard() {
  const wrapper   = document.getElementById('leaderboard-wrapper');
  const emptyState = document.getElementById('empty-state');

  if (scorers.length === 0) {
    wrapper.hidden    = true;
    emptyState.hidden = false;
    return;
  }

  wrapper.hidden    = false;
  emptyState.hidden = true;

  const rows = aggregate();

  // ── Head ──
  const head = document.getElementById('leaderboard-head');
  const headerCells = scorers.map(s =>
    `<th class="col-scorer" style="color:${s.color}">${escHtml(s.name)}</th>`
  ).join('');

  head.innerHTML = `
    <tr>
      <th class="col-rank">Rank</th>
      <th class="col-flag"></th>
      <th class="col-country">Country</th>
      <th class="col-song">Artist / Song</th>
      <th class="col-avg">Avg</th>
      ${headerCells}
    </tr>
  `;

  // ── Body ──
  const body = document.getElementById('leaderboard-body');
  body.innerHTML = '';

  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

  rows.forEach(row => {
    const tr = document.createElement('tr');

    if (row.rank === 1) tr.classList.add('rank-gold');
    else if (row.rank === 2) tr.classList.add('rank-silver');
    else if (row.rank === 3) tr.classList.add('rank-bronze');
    else if (row.avg === null) tr.classList.add('rank-unscored');

    const rankDisplay = row.rank
      ? (medals[row.rank] ? `<span class="medal">${medals[row.rank]}</span>` : `<span class="rank-num">${row.rank}</span>`)
      : '<span class="rank-dash">—</span>';

    const avgDisplay = row.avg !== null
      ? `<span class="avg-cell">${row.avg.toFixed(1)}</span>`
      : '<span class="rank-dash">—</span>';

    const scorerCells = scorers.map(s => {
      const sc = row.scores.get(s.id);
      return sc !== undefined
        ? `<td class="scorer-score" style="color:${s.color}">${Number(sc).toFixed(1)}</td>`
        : `<td class="scorer-score scorer-blank">—</td>`;
    }).join('');

    tr.innerHTML = `
      <td class="col-rank">${rankDisplay}</td>
      <td class="col-flag"><span class="flag">${flagEmoji(row.countryCode)}</span></td>
      <td class="col-country"><span class="country-name">${row.country}</span></td>
      <td class="col-song">
        <div class="artist">${row.artist}</div>
        <div class="song-title">&ldquo;${row.song}&rdquo;</div>
      </td>
      <td class="col-avg">${avgDisplay}</td>
      ${scorerCells}
    `;
    body.appendChild(tr);
  });
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ── Upload zone events ────────────────────────────────────────────────────────

const zone      = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
zone.addEventListener('drop', e => {
  e.preventDefault();
  zone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
zone.addEventListener('click', e => {
  if (e.target.tagName !== 'LABEL') fileInput.click();
});

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});

renderLeaderboard();
