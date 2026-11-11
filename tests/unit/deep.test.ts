import { describe, expect, it } from 'vitest';
import { DEEP_LINES, deepAnimals, deepRecords, glowFinds, littleDeepSteps, olderDeepSteps, zoneClues, zones } from '../../src/content/deepOcean.ts';
import { narrationById } from '../../src/content/narration.ts';
import { sourceById } from '../../src/content/sources.ts';
import { deepSummary, hydrate, initialState, reduce, type Action, type LessonState } from '../../src/lesson/controller.ts';

const run = (actions: Action[], from: LessonState = initialState()) => actions.reduce(reduce, from);
const older = () => run([{ type: 'startDeep', level: 'older' }]);
const little = () => run([{ type: 'startDeep', level: 'little' }]);
const status = (s: LessonState, id: string) => deepSummary(s).find((a) => a.id === id)?.status;
const gotoKind = (s: LessonState, kind: string) =>
  run([{ type: 'dzGoto', step: (s.deep.level === 'little' ? littleDeepSteps : olderDeepSteps).findIndex((x) => x.kind === kind) }], s);

describe('Expedition 4 content', () => {
  it('has narration for every step and line, and sources for every record', () => {
    for (const st of [...olderDeepSteps, ...littleDeepSteps]) expect(narrationById.has(st.narrationId), st.narrationId).toBe(true);
    for (const id of Object.keys(DEEP_LINES)) expect(narrationById.get(id)?.text).toBe(DEEP_LINES[id]);
    for (const r of deepRecords) {
      expect(r.sources.length, r.id).toBeGreaterThan(0);
      for (const src of r.sources) expect(sourceById.has(src), `${r.id}: ${src}`).toBe(true);
    }
  });

  it('keeps read-aloud lines short, puts animals in every zone, and only hunts animals that glow', () => {
    for (const a of deepAnimals) expect(a.line.split(/\s+/).length, a.id).toBeLessThanOrEqual(24);
    for (const z of zones) expect(deepAnimals.some((a) => a.zone === z.id), z.id).toBe(true);
    for (const id of glowFinds) expect(deepAnimals.find((a) => a.id === id)?.glows, id).toBe(true);
    for (const z of zones) expect(zoneClues.some((c) => c.zone === z.id), z.id).toBe(true);
  });
});

