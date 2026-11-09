import { describe, expect, it } from 'vitest';
import { OCEAN_LINES, chainLinks, feedItems, littleOceanSteps, oceanAnimals, oceanRecords, olderOceanSteps, plankton, raftFinds } from '../../src/content/openOcean.ts';
import { narrationById } from '../../src/content/narration.ts';
import { sourceById } from '../../src/content/sources.ts';
import { hydrate, initialState, oceanSummary, reduce, type Action, type LessonState } from '../../src/lesson/controller.ts';

const run = (actions: Action[], from: LessonState = initialState()) => actions.reduce(reduce, from);
const older = () => run([{ type: 'startOcean', level: 'older' }]);
const little = () => run([{ type: 'startOcean', level: 'little' }]);
const status = (s: LessonState, id: string) => oceanSummary(s).find((a) => a.id === id)?.status;
const gotoKind = (s: LessonState, kind: string) =>
  run([{ type: 'ocGoto', step: (s.ocean.level === 'little' ? littleOceanSteps : olderOceanSteps).findIndex((x) => x.kind === kind) }], s);

describe('Expedition 3 content', () => {
  it('has narration for every step and line, and sources for every record', () => {
    for (const st of [...olderOceanSteps, ...littleOceanSteps]) expect(narrationById.has(st.narrationId), st.narrationId).toBe(true);
    for (const id of Object.keys(OCEAN_LINES)) expect(narrationById.get(id)?.text).toBe(OCEAN_LINES[id]);
    for (const r of oceanRecords) {
      expect(r.sources.length, r.id).toBeGreaterThan(0);
      for (const src of r.sources) expect(sourceById.has(src), `${r.id}: ${src}`).toBe(true);
    }
  });

  it('gives every animal and plankton a short read-aloud line', () => {
    for (const a of [...oceanAnimals, ...plankton]) expect(a.line.split(/\s+/).length, a.id).toBeLessThanOrEqual(24);
  });
});

