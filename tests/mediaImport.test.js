import { describe, it, expect } from 'vitest';
import { parseMediaMapping, matchMediaMapping, exerciseIndexCsv } from '../src/lib/mediaImport';
import { builtinLibrary } from '../src/data/library';

const lib = builtinLibrary();
describe('media mapping import', () => {
  it('parses a markdown table, matching by id and by English name', () => {
    const md = `| id | name | url | start | source | verified |
|---|---|---|---|---|---|
| hip_cars | Hip CARs | https://www.youtube.com/watch?v=abcdefghijk | 0:12 | Physio Channel | 2025-02-01 |
| | Couch stretch | https://youtu.be/zzzzzzzzzzz | | | |
| nonexistent_move | Mystery | https://www.youtube.com/watch?v=qqqqqqqqqqq | | | |`;
    const r = matchMediaMapping(parseMediaMapping(md), lib);
    expect(r.matched.map((m) => m.exercise.id)).toEqual(['hip_cars', 'couch_stretch']);
    expect(r.matched[0].media).toMatchObject({ start: 12, source: 'Physio Channel', verified: '2025-02-01' });
    expect(r.matched[1].media.verified).toBeNull(); // never marked verified unless the file says so
    expect(r.unmatched).toHaveLength(1);
  });
  it('parses CSV, JSON and "id: url" lines', () => {
    expect(matchMediaMapping(parseMediaMapping('id,url\nplank,https://www.youtube.com/watch?v=aaaaaaaaaaa'), lib).matched[0].exercise.id).toBe('plank');
    expect(matchMediaMapping(parseMediaMapping('{"wall_sit":"https://www.youtube.com/watch?v=bbbbbbbbbbb"}'), lib).matched[0].exercise.id).toBe('wall_sit');
    expect(matchMediaMapping(parseMediaMapping('- cat_cow: https://www.youtube.com/watch?v=ccccccccccc'), lib).matched[0].exercise.id).toBe('cat_cow');
  });
  it('rejects malformed links instead of guessing', () => {
    const r = matchMediaMapping([{ id: 'plank', url: 'not a url' }], lib);
    expect(r.invalid).toHaveLength(1);
    expect(r.matched).toHaveLength(0);
  });
  it('index csv lists every exercise', () => {
    expect(exerciseIndexCsv(lib).split('\n')).toHaveLength(lib.length + 1);
  });
});
