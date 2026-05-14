const fs   = require('fs');
const path = require('path');

const contestants = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/contestants.json'), 'utf8')
);

const REQUIRED_FIELDS = ['country', 'countryCode', 'artist', 'song', 'status'];
const VALID_STATUSES  = new Set(['auto', 'sf1', 'sf2', 'host']);
const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

describe('contestants.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(contestants)).toBe(true);
    expect(contestants.length).toBeGreaterThan(0);
  });

  it('has exactly one host entry', () => {
    const hosts = contestants.filter(c => c.status === 'host');
    expect(hosts).toHaveLength(1);
    expect(hosts[0].country).toBe('Austria');
  });

  it('has no duplicate country names', () => {
    const names = contestants.map(c => c.country);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('has no duplicate country codes', () => {
    const codes = contestants.map(c => c.countryCode);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('contains the four automatic qualifiers', () => {
    const autos = contestants.filter(c => c.status === 'auto').map(c => c.country);
    expect(autos).toContain('France');
    expect(autos).toContain('Germany');
    expect(autos).toContain('Italy');
    expect(autos).toContain('United Kingdom');
  });

  describe('every entry', () => {
    contestants.forEach(c => {
      describe(`${c.country}`, () => {
        REQUIRED_FIELDS.forEach(field => {
          it(`has a non-empty "${field}" field`, () => {
            expect(c[field]).toBeDefined();
            expect(typeof c[field]).toBe('string');
            expect(c[field].trim().length).toBeGreaterThan(0);
          });
        });

        it('has a valid two-letter uppercase country code', () => {
          expect(COUNTRY_CODE_RE.test(c.countryCode)).toBe(true);
        });

        it('has a recognised status', () => {
          expect(VALID_STATUSES.has(c.status)).toBe(true);
        });
      });
    });
  });
});
