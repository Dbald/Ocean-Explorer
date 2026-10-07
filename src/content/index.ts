import { assets } from './assets.ts';
import { findables } from './findables.ts';
import { foodRelationships, foodResources, shelterRelationships } from './food.ts';
import { habitats } from './habitats.ts';
import { connectItems, exitQuestions } from './lesson.ts';
import { narration } from './narration.ts';
import { organisms } from './organisms.ts';
import { sources } from './sources.ts';
import type { ContentBundle } from './validate.ts';

export const content: ContentBundle = {
  sources,
  habitats,
  organisms,
  foodResources,
  foodRelationships,
  shelterRelationships,
  narration,
  assets,
  connectItems,
  exitQuestions,
  findables,
};
