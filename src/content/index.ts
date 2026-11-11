import { assets } from './assets.ts';
import { beltSnapshots, changingRecords, littleSteps, olderSteps } from './changing.ts';
import { findables } from './findables.ts';
import { foodRelationships, foodResources, shelterRelationships } from './food.ts';
import { habitats } from './habitats.ts';
import { connectItems, exitQuestions, steps } from './lesson.ts';
import { narration } from './narration.ts';
import { littleOceanSteps, oceanRecords, olderOceanSteps } from './openOcean.ts';
import { deepRecords, littleDeepSteps, olderDeepSteps } from './deepOcean.ts';
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
  changing: changingRecords,
  ocean: oceanRecords,
  deep: deepRecords,
  stepNarrationIds: [
    ...steps.map((s) => s.narrationId),
    ...olderSteps.map((s) => s.narrationId),
    ...littleSteps.map((s) => s.narrationId),
    ...beltSnapshots.map((b) => b.narrationId),
    ...olderOceanSteps.map((s) => s.narrationId),
    ...littleOceanSteps.map((s) => s.narrationId),
    ...olderDeepSteps.map((s) => s.narrationId),
    ...littleDeepSteps.map((s) => s.narrationId),
  ],
};