describe('Expedition 3: Grades 3–6', () => {
  it('starts in open water with nothing done', () => {
    const s = older();
    expect(s.mode).toBe('ocean');
    expect(s.ocean.stop).toBe('blue');
    expect(oceanSummary(s).every((a) => a.status === 'skipped')).toBe(true);
  });

  it('ignores Expedition 3 actions outside the expedition', () => {
    const s = run([{ type: 'start', mode: 'explore' }, { type: 'ocMeet', id: 'whale-shark' }]);
    expect(s.ocean.met).toEqual([]);
  });

  it('completes the dive with every plankton and three animals', () => {
    let s = gotoKind(older(), 'dive');
    s = run([{ type: 'ocMagnifier', open: true }, ...plankton.map((p) => ({ type: 'ocPlankton', id: p.id }) as Action)], s);
    expect(status(s, 'dive')).toBe('attempted');
    s = run([{ type: 'ocMeet', id: 'whale-shark' }, { type: 'ocMeet', id: 'mahi-mahi' }, { type: 'ocMeet', id: 'whale-shark' }, { type: 'ocMeet', id: 'nope' }], s);
    expect(s.ocean.met).toEqual(['whale-shark', 'mahi-mahi']);
    s = run([{ type: 'ocMeet', id: 'cubera-snapper' }], s);
    expect(status(s, 'dive')).toBe('completed');
  });

  it('builds the food chain only in order, remembering a wrong card', () => {
    let s = gotoKind(older(), 'chain');
    s = run([{ type: 'ocChain', id: 'mahi-mahi' }], s);
    expect(s.ocean.chain).toEqual([]);
    expect(s.ocean.chainMiss).toBe('mahi-mahi');
    expect(status(s, 'chain')).toBe('attempted');
    s = run(chainLinks.map((l) => ({ type: 'ocChain', id: l.id }) as Action), s);
    expect(s.ocean.chain).toEqual(chainLinks.map((l) => l.id));
    expect(s.ocean.chainMiss).toBeNull();
    expect(status(s, 'chain')).toBe('completed');
    // Nothing comes after the last link.
    expect(run([{ type: 'ocChain', id: 'phytoplankton' }], s).ocean.chain).toHaveLength(chainLinks.length);
  });

  it('needs a prediction before the spawning model can be tested', () => {
    let s = gotoKind(older(), 'spawn');
    expect(run([{ type: 'ocReveal' }], s).ocean.revealed).toBe(false);
    expect(run([{ type: 'ocSpawn', on: true }], s).ocean.spawning).toBe(false);
    s = run([{ type: 'ocPredict', option: 'warm' }, { type: 'ocReveal' }], s);
    expect(status(s, 'spawn')).toBe('attempted');
    s = run([{ type: 'ocSpawn', on: true }, { type: 'ocSpawn', on: false }], s);
    expect(s.ocean.spawning).toBe(false);
    expect(status(s, 'spawn')).toBe('completed');
    // The prediction is locked once shared.
    expect(run([{ type: 'ocPredict', option: 'snappers' }], s).ocean.prediction).toBe('warm');
  });

  it('checks the exit questions and the discussion question', () => {
    let s = gotoKind(older(), 'explain');
    s = run([{ type: 'chooseOption', item: 'oc-exit-base', option: 'b' }, { type: 'submitChoice', item: 'oc-exit-base' }], s);
    expect(status(s, 'oc-exit-base')).toBe('attempted');
    s = run([{ type: 'retryChoice', item: 'oc-exit-base' }, { type: 'chooseOption', item: 'oc-exit-base', option: 'a' }, { type: 'submitChoice', item: 'oc-exit-base' }], s);
    expect(status(s, 'oc-exit-base')).toBe('completed');
    s = run([{ type: 'chooseOption', item: 'oc-exit-gladden', option: 'b' }, { type: 'submitChoice', item: 'oc-exit-gladden' }], s);
    expect(status(s, 'oc-exit-gladden')).toBe('completed');
    expect(run([{ type: 'ocDiscussed' }], s).ocean.actionDiscussed).toBe(false);
    s = run([{ type: 'ocAction', id: 'spawning' }, { type: 'ocDiscussed' }], s);
    expect(status(s, 'oc-exit-action')).toBe('completed');
  });
});

describe('Expedition 3: Little Explorers', () => {
  it('has its own short sequence and recap', () => {
    expect(oceanSummary(little()).map((a) => a.id)).toEqual(['tiny', 'feed', 'raft']);
  });

  it('feeds the whale shark: every tap counts, and only real food completes it', () => {
    let s = gotoKind(little(), 'feed');
    s = run([{ type: 'ocFeed', id: 'bottle' }], s);
    expect(s.ocean.lastFeed).toBe('bottle');
    expect(status(s, 'feed')).toBe('attempted');
    s = run(feedItems.filter((f) => f.food).map((f) => ({ type: 'ocFeed', id: f.id }) as Action), s);
    expect(status(s, 'feed')).toBe('completed');
  });

  it('finds who is hiding in the raft, and nothing else', () => {
    let s = gotoKind(little(), 'raft');
    s = run([{ type: 'ocFind', id: 'whale-shark' }, ...raftFinds.map((id) => ({ type: 'ocFind', id }) as Action)], s);
    expect(s.ocean.found).toEqual(raftFinds);
    expect(status(s, 'raft')).toBe('completed');
  });

  it('survives a refresh, with the magnifier closed', () => {
    const s = run([{ type: 'ocGoto', step: 1 }, { type: 'ocMagnifier', open: true }, { type: 'ocPlankton', id: 'diatom' }], little());
    const back = hydrate(JSON.parse(JSON.stringify(s)));
    expect(back.mode).toBe('ocean');
    expect(back.ocean.level).toBe('little');
    expect(back.ocean.step).toBe(1);
    expect(back.ocean.seenPlankton).toEqual(['diatom']);
    expect(back.ocean.magnifier).toBe(false);
  });
});
