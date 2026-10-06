import { describe, expect, it } from 'vitest';
import { connectItems, exitQuestions, stepIds } from '../../src/content/lesson.ts';
import { organisms } from '../../src/content/organisms.ts';
import { activitySummary, choice, hydrate, initialState, reduce, type Action, type LessonState } from '../../src/lesson/controller.ts';

const run = (actions: Action[], from: LessonState = initialState()) => actions.reduce(reduce, from);
const lesson = () => run([{ type: 'start', mode: 'lesson' }]);
const status = (s: LessonState, id: string) => activitySummary(s).find((a) => a.id === id)?.status;

describe('lesson navigation', () => {
  it('starts a lesson at the briefing on the reef', () => {
    const s = lesson();
    expect(s.mode).toBe('lesson');
    expect(s.step).toBe('briefing');
    expect(s.stop).toBe('reef');
  });

  it('moves forward and back through every step without overshooting', () => {
    let s = lesson();
    for (let i = 1; i < stepIds.length; i++) {
      s = reduce(s, { type: 'next' });
      expect(s.step).toBe(stepIds[i]);
    }
    expect(reduce(s, { type: 'next' }).step).toBe('recap');
    for (let i = stepIds.length - 2; i >= 0; i--) s = reduce(s, { type: 'back' });
    expect(s.step).toBe('briefing');
    expect(reduce(s, { type: 'back' }).step).toBe('briefing');
  });

  it('jumps directly to a step and closes any open card', () => {
    const s = run([{ type: 'selectOrganism', id: 'queen-conch' }, { type: 'goto', step: 'investigate' }], lesson());
    expect(s.step).toBe('investigate');
    expect(s.selectedOrganism).toBeNull();
    expect(s.stop).toBe('reef');
  });
});

describe('explore and organism inspection', () => {
  it('records visited stops and discovered organisms once each', () => {
    const s = run(
      [
        { type: 'visitStop', stop: 'seagrass' },
        { type: 'selectOrganism', id: 'green-sea-turtle' },
        { type: 'selectOrganism', id: null },
        { type: 'selectOrganism', id: 'green-sea-turtle' },
        { type: 'visitStop', stop: 'sand' },
      ],
      lesson(),
    );
    expect(s.visitedStops).toEqual(['reef', 'seagrass', 'sand']);
    expect(s.discovered).toEqual(['green-sea-turtle']);
    expect(s.selectedOrganism).toBeNull(); // changing stop closes the card
  });

  it('marks Explore completed only when all five organisms are observed', () => {
    let s = lesson();
    expect(status(s, 'explore')).toBe('skipped');
    s = reduce(s, { type: 'selectOrganism', id: organisms[0].id });
    expect(status(s, 'explore')).toBe('attempted');
    for (const o of organisms) s = reduce(s, { type: 'selectOrganism', id: o.id });
    expect(status(s, 'explore')).toBe('completed');
  });

  it('starting a guided lesson from Explore begins from a known, clean state', () => {
    const explored = run([
      { type: 'start', mode: 'explore' },
      { type: 'visitStop', stop: 'sand' },
      { type: 'selectOrganism', id: 'queen-conch' },
    ]);
    const s = reduce(explored, { type: 'start', mode: 'lesson' });
    expect(s).toEqual({ ...initialState(), mode: 'lesson', visitedStops: ['reef'] });
  });
});

describe('food-web challenge', () => {
  const item = connectItems[0];
  const wrong = item.options.find((o) => !o.correct)!;
  const right = item.options.find((o) => o.correct)!;

  it('gives feedback on an incorrect answer and allows a retry', () => {
    let s = run([
      { type: 'chooseOption', item: item.id, option: wrong.id },
      { type: 'submitChoice', item: item.id },
    ], lesson());
    expect(choice(s, item.id)).toMatchObject({ submitted: true, correct: false, tries: 1 });
    expect(status(s, item.id)).toBe('attempted');
    // Locked until retry.
    expect(reduce(s, { type: 'chooseOption', item: item.id, option: right.id })).toBe(s);
    s = run([
      { type: 'retryChoice', item: item.id },
      { type: 'chooseOption', item: item.id, option: right.id },
      { type: 'submitChoice', item: item.id },
    ], s);
    expect(choice(s, item.id)).toMatchObject({ submitted: true, correct: true, tries: 2 });
    expect(status(s, item.id)).toBe('completed');
  });

  it('ignores submit with no selection', () => {
    const s = lesson();
    expect(reduce(s, { type: 'submitChoice', item: item.id })).toBe(s);
  });
});