describe('Expedition 4: Grades 3–6', () => {
  it('starts in the sunlight zone with nothing done', () => {
    const s = older();
    expect(s.mode).toBe('deep');
    expect(s.deep.zone).toBe('sunlight');
    expect(s.deep.lights).toBe(true);
    expect(deepSummary(s).every((a) => a.status === 'skipped')).toBe(true);
  });

  it('ignores Expedition 4 actions outside the expedition', () => {
    const s = run([{ type: 'startOcean', level: 'older' }, { type: 'dzMeet', id: 'anglerfish' }]);
    expect(s.deep.met).toEqual([]);
  });

  it('completes the dive after all three zones and three animals', () => {
    let s = gotoKind(older(), 'descend');
    s = run([{ type: 'dzMeet', id: 'diving-whale-shark' }, { type: 'dzZone', zone: 'twilight' }, { type: 'dzMeet', id: 'lanternfish' }, { type: 'dzMeet', id: 'nope' }], s);
    expect(s.deep.met).toEqual(['diving-whale-shark', 'lanternfish']);
    expect(status(s, 'descend')).toBe('attempted');
    s = run([{ type: 'dzZone', zone: 'midnight' }, { type: 'dzMeet', id: 'anglerfish' }], s);
    expect(s.deep.visited).toEqual(['sunlight', 'twilight', 'midnight']);
    expect(status(s, 'descend')).toBe('completed');
  });

  it('sorts each clue only into its right zone, remembering a wrong try', () => {
    let s = gotoKind(older(), 'sort');
    s = run([{ type: 'dzSort', clue: 'cold', zone: 'sunlight' }], s);
    expect(s.deep.sorted).toEqual({});
    expect(s.deep.sortMiss).toEqual({ clue: 'cold', zone: 'sunlight' });
    expect(status(s, 'sort')).toBe('attempted');
    s = run(zoneClues.map((c) => ({ type: 'dzSort', clue: c.id, zone: c.zone }) as Action), s);
    expect(s.deep.sortMiss).toBeNull();
    expect(status(s, 'sort')).toBe('completed');
    // A placed card stays placed.
    expect(run([{ type: 'dzSort', clue: 'cold', zone: 'sunlight' }], s).deep.sorted.cold).toBe('midnight');
  });

  it('goes to the midnight zone for lights out, and needs a prediction before the lights go off', () => {
    let s = gotoKind(older(), 'glow');
    expect(s.deep.zone).toBe('midnight');
    expect(run([{ type: 'dzLights', on: false }], s).deep.lights).toBe(true);
    s = run([{ type: 'dzPredict', option: 'hide' }, { type: 'dzReveal' }], s);
    expect(status(s, 'glow')).toBe('attempted');
    s = run([{ type: 'dzLights', on: false }], s);
    expect(status(s, 'glow')).toBe('completed');
    expect(run([{ type: 'dzPredict', option: 'food' }], s).deep.prediction).toBe('hide');
    // Moving on turns our lights back on.
    expect(run([{ type: 'dzGoto', step: s.deep.step + 1 }], s).deep.lights).toBe(true);
  });

  it('checks the exit questions and the discussion question', () => {
    let s = gotoKind(older(), 'explain');
    s = run([{ type: 'chooseOption', item: 'dz-exit-light', option: 'b' }, { type: 'submitChoice', item: 'dz-exit-light' }], s);
    expect(status(s, 'dz-exit-light')).toBe('attempted');
    s = run([{ type: 'retryChoice', item: 'dz-exit-light' }, { type: 'chooseOption', item: 'dz-exit-light', option: 'a' }, { type: 'submitChoice', item: 'dz-exit-light' }], s);
    expect(status(s, 'dz-exit-light')).toBe('completed');
    s = run([{ type: 'chooseOption', item: 'dz-exit-lure', option: 'b' }, { type: 'submitChoice', item: 'dz-exit-lure' }], s);
    expect(status(s, 'dz-exit-lure')).toBe('completed');
    expect(run([{ type: 'dzDiscussed' }], s).deep.actionDiscussed).toBe(false);
    s = run([{ type: 'dzAction', id: 'anglerfish' }, { type: 'dzDiscussed' }], s);
    expect(status(s, 'dz-exit-action')).toBe('completed');
  });
});

describe('Expedition 4: Little Explorers', () => {
  it('has its own short sequence and recap', () => {
    expect(deepSummary(little()).map((a) => a.id)).toEqual(['descend', 'glow']);
  });

  it('dives one zone at a time, and stops at the bottom', () => {
    const s = run([{ type: 'dzDeeper' }, { type: 'dzDeeper' }, { type: 'dzDeeper' }], gotoKind(little(), 'descend'));
    expect(s.deep.zone).toBe('midnight');
    expect(s.deep.visited).toEqual(['sunlight', 'twilight', 'midnight']);
  });

  it('finds glowing animals only with the lights off, and nothing else', () => {
    let s = gotoKind(little(), 'glow');
    expect(run([{ type: 'dzFind', id: 'anglerfish' }], s).deep.found).toEqual([]);
    s = run([{ type: 'dzLights', on: false }, { type: 'dzFind', id: 'marine-snow' }, ...glowFinds.map((id) => ({ type: 'dzFind', id }) as Action)], s);
    expect(s.deep.found).toEqual(glowFinds);
    expect(status(s, 'glow')).toBe('completed');
  });

  it('survives a refresh', () => {
    const s = run([{ type: 'dzGoto', step: 1 }, { type: 'dzDeeper' }, { type: 'dzMeet', id: 'lanternfish' }], little());
    const back = hydrate(JSON.parse(JSON.stringify(s)));
    expect(back.mode).toBe('deep');
    expect(back.deep.level).toBe('little');
    expect(back.deep.zone).toBe('twilight');
    expect(back.deep.met).toEqual(['lanternfish']);
  });
});
