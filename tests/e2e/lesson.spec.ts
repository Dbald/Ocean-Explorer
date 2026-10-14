import { expect, test, type Page } from '@playwright/test';
import { narration } from '../../src/content/narration.ts';

/** Activates a button with the keyboard, proving the full lesson needs no mouse. */
async function press(page: Page, name: string | RegExp) {
  const button = page.getByRole('button', { name, exact: typeof name === 'string' });
  await button.focus();
  await page.keyboard.press('Enter');
}

const dock = (page: Page) => page.locator('#dock');

test('a teacher can run the whole guided lesson with only the keyboard (illustrations)', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Start lesson');
  await expect(page.getByRole('heading', { level: 2 })).toContainText('What makes this reef a home?');

  // Briefing: optional class idea, never names.
  await page.getByLabel(/Class’s first idea/).fill('They need food');
  await press(page, 'We shared our ideas');
  await page.keyboard.press('n');

  // Explore: visit all three stops and inspect all five organisms.
  await expect(dock(page)).toContainText('Visit the reef');
  for (const [stop, names] of [
    ['1. Reef', ['Elkhorn coral', 'Stoplight parrotfish', 'Great barracuda']],
    ['2. Seagrass meadow', ['Green sea turtle']],
    ['3. Sandy seabed', ['Queen conch']],
  ] as const) {
    await press(page, stop);
    for (const name of names) {
      await dock(page).getByRole('button', { name: new RegExp(`^${name}`) }).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#card h2')).toHaveText(name);
      await page.keyboard.press('Escape');
      await expect(page.locator('#card')).toBeHidden();
    }
  }
  await expect(dock(page)).toContainText('Observed 5 of 5');
  await page.keyboard.press('PageDown');

  // Connect: a wrong answer explains and allows retry; then both relationships.
  await press(page, 'Green sea turtle → Seagrass');
  await press(page, 'Submit answer');
  await expect(dock(page).locator('.feedback')).toContainText('Try again');
  await press(page, 'Try again');
  await press(page, 'Seagrass → Green sea turtle');
  await press(page, 'Submit answer');
  await expect(dock(page).locator('.feedback')).toContainText('Correct');
  await press(page, 'Next relationship');
  await press(page, 'Algae → Stoplight parrotfish');
  await press(page, 'Submit answer');
  await expect(dock(page)).toContainText('Each arrow is a separate relationship');
  await page.keyboard.press('n');

  // Investigate: no comparison before a prediction.
  await expect(dock(page).getByRole('button', { name: 'After', exact: true })).toHaveCount(0);
  await press(page, /look for shelter somewhere else/);
  await press(page, 'Record class prediction');
  await expect(dock(page)).toContainText('Simplified example');
  await press(page, 'After');
  await expect(dock(page)).toContainText('may need to find shelter elsewhere');
  await press(page, 'Before');
  await expect(dock(page)).toContainText('many spaces to hide');
  await page.keyboard.press('n');

  // Explain: three exit questions.
  await press(page, 'Algae → Queen conch');
  await press(page, 'Submit answer');
  await press(page, 'Next question');
  await press(page, /find shelter somewhere else/);
  await press(page, 'Share answer');
  await expect(dock(page).locator('.feedback')).toContainText('Reasonable');
  await press(page, 'Next question');
  await press(page, 'The seagrass meadow');
  await expect(dock(page)).toContainText('because adult green sea turtles feed on seagrass');
  await press(page, 'We discussed our reasons');
  await page.keyboard.press('n');

  // Recap separates completed, attempted and skipped work.
  await expect(dock(page)).toContainText('“They need food”');
  await expect(dock(page).locator('.recap-completed .count')).toHaveText('8');
  await expect(dock(page).locator('.recap-skipped .count')).toHaveText('0');

  // Restart clears answers after confirmation.
  await press(page, 'Restart lesson');
  await press(page, 'Restart');
  await expect(page.locator('.step-indicator')).toContainText('Step 1 of 6');
  await expect(page.getByLabel(/Class’s first idea/)).toHaveValue('');
});

test('skipping ahead leaves activities marked as skipped, not completed', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Start lesson');
  await press(page, '6. Recap');
  await expect(dock(page).locator('.recap-completed .count')).toHaveText('0');
  await expect(dock(page).locator('.recap-skipped .count')).toHaveText('8');
});

