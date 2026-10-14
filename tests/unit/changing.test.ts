import { describe, expect, it } from 'vitest';
import { CHANGING_LINES, beltSnapshots, changingRecords, litter, littleSteps, olderSteps } from '../../src/content/changing.ts';
import { narrationById } from '../../src/content/narration.ts';
import { sourceById } from '../../src/content/sources.ts';
import { changingSummary, hydrate, initialState, reduce, type Action, type LessonState } from '../../src/lesson/controller.ts';
import { mapStateFor, modelCaption, remainingLitter } from '../../src/ui/changingViews.ts';

const run = (actions: Action[], from: LessonState = initialState()) => actions.reduce(reduce, from);
const older = () => run([{ type: 'startChanging', level: 'older' }]);
const little = () => run([{ type: 'startChanging', level: 'little' }]);
const status = (s: LessonState, id: string) => changingSummary(s).find((a) => a.id === id)?.status;
const gotoKind = (s: LessonState, kind: string) => run([{ type: 'chGoto', step: (s.changing.level === 'little' ? littleSteps : olderSteps).findIndex((x) => x.kind === kind) }], s);

describe('Expedition 2 content', () => {
  it('has narration for every step and line, and sources for every record', () => {
    for (const st of [...olderSteps, ...littleSteps]) expect(narrationById.has(st.narrationId)).toBe(true);
    for (const id of Object.keys(CHANGING_LINES)) expect(narrationById.get(id)?.text).toBe(CHANGING_LINES[id]);
    for (const r of changingRecords) {
      expect(r.sources.length).toBeGreaterThan(0);
      for (const src of r.sources) expect(sourceById.has(src)).toBe(true);
    }
  });

  it('draws the belt bigger each year, with 2018 to scale against the 2025 record', () => {
    const amounts = beltSnapshots.map((b) => b.amount);
    expect(amounts[0]).toBeLessThan(amounts[1]);
    expect(amounts[1]).toBeCloseTo(20 / 38);
    expect(amounts[2]).toBe(1);
  });
});