describe('shelter investigation', () => {
  it('requires a recorded prediction before the comparison can be revealed', () => {
    let s = lesson();
    s = reduce(s, { type: 'setShelterView', view: 'after' });
    expect(s.shelter.view).toBe('before');
    expect(reduce(s, { type: 'recordPrediction' })).toBe(s);
    s = run([
      { type: 'choosePrediction', option: 'move' },
      { type: 'recordPrediction' },
      { type: 'setShelterView', view: 'after' },
    ], s);
    expect(s.shelter).toMatchObject({ recorded: true, view: 'after', comparedAfter: true });
    expect(status(s, 'shelter')).toBe('completed');
  });

  it('keeps the before/after comparison reversible and the prediction fixed once recorded', () => {
    const s = run([
      { type: 'choosePrediction', option: 'move' },
      { type: 'recordPrediction' },
      { type: 'setShelterView', view: 'after' },
      { type: 'setShelterView', view: 'before' },
      { type: 'choosePrediction', option: 'nothing' },
    ], lesson());
    expect(s.shelter.view).toBe('before');
    expect(s.shelter.selected).toBe('move');
  });
});

describe('exit questions and recap', () => {
  it('accepts any plausible shelter answer and asks to rethink an implausible one', () => {
    const q = exitQuestions.find((x) => x.kind === 'shelter-reasoning')!;
    const plausible = run([{ type: 'chooseOption', item: q.id, option: 'risk' }, { type: 'submitChoice', item: q.id }], lesson());
    expect(choice(plausible, q.id).correct).toBe(true);
    const implausible = run([{ type: 'chooseOption', item: q.id, option: 'vanish' }, { type: 'submitChoice', item: q.id }], lesson());
    expect(choice(implausible, q.id).correct).toBe(false);
  });

  it('completes the protection choice only after reasons are discussed or scored', () => {
    let s = reduce(lesson(), { type: 'markProtectDiscussed' });
    expect(s.protect.discussed).toBe(false);
    s = reduce(s, { type: 'chooseProtect', choice: 'seagrass' });
    expect(status(s, 'exit-protect')).toBe('attempted');
    expect(status(reduce(s, { type: 'scoreProtect', score: 2 }), 'exit-protect')).toBe('completed');
    expect(status(reduce(s, { type: 'markProtectDiscussed' }), 'exit-protect')).toBe('completed');
  });

  it('never marks a skipped activity as completed', () => {
    let s = lesson();
    for (let i = 0; i < stepIds.length; i++) s = reduce(s, { type: 'next' });
    expect(s.step).toBe('recap');
    expect(activitySummary(s).every((a) => a.status === 'skipped')).toBe(true);
  });

  it('restart clears answers and progress', () => {
    const s = run([
      { type: 'setBaseline', text: 'Food and hiding places' },
      { type: 'selectOrganism', id: 'queen-conch' },
      { type: 'chooseOption', item: connectItems[0].id, option: 'b' },
      { type: 'submitChoice', item: connectItems[0].id },
      { type: 'goto', step: 'explain' },
      { type: 'restart' },
    ], lesson());
    expect(s).toEqual({ ...initialState(), mode: 'lesson', visitedStops: ['reef'] });
  });
});

describe('persistence', () => {
  it('round-trips through JSON and drops the open card', () => {
    const s = run([{ type: 'goto', step: 'connect' }, { type: 'selectOrganism', id: 'queen-conch' }], lesson());
    const restored = hydrate(JSON.parse(JSON.stringify(s)));
    expect(restored.step).toBe('connect');
    expect(restored.discovered).toEqual(['queen-conch']);
    expect(restored.selectedOrganism).toBeNull();
  });

  it('falls back to a clean state for missing, corrupt or old data', () => {
    expect(hydrate(null)).toEqual(initialState());
    expect(hydrate({ version: 0, step: 'explain' })).toEqual(initialState());
    expect(hydrate({ version: 1, step: 'nonsense', stop: 'moon' })).toMatchObject({ step: 'briefing', stop: 'reef' });
  });
});
