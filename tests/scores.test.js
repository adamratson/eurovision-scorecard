// Provide the DOM elements that refreshSummary() touches
document.body.innerHTML = `
  <span id="avg-score"></span>
  <span id="scored-count"></span>
  <tbody id="table-body"></tbody>
`;

const { loadScores, STORAGE_KEY } = require('../script.js');

describe('loadScores', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty object when nothing is stored', () => {
    expect(loadScores()).toEqual({});
  });

  it('returns previously stored scores', () => {
    const data = { France: { score: 8, notes: 'magnifique' } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(loadScores()).toEqual(data);
  });

  it('handles multiple countries', () => {
    const data = {
      Sweden:  { score: 9.5, notes: 'banger' },
      Germany: { score: 3,   notes: 'hmm'    },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = loadScores();
    expect(result.Sweden.score).toBe(9.5);
    expect(result.Germany.notes).toBe('hmm');
  });

  it('returns an empty object and does not throw on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{{not valid json}}');
    expect(() => loadScores()).not.toThrow();
    expect(loadScores()).toEqual({});
  });

  it('returns an empty object and does not throw on empty string', () => {
    localStorage.setItem(STORAGE_KEY, '');
    expect(() => loadScores()).not.toThrow();
    expect(loadScores()).toEqual({});
  });
});