test('3D reef loads, organisms open from the list, and Return to lesson restores focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#stage canvas')).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
  await press(page, 'Start lesson');
  await press(page, '2. Explore');
  await press(page, 'Stoplight parrotfish');
  await expect(page.locator('#card h2')).toHaveText('Stoplight parrotfish');
  await expect(page.locator('#card')).toContainText('Algae');
  // The camera moves in close so the class can watch the parrotfish's mouth.
  await expect(page.locator('#stage canvas')).toHaveAttribute('data-view', 'closeup:stoplight-parrotfish');
  await page.locator('#card').getByRole('button', { name: 'Return to lesson' }).click();
  await expect(page.locator('#card')).toBeHidden();
  await expect(page.locator('[data-key="instruction"]')).toBeFocused();
  await expect(page.locator('#stage canvas')).toHaveAttribute('data-view', 'reef');
});

test('falls back to illustrations when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Simulate a device without WebGL.
    (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (String(type).startsWith('webgl')) return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    };
  });
  await page.goto('/');
  await expect(page.locator('#notice')).toContainText('Showing illustrations');
  await expect(page.locator('.static-scene svg')).toBeVisible();
  await press(page, 'Start lesson');
  await press(page, '2. Explore');
  await page.locator('.static-scene').getByRole('button', { name: 'Elkhorn coral' }).click();
  await expect(page.locator('#card h2')).toHaveText('Elkhorn coral');
});

test('a refresh offers to resume; Clear session removes saved progress', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Start lesson');
  await press(page, '3. Connect');
  await page.reload();
  await expect(page.getByRole('button', { name: /Resume lesson \(step 3: Connect\)/ })).toBeVisible();
  await press(page, /Resume lesson/);
  await expect(page.locator('.step-indicator')).toContainText('Step 3 of 6');

  await press(page, 'Settings');
  await page.locator('#settings').getByRole('button', { name: 'Clear session' }).click();
  await page.locator('#confirm').getByRole('button', { name: 'Clear session' }).click();
  await expect(page.locator('#notice')).toContainText('Session cleared');
  await page.reload();
  await expect(page.getByRole('button', { name: /Resume/ })).toHaveCount(0);
});

