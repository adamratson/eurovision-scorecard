const { buildExportData } = require('../script.js');

const CONTESTANTS = [
  { country: 'Sweden',  countryCode: 'SE', artist: 'FELICIA',       song: 'My System',   status: 'sf1'  },
  { country: 'Austria', countryCode: 'AT', artist: 'Cosmó',         song: 'Tanzschein',  status: 'host' },
  { country: 'France',  countryCode: 'FR', artist: 'Monroe',        song: 'Regarde !',   status: 'auto' },
];

describe('buildExportData', () => {
  it('includes the event name', () => {
    const data = buildExportData([], {});
    expect(data.event).toMatch(/Eurovision/);
    expect(data.event).toMatch(/2026/);
  });

  it('includes an ISO exportedAt timestamp', () => {
    const before = Date.now();
    const data = buildExportData([], {});
    const after  = Date.now();
    const ts = new Date(data.exportedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('assigns 1-based running order numbers', () => {
    const data = buildExportData(CONTESTANTS, {});
    expect(data.contestants[0].order).toBe(1);
    expect(data.contestants[1].order).toBe(2);
    expect(data.contestants[2].order).toBe(3);
  });

  it('maps contestant fields correctly', () => {
    const data = buildExportData(CONTESTANTS, {});
    expect(data.contestants[0]).toMatchObject({
      country: 'Sweden',
      countryCode: 'SE',
      artist: 'FELICIA',
      song: 'My System',
    });
  });

  it('includes a score of null when no score has been set', () => {
    const data = buildExportData(CONTESTANTS, {});
    data.contestants.forEach(c => expect(c.score).toBeNull());
  });

  it('includes scores from the score map', () => {
    const scoreMap = { Sweden: { score: 9.5, notes: 'incredible' } };
    const data = buildExportData(CONTESTANTS, scoreMap);
    expect(data.contestants[0].score).toBe(9.5);
    expect(data.contestants[0].notes).toBe('incredible');
  });

  it('leaves notes as empty string when not set', () => {
    const scoreMap = { France: { score: 7 } };
    const data = buildExportData(CONTESTANTS, scoreMap);
    const france = data.contestants.find(c => c.country === 'France');
    expect(france.notes).toBe('');
  });

  it('outputs the same number of entries as the input list', () => {
    const data = buildExportData(CONTESTANTS, {});
    expect(data.contestants).toHaveLength(CONTESTANTS.length);
  });

  it('handles an empty contestant list', () => {
    const data = buildExportData([], {});
    expect(data.contestants).toEqual([]);
  });
});
