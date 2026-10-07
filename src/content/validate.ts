import type {
  AssetRecord,
  ContentRecord,
  ExitQuestion,
  Findable,
  FoodChoiceItem,
  FoodRelationship,
  FoodResource,
  Habitat,
  NarrationSegment,
  Organism,
  ShelterRelationship,
  Source,
} from './types.ts';

export interface ContentBundle {
  sources: Source[];
  habitats: Habitat[];
  organisms: Organism[];
  foodResources: FoodResource[];
  foodRelationships: FoodRelationship[];
  shelterRelationships: ShelterRelationship[];
  narration: NarrationSegment[];
  assets: AssetRecord[];
  connectItems: FoodChoiceItem[];
  exitQuestions: ExitQuestion[];
  findables: Findable[];
}

export interface ValidationResult {
  errors: string[];
  /** Items that block a release but not development. */
  pendingReview: string[];
}

/** Default organism card copy (role + observe) should stay under roughly this many words. */
export const CARD_WORD_LIMIT = 45;
/** Spotter facts are read aloud to pre-readers, so they stay very short. */
export const SPOTTER_WORD_LIMIT = 22;

/**
 * Structural checks always run. With `release: true`, every content record and
 * every relationship must also be reviewed — unreviewed content fails.
 */
export function validateContent(c: ContentBundle, opts: { release?: boolean } = {}): ValidationResult {
  const errors: string[] = [];
  const pendingReview: string[] = [];

  const sourceIds = new Set(c.sources.map((s) => s.id));
  const habitatIds = new Set(c.habitats.map((h) => h.id));
  const organismIds = new Set(c.organisms.map((o) => o.id));
  const resourceIds = new Set(c.foodResources.map((r) => r.id));
  const narrationIds = new Set(c.narration.map((n) => n.id));
  const assetIds = new Set(c.assets.map((a) => a.id));
  const relationshipIds = new Set(c.foodRelationships.map((r) => r.id));

  const checkUnique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${kind}: duplicate id "${id}"`);
      seen.add(id);
    }
  };
  checkUnique('source', c.sources.map((s) => s.id));
  checkUnique('habitat', c.habitats.map((h) => h.id));
  checkUnique('organism', c.organisms.map((o) => o.id));
  checkUnique('food resource', c.foodResources.map((r) => r.id));
  checkUnique('food relationship', c.foodRelationships.map((r) => r.id));
  checkUnique('asset', c.assets.map((a) => a.id));
  checkUnique('narration', c.narration.map((n) => n.id));

  for (const s of c.sources) {
    if (!/^https:\/\//.test(s.url)) errors.push(`source ${s.id}: url must be https`);
    if (!s.supports.trim()) errors.push(`source ${s.id}: missing "supports" note`);
  }

  const checkRecord = (kind: string, r: ContentRecord) => {
    if (!r.id || !r.title) errors.push(`${kind}: missing id or title`);
    if (!Number.isInteger(r.contentVersion) || r.contentVersion < 1) errors.push(`${kind} ${r.id}: invalid contentVersion`);
    if (r.sources.length === 0) errors.push(`${kind} ${r.id}: needs at least one source`);
    for (const s of r.sources) if (!sourceIds.has(s)) errors.push(`${kind} ${r.id}: unknown source "${s}"`);
    if (r.review.status === 'reviewed' && (!r.review.reviewer || !r.review.date)) {
      errors.push(`${kind} ${r.id}: reviewed records need a reviewer and date`);
    }
    if (r.review.status !== 'reviewed') pendingReview.push(`${kind} ${r.id}`);
  };

  for (const h of c.habitats) {
    checkRecord('habitat', h);
    if (!narrationIds.has(h.narrationId)) errors.push(`habitat ${h.id}: missing narration "${h.narrationId}"`);
    if (!h.accessibleDescription.trim()) errors.push(`habitat ${h.id}: missing accessible description`);
  }

  for (const o of c.organisms) {
    checkRecord('organism', o);
    if (!habitatIds.has(o.habitat)) errors.push(`organism ${o.id}: unknown habitat "${o.habitat}"`);
    for (const h of o.alsoFoundIn ?? []) if (!habitatIds.has(h)) errors.push(`organism ${o.id}: unknown habitat "${h}"`);
    if (!narrationIds.has(o.narrationId)) errors.push(`organism ${o.id}: missing narration "${o.narrationId}"`);
    if (!o.accessibleDescription.trim()) errors.push(`organism ${o.id}: missing accessible description`);
    if (!o.scientificName.trim()) errors.push(`organism ${o.id}: missing scientific name`);
    for (const a of o.assets) if (!assetIds.has(a)) errors.push(`organism ${o.id}: asset "${a}" not in asset register`);
    const words = `${o.role} ${o.observe}`.split(/\s+/).filter(Boolean).length;
    if (words > CARD_WORD_LIMIT) errors.push(`organism ${o.id}: card copy is ${words} words (limit ${CARD_WORD_LIMIT})`);
  }

  for (const r of c.foodResources) checkRecord('food resource', r);

  checkUnique('findable', c.findables.map((f) => f.id));
  for (const f of c.findables) {
    checkRecord('findable', f);
    if (!habitatIds.has(f.habitat)) errors.push(`findable ${f.id}: unknown habitat "${f.habitat}"`);
    if (f.featured && !organismIds.has(f.id)) errors.push(`findable ${f.id}: featured but not a featured organism`);
    if (!narrationIds.has(`spotter-${f.id}`)) errors.push(`findable ${f.id}: missing narration "spotter-${f.id}"`);
    if (!narrationIds.has(`find-${f.id}`)) errors.push(`findable ${f.id}: missing narration "find-${f.id}"`);
    for (const a of f.assets) if (!assetIds.has(a)) errors.push(`findable ${f.id}: asset "${a}" not in asset register`);
    const words = f.line.split(/\s+/).filter(Boolean).length;
    if (words > SPOTTER_WORD_LIMIT) errors.push(`findable ${f.id}: fact is ${words} words (limit ${SPOTTER_WORD_LIMIT})`);
  }
  for (const o of c.organisms) {
    if (!c.findables.some((f) => f.id === o.id)) errors.push(`organism ${o.id}: not in the findables list`);
  }

  const isFood = (id: string) => organismIds.has(id) || resourceIds.has(id);
  for (const r of c.foodRelationships) {
    checkRecord('food relationship', r);
    if (!isFood(r.food)) errors.push(`food relationship ${r.id}: unknown food "${r.food}"`);
    if (!organismIds.has(r.consumer) && !resourceIds.has(r.consumer)) {
      errors.push(`food relationship ${r.id}: unknown consumer "${r.consumer}"`);
    }
    if (r.food === r.consumer) errors.push(`food relationship ${r.id}: food and consumer are the same`);
  }

  for (const r of c.shelterRelationships) {
    checkRecord('shelter relationship', r);
    if (!isFood(r.shelter)) errors.push(`shelter relationship ${r.id}: unknown shelter "${r.shelter}"`);
    if (!isFood(r.user)) errors.push(`shelter relationship ${r.id}: unknown user "${r.user}"`);
  }

  for (const a of c.assets) {
    for (const field of ['creator', 'source', 'license', 'attribution', 'distribution'] as const) {
      if (!a[field]?.trim()) errors.push(`asset ${a.id}: missing ${field}`);
    }
  }

  const checkChoiceItem = (where: string, item: FoodChoiceItem) => {
    if (!relationshipIds.has(item.relationship)) {
      errors.push(`${where}: unknown relationship "${item.relationship}"`);
    }
    const correct = item.options.filter((o) => o.correct).length;
    if (correct !== 1) errors.push(`${where}: needs exactly one correct option (has ${correct})`);
    if (item.options.length < 2) errors.push(`${where}: needs at least two options`);
  };
  c.connectItems.forEach((item) => checkChoiceItem(`connect item ${item.id}`, item));
  if (c.connectItems.length < 2) errors.push('connect: at least two food relationships are required');

  if (c.exitQuestions.length !== 3) errors.push(`exit questions: expected 3, found ${c.exitQuestions.length}`);
  for (const q of c.exitQuestions) {
    if (q.kind === 'food-choice') checkChoiceItem(`exit question ${q.id}`, q.item);
    if (q.kind === 'protection-choice' && q.rubric.length === 0) errors.push(`exit question ${q.id}: missing rubric`);
  }

  if (opts.release) {
    for (const p of pendingReview) errors.push(`${p}: not reviewed — release requires reviewed content`);
  }

  return { errors, pendingReview };
}