test('the teacher guide is complete and opens from a link', async ({ page }) => {
  await page.goto('/?presentation=static#guide');
  const guide = page.locator('#guide');
  await expect(guide).toBeVisible();
  for (const heading of ['Before class', 'Lesson sequence', 'Can you find…? (great for TK–2)', 'The Changing Reef', 'Grades 3–6 sequence', 'Little Explorers (TK–2) sequence', 'Vocabulary', 'Answers', 'Organisms and relationships', 'Accessibility and classroom controls', 'Transcript', 'Sources and credits']) {
    await expect(guide.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(guide).toContainText('Links an action, a habitat feature and an organism’s need');
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
});

test('missing optional video never blocks the lesson', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Start lesson');
  await expect(page.getByRole('button', { name: /Message from Devin/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next: Explore' })).toBeEnabled();
});

test('settings change text size and persist across reloads', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Settings');
  await press(page, 'Larger text');
  await expect(page.locator('#settings')).toContainText('110%');
  await page.reload();
  const scale = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-scale'));
  expect(scale.trim()).toBe('1.1');
});

test('Explore mode has no task gates and starts a guided lesson from a known state', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Explore');
  await expect(page.locator('.step-indicator')).toHaveText('Explore mode');
  await press(page, '3. Sandy seabed');
  await dock(page).getByRole('button', { name: /^Queen conch/ }).click();
  await expect(page.locator('#card h2')).toHaveText('Queen conch');
  await page.locator('#card').getByRole('button', { name: 'Close card' }).click();
  await press(page, 'Start guided lesson');
  await expect(page.locator('.step-indicator')).toContainText('Step 1 of 6');
  await press(page, '2. Explore');
  await expect(dock(page)).toContainText('Observed 0 of 5');
});

test('the narration recorder lists every line and records a take', async ({ page }) => {
  await page.goto('/?presentation=static#record');
  const rec = page.locator('#recorder');
  await expect(rec.getByRole('heading', { name: 'Record your narration' })).toBeVisible();
  await expect(rec.locator('.rec-line')).toHaveCount(narration.length);
  // Sections already recorded fold away; the first open section is the new animal facts.
  await expect(rec.locator('details.rec-done').first()).toContainText('already in the lesson');
  await rec.locator('section [data-rec="record"]').first().click();
  await expect(rec.getByText('Recording…')).toBeVisible();
  await page.waitForTimeout(600);
  await rec.getByRole('button', { name: 'Stop' }).click();
  await expect(rec.getByRole('link', { name: 'Save file' })).toHaveAttribute('download', /^spotter-elkhorn-coral\./);
  await expect(rec.locator('.rec-progress')).toContainText(`1 of ${narration.length}`);
  await page.keyboard.press('Escape');
  await expect(rec).toBeHidden();
});

test('older classroom-board browsers run the legacy build', async ({ page }) => {
  // Simulate a browser without import.meta.resolve (Chrome < 105): the modern bundle refuses
  // to run, and the legacy bundle must start the app exactly once.
  await page.route(/\/(\?.*)?$|\/assets\/(index|polyfills)-(?!legacy)[^/]*\.js$/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replaceAll('import.meta.resolve', 'import.meta.missingInOldBrowsers');
    await route.fulfill({ response: res, body });
  });
  const legacy = page.waitForResponse(/index-legacy-[^/]*\.js$/);
  await page.goto('/?presentation=static');
  await legacy;
  await expect(page.locator('html')).toHaveAttribute('data-booted', '1');
  await expect(page.locator('#boot-error')).toBeHidden();
  await press(page, 'Start lesson');
  await expect(page.locator('#dock')).toHaveCount(1);
  await expect(page.locator('.step-indicator')).toContainText('Step 1 of 6');
});

test('"Can you find…?" gives every tap a response and moves through the animals', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Can you find…?');
  await expect(page.locator('.step-indicator')).toHaveText('Can you find…?');
  const order: string[] = await page.evaluate(() => JSON.parse(localStorage.getItem('ocean-explorer:session:v1')!).find.order);
  expect(order.length).toBeGreaterThanOrEqual(20);
  const prompt = page.locator('.find-prompt');
  await expect(prompt).toContainText('Can you find the');
  // In the game the picture is the puzzle: tap areas carry no visible names.
  await expect(page.locator('.static-scene .hotspot').first()).toHaveClass(/is-blank/);
  await expect(page.locator('.static-scene .hotspot').first()).toHaveText('');

  // A different animal still says hello, but doesn't count.
  const wrong = await page.locator('.static-scene .hotspot').evaluateAll((els, t) => els.find((e) => (e as HTMLElement).dataset.organism !== t)?.getAttribute('data-organism'), order[0]);
  await page.locator(`.static-scene [data-organism="${wrong}"]`).click();
  await expect(page.locator('.find-feedback')).toContainText('Keep looking');
  await expect(page.locator('.find-dots .is-found')).toHaveCount(0);

  // Hint points out the right one.
  await press(page, 'Hint');
  await expect(page.locator(`.static-scene [data-organism="${order[0]}"]`)).toHaveClass(/is-hint/);

  // The right animal is found, read aloud on screen, and counted.
  await page.locator(`.static-scene [data-organism="${order[0]}"]`).click();
  await expect(prompt).toContainText('You found the');
  await expect(page.locator('.find-line')).not.toBeEmpty();
  await expect(page.locator('.find-dots .is-found')).toHaveCount(1);
  await press(page, 'Next animal');
  await expect(prompt).toContainText('Can you find the');

  // Skipping the rest reaches the end screen with the real-ocean reminder.
  for (let i = 1; i < order.length; i++) await page.locator('#dock [data-action="find-next"]').click();
  await expect(page.locator('#dock')).toContainText('You found 1 animal!');
  await expect(page.locator('#dock')).toContainText('we never touch them');
});

test('bonus animals in Explore open a short card with a read-aloud fact', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Explore');
  await expect(page.locator('.spotter-list .organism-btn')).toHaveCount(10);
  await page.locator('.spotter-list').getByRole('button', { name: 'Long-spined sea urchin' }).click();
  await expect(page.locator('#card h2')).toHaveText('Long-spined sea urchin');
  await expect(page.locator('#card .find-line')).toContainText('spines');
  // Bonus animals don't count toward the five featured organisms.
  await expect(page.locator('.progress-note')).toContainText('Observed 0 of 5');
});

test('in 3D, a bonus animal gets its own close-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
  await press(page, 'Explore');
  await page.locator('.spotter-list').getByRole('button', { name: 'Nurse shark' }).click();
  await expect(page.locator('#stage canvas')).toHaveAttribute('data-view', 'closeup:nurse-shark');
});

