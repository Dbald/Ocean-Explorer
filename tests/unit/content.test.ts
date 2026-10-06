import { describe, expect, it } from 'vitest';
import { content } from '../../src/content/index.ts';
import { exitQuestions, steps } from '../../src/content/lesson.ts';
import { existsSync } from 'node:fs';
import { narrationById } from '../../src/content/narration.ts';
import { narrationAudioSrc, recordedNarration } from '../../src/content/recordings.ts';
import { cardWordCount, organisms } from '../../src/content/organisms.ts';
import { CARD_WORD_LIMIT, validateContent, type ContentBundle } from '../../src/content/validate.ts';

const reviewed = { status: 'reviewed' as const, reviewer: 'Test reviewer', date: '2026-10-06' };
function markAllReviewed(c: ContentBundle): ContentBundle {
  const r = <T extends { review: unknown }>(xs: T[]) => xs.map((x) => ({ ...x, review: reviewed }));
  return {
    ...c,
    habitats: r(c.habitats),
    organisms: r(c.organisms),
    foodResources: r(c.foodResources),
    foodRelationships: r(c.foodRelationships),
    shelterRelationships: r(c.shelterRelationships),
  };
}

describe('content structure', () => {
  it('passes structural validation', () => {
    expect(validateContent(content).errors).toEqual([]);
  });

  it('has five featured organisms across three habitat stops', () => {
    expect(organisms).toHaveLength(5);
    expect(new Set(organisms.map((o) => o.habitat))).toEqual(new Set(['reef', 'seagrass', 'sand']));
  });

  it(`keeps default card copy under ${CARD_WORD_LIMIT} words`, () => {
    for (const o of organisms) expect(cardWordCount(o), o.id).toBeLessThanOrEqual(CARD_WORD_LIMIT);
  });

  it('has three exit questions, including a rubric for open reasoning', () => {
    expect(exitQuestions.map((q) => q.kind)).toEqual(['food-choice', 'shelter-reasoning', 'protection-choice']);
  });

  it('has narration (and therefore captions and transcript) for every step', () => {
    for (const s of steps) expect(narrationById.get(s.narrationId)?.text, s.id).toBeTruthy();
  });

  it('never presents the food relationships as one linear chain', () => {
    // No organism is both eaten and eating within the featured set, so the edges cannot form a chain.
    const eaten = new Set(content.foodRelationships.map((r) => r.food));
    const eaters = new Set(content.foodRelationships.map((r) => r.consumer));
    expect([...eaten].filter((x) => eaters.has(x))).toEqual([]);
  });
});

describe('recorded narration', () => {
  it('lists only real narration segments, each with its audio file present', () => {
    for (const id of recordedNarration) {
      expect(narrationById.has(id), id).toBe(true);
      expect(existsSync(`public/${narrationAudioSrc(id)}`), id).toBe(true);
    }
  });
});

describe('release gate', () => {
  it('blocks release while any record or relationship is unreviewed', () => {
    const result = validateContent(content, { release: true });
    expect(result.errors.some((e) => e.includes('fr-seagrass-turtle') && e.includes('not reviewed'))).toBe(true);
  });

  it('passes once everything is reviewed with a reviewer and date', () => {
    expect(validateContent(markAllReviewed(content), { release: true }).errors).toEqual([]);
  });

  it('rejects a "reviewed" record without a reviewer', () => {
    const c = markAllReviewed(content);
    c.foodRelationships = c.foodRelationships.map((r, i) => (i === 0 ? { ...r, review: { status: 'reviewed' } } : r));
    expect(validateContent(c, { release: true }).errors.join()).toMatch(/reviewer and date/);
  });

  it('catches broken references and unregistered assets', () => {
    const c: ContentBundle = {
      ...content,
      foodRelationships: [{ ...content.foodRelationships[0], consumer: 'kraken' }],
      organisms: [{ ...content.organisms[0], assets: ['mystery.glb'] }, ...content.organisms.slice(1)],
    };
    const errors = validateContent(c).errors.join('\n');
    expect(errors).toMatch(/unknown consumer "kraken"/);
    expect(errors).toMatch(/asset "mystery.glb" not in asset register/);
  });
});
