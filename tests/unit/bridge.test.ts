import { describe, expect, it } from 'vitest';
import { allowedOrigins, eventsFor, isAllowedOrigin, parseCommand, stepPosition } from '../../src/embed/bridge.ts';
import { stepIds } from '../../src/content/lesson.ts';
import { initialState, reduce, type Action, type LessonState } from '../../src/lesson/controller.ts';

const run = (actions: Action[], from: LessonState = initialState()) => actions.reduce(reduce, from);
const title = (id: string) => `T:${id}`;

describe('Codex bridge: origins', () => {
  const list = allowedOrigins('https://staging.example.org/, ');

  it('trusts the production Codex and configured extras, nothing else', () => {
    expect(isAllowedOrigin('https://dbcodex.netlify.app', list, false)).toBe(true);
    expect(isAllowedOrigin('https://staging.example.org', list, false)).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com', list, false)).toBe(false);
    expect(isAllowedOrigin('https://dbcodex.netlify.app.evil.com', list, false)).toBe(false);
    expect(isAllowedOrigin('null', list, false)).toBe(false);
  });

  it('allows Codex deploy previews, and localhost only in development', () => {
    expect(isAllowedOrigin('https://deploy-preview-12--dbcodex.netlify.app', list, false)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', list, false)).toBe(false);
    expect(isAllowedOrigin('http://localhost:5173', list, true)).toBe(true);
  });
});

describe('Codex bridge: commands', () => {
  it('accepts well-formed commands from the Codex only', () => {
    expect(parseCommand({ source: 'the-codex', type: 'set_labels', on: false })).toEqual({ type: 'set_labels', on: false });
    expect(parseCommand({ source: 'the-codex', type: 'start', mode: 'lesson', resume: true })).toEqual({ type: 'start', mode: 'lesson', resume: true });
    expect(parseCommand({ source: 'the-codex', type: 'go_to_step', step: 'recap' })).toEqual({ type: 'go_to_step', step: 'recap' });
    expect(parseCommand({ source: 'the-codex', type: 'open_panel', panel: 'settings' })).toEqual({ type: 'open_panel', panel: 'settings' });
    expect(parseCommand({ source: 'the-codex', type: 'open_panel', panel: 'cookies' })).toBeNull();
  });

  it('ignores anything malformed or from another source', () => {
    expect(parseCommand(null)).toBeNull();
    expect(parseCommand('set_labels')).toBeNull();
    expect(parseCommand({ type: 'set_labels', on: true })).toBeNull();
    expect(parseCommand({ source: 'the-codex', type: 'set_labels', on: 'yes' })).toBeNull();
    expect(parseCommand({ source: 'the-codex', type: 'start', mode: 'hack' })).toBeNull();
    expect(parseCommand({ source: 'the-codex', type: 'go_to_step', step: 'nowhere' })).toBeNull();
    expect(parseCommand({ source: 'the-codex', type: 'delete_everything' })).toBeNull();
  });
});

describe('Codex bridge: events', () => {
  it('reports the step when a lesson starts and on each move', () => {
    const start = run([{ type: 'start', mode: 'lesson' }]);
    expect(eventsFor(initialState(), start, title)).toEqual([
      { type: 'step_changed', mode: 'lesson', step: 'briefing', index: 0, total: stepIds.length, label: 'Briefing' },
    ]);
    const next = run([{ type: 'next' }], start);
    expect(eventsFor(start, next, title)[0]).toMatchObject({ type: 'step_changed', step: stepIds[1], index: 1 });
  });

  it('marks the lesson complete once, on reaching the last step', () => {
    const start = run([{ type: 'start', mode: 'lesson' }]);
    const last = run([{ type: 'goto', step: stepIds[stepIds.length - 1] }], start);
    const evs = eventsFor(start, last, title);
    expect(evs.map((e) => e.type)).toEqual(['step_changed', 'lesson_completed']);
    // Opening a creature card on the last step is not a second completion.
    const tapped = run([{ type: 'selectOrganism', id: 'nurse-shark' }], last);
    expect(eventsFor(last, tapped, title).some((e) => e.type === 'lesson_completed')).toBe(false);
  });

  it('reports creatures as they are tapped, with their names', () => {
    const start = run([{ type: 'start', mode: 'lesson' }]);
    const tapped = run([{ type: 'selectOrganism', id: 'nurse-shark' }], start);
    expect(eventsFor(start, tapped, title)).toContainEqual({ type: 'organism_selected', id: 'nurse-shark', title: 'T:nurse-shark' });
    const closed = run([{ type: 'selectOrganism', id: null }], tapped);
    expect(eventsFor(tapped, closed, title)).toEqual([]);
  });

  it('says nothing before an activity starts, and has no step outside stepped modes', () => {
    expect(eventsFor(initialState(), initialState(), title)).toEqual([]);
    expect(stepPosition(run([{ type: 'start', mode: 'explore' }]))).toBeNull();
  });
});