test('Expedition 2 (Grades 3–6): map, prediction before the model, reef comparison, cleanup and recap — keyboard only', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Grades 3–6');
  await expect(page.locator('.step-indicator')).toHaveText('Expedition 2 · Step 1 of 6: Briefing');
  await expect(page.locator('.map-view')).toBeHidden();
  await page.keyboard.press('n');
  // The belt: the map appears and each year changes it.
  await expect(page.locator('.map-view')).toBeVisible();
  await expect(page.locator('.map-badge-text')).toHaveText('Before 2011');
  await press(page, '2025');
  await expect(page.locator('.map-badge-text')).toHaveText('2025');
  await expect(dock(page)).toContainText('38 million tons');
  await page.keyboard.press('n');
  // What feeds it: the model opens only after the class predicts.
  await expect(dock(page).getByRole('button', { name: /^Extra nutrients: on/ })).toHaveCount(0);
  await expect(dock(page).getByRole('button', { name: 'Record class prediction' })).toBeDisabled();
  await press(page, 'Warmer water');
  await press(page, 'Record class prediction');
  await expect(page.locator('.map-badge-text')).toHaveText('Simplified example');
  await press(page, /^Ocean currents: on/);
  await expect(dock(page)).toContainText('doesn’t reach Belize');
  await expect(dock(page)).toContainText('scientists are still investigating');
  await page.keyboard.press('n');
  // Our reef: the map steps aside; sargassum and trash appear in the illustration.
  await expect(page.locator('.map-view')).toBeHidden();
  await expect(page.locator('.litter-spot')).toHaveCount(5);
  await press(page, 'Too much sargassum');
  await expect(page.locator('.sargassum-overlay')).toHaveCount(1);
  await expect(dock(page)).toContainText('But here’s a twist');
  await page.locator('.litter-spot').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.litter-spot')).toHaveCount(4);
  await expect(page.locator('.cleanup-count')).toContainText('1 of 12');
  await page.keyboard.press('n');
  await press(page, 'Nutrients washing off land in rivers, plus dust in the wind');
  await press(page, 'Submit answer');
  await expect(dock(page).locator('.feedback.good')).toBeVisible();
  await page.keyboard.press('n');
  await expect(dock(page)).toContainText('Not just Belize');
  await expect(dock(page).locator('.recap-completed')).toContainText('What feeds it');
  // Only two of the three years were compared, so the belt is attempted, not completed.
  await expect(dock(page).locator('.recap-attempted')).toContainText('The belt');
  await expect(dock(page).locator('.recap-skipped')).toContainText('question 2');
});

test('Expedition 2 (Little Explorers): clean up every stop, see the seaweed, pick helpers', async ({ page }) => {
  await page.goto('/?presentation=static');
  await press(page, 'Little Explorers (TK–2)');
  await expect(page.locator('.step-indicator')).toHaveText('Little Explorers · Step 1 of 5: Story');
  await page.keyboard.press('n');
  for (const [stop, count] of [['1. Reef', 5], ['2. Seagrass meadow', 4], ['3. Sandy seabed', 3]] as const) {
    await press(page, stop);
    await expect(page.locator('.litter-spot')).toHaveCount(count);
    // Children tap the pictures; animal buttons step aside while trash is out.
    await expect(page.locator('.hotspot')).toHaveCount(0);
    for (let i = 0; i < count; i++) await page.locator('.litter-spot').first().click();
    await expect(page.locator('.litter-spot')).toHaveCount(0);
  }
  await expect(page.locator('.cleanup-count')).toContainText('12 of 12');
  await expect(dock(page)).toContainText('The whole reef is clean');
  await page.keyboard.press('n');
  await press(page, 'Lots of seaweed');
  await expect(page.locator('.sargassum-overlay')).toHaveCount(1);
  await expect(dock(page)).toContainText('It’s darker!');
  await page.keyboard.press('n');
  await dock(page).getByRole('button', { name: /Put trash in a bin/ }).click();
  await dock(page).getByRole('button', { name: /Look, don’t touch/ }).click();
  await expect(dock(page).locator('.helper-card.is-done')).toHaveCount(2);
  await page.keyboard.press('n');
  await expect(dock(page)).toContainText('You cleaned 12 of 12 pieces of trash and found 2 ways to help');
  // A refresh offers to resume this expedition.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Resume The Changing Reef \(step 5/ })).toBeVisible();
});

test('in 3D, the sargassum mats and trash appear only in Expedition 2', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
  await press(page, 'Grades 3–6');
  await dock(page).getByRole('button', { name: '4. Our reef' }).click();
  await press(page, 'Too much sargassum');
  await dock(page).locator('summary', { hasText: 'Choose from a list' }).click();
  await dock(page).getByRole('button', { name: 'Pick up the old fishing net' }).click();
  await expect(page.locator('.cleanup-count')).toContainText('1 of 12');
  await expect(page.locator('#caption')).toContainText('Old fishing net');
});