describe('Expedition 2: Grades 3–6', () => {
  it('starts at the briefing with every cause on and nothing done', () => {
    const s = older();
    expect(s.mode).toBe('changing');
    expect(s.changing.step).toBe(0);
    expect(s.changing.causes).toEqual({ nutrients: true, warm: true, currents: true });
    expect(changingSummary(s).every((a) => a.status === 'skipped')).toBe(true);
  });

  it('clamps step navigation to the level’s steps', () => {
    expect(run([{ type: 'chGoto', step: 99 }], older()).changing.step).toBe(olderSteps.length - 1);
    expect(run([{ type: 'chGoto', step: -3 }], older()).changing.step).toBe(0);
    expect(run([{ type: 'chGoto', step: 99 }], little()).changing.step).toBe(littleSteps.length - 1);
  });

  it('completes the belt only after all three years are compared', () => {
    let s = gotoKind(older(), 'belt');
    s = run([{ type: 'chBelt', index: 2 }], s);
    expect(status(s, 'belt')).toBe('attempted');
    s = run([{ type: 'chBelt', index: 1 }], s);
    expect(status(s, 'belt')).toBe('completed');
    expect(mapStateFor(s)?.badge).toBe(beltSnapshots[1].label);
  });

  it('needs a prediction before the research is revealed', () => {
    let s = gotoKind(older(), 'causes');
    expect(run([{ type: 'chReveal' }], s).changing.revealed).toBe(false);
    s = run([{ type: 'chPredict', option: 'warm' }, { type: 'chReveal' }], s);
    expect(s.changing.revealed).toBe(true);
    expect(status(s, 'causes')).toBe('completed');
    // The prediction is locked once shared.
    expect(run([{ type: 'chPredict', option: 'nutrients' }], s).changing.prediction).toBe('warm');
  });

  it('models the causes: no nutrients means much less, no currents means it never reaches Belize', () => {
    let s = gotoKind(older(), 'causes');
    s = run([{ type: 'chPredict', option: 'unsure' }, { type: 'chReveal' }], s);
    const all = mapStateFor(s)!;
    expect(all.reach).toBe(true);
    expect(all.badge).toBe('Simplified example');
    const noNutrients = mapStateFor(run([{ type: 'chToggleCause', cause: 'nutrients' }], s))!;
    expect(noNutrients.amount).toBeLessThan(all.amount / 2);
    const noCurrents = mapStateFor(run([{ type: 'chToggleCause', cause: 'currents' }], s))!;
    expect(noCurrents.reach).toBe(false);
    expect(modelCaption({ nutrients: true, warm: true, currents: false })).toMatch(/doesn’t reach Belize/);
  });

  it('shows no map outside the belt and causes steps', () => {
    expect(mapStateFor(older())).toBeNull();
    expect(mapStateFor(gotoKind(older(), 'reef'))).toBeNull();
  });

  it('cleans each piece of trash once, and ignores unknown ids', () => {
    let s = gotoKind(older(), 'reef');
    s = run([{ type: 'chClean', id: 'litter-1' }, { type: 'chClean', id: 'litter-1' }, { type: 'chClean', id: 'nope' }], s);
    expect(s.changing.cleaned).toEqual(['litter-1']);
    expect(remainingLitter(s)).toHaveLength(litter.length - 1);
    expect(status(s, 'cleanup')).toBe('attempted');
    s = run(litter.map((l) => ({ type: 'chClean', id: l.id }) as Action), s);
    expect(status(s, 'cleanup')).toBe('completed');
  });

  it('marks the reef comparison seen once the sargassum is shown', () => {
    let s = gotoKind(older(), 'reef');
    s = run([{ type: 'chSargassum', on: true }, { type: 'chSargassum', on: false }], s);
    expect(s.changing.sargassum).toBe(false);
    expect(status(s, 'reef')).toBe('completed');
  });

  it('checks the exit questions and the discussion question', () => {
    let s = gotoKind(older(), 'explain');
    s = run([{ type: 'chooseOption', item: 'ch-exit-nutrients', option: 'b' }, { type: 'submitChoice', item: 'ch-exit-nutrients' }], s);
    expect(status(s, 'ch-exit-nutrients')).toBe('attempted');
    s = run([{ type: 'retryChoice', item: 'ch-exit-nutrients' }, { type: 'chooseOption', item: 'ch-exit-nutrients', option: 'a' }, { type: 'submitChoice', item: 'ch-exit-nutrients' }], s);
    expect(status(s, 'ch-exit-nutrients')).toBe('completed');
    s = run([{ type: 'chooseOption', item: 'ch-exit-twist', option: 'b' }, { type: 'submitChoice', item: 'ch-exit-twist' }], s);
    expect(status(s, 'ch-exit-twist')).toBe('completed');
    expect(run([{ type: 'chDiscussed' }], s).changing.actionDiscussed).toBe(false);
    s = run([{ type: 'chAction', id: 'nutrients' }], s);
    expect(status(s, 'ch-exit-action')).toBe('attempted');
    s = run([{ type: 'chDiscussed' }], s);
    expect(status(s, 'ch-exit-action')).toBe('completed');
  });
});

describe('Expedition 2: Little Explorers', () => {
  it('has its own short sequence and recap', () => {
    const s = little();
    expect(s.changing.level).toBe('little');
    expect(changingSummary(s).map((a) => a.id)).toEqual(['cleanup', 'seaweed', 'helpers']);
  });

  it('collects helper ideas once each', () => {
    let s = run([{ type: 'chHelper', id: 'bin' }, { type: 'chHelper', id: 'bin' }], little());
    expect(s.changing.helpers).toEqual(['bin']);
    expect(status(s, 'helpers')).toBe('attempted');
    s = run([{ type: 'chHelper', id: 'look' }], s);
    expect(status(s, 'helpers')).toBe('completed');
  });

  it('survives a refresh', () => {
    const s = run([{ type: 'chGoto', step: 1 }, { type: 'chClean', id: 'litter-3' }], little());
    const back = hydrate(JSON.parse(JSON.stringify(s)));
    expect(back.mode).toBe('changing');
    expect(back.changing.level).toBe('little');
    expect(back.changing.step).toBe(1);
    expect(back.changing.cleaned).toEqual(['litter-3']);
  });
});
