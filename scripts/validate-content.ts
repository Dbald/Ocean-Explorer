/**
 * Content validation.
 *   npm run validate:content   structural checks; lists records awaiting review
 *   npm run release-check      also fails if any record or relationship is unreviewed
 */
import { content } from '../src/content/index.ts';
import { validateContent } from '../src/content/validate.ts';

const release = process.argv.includes('--release');
const { errors, pendingReview } = validateContent(content, { release });

if (!release && pendingReview.length > 0) {
  console.log(`${pendingReview.length} record(s) awaiting scientific review (blocks release, not development):`);
  for (const p of pendingReview) console.log(`  · ${p}`);
}

if (errors.length > 0) {
  console.error(`\n${release ? 'Release check' : 'Content validation'} failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(release ? '\nRelease check passed.' : '\nContent structure is valid.');
