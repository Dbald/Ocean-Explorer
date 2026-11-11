/**
 * The Ocean Explorer journey, grouped into phases. Each phase is a place in the ocean.
 *
 * Phase 1 (Belize) is live and its expeditions are wired up in the home panel.
 * Upcoming phases show on the home screen as "Coming soon" cards, so classes can see
 * there is more ocean to explore. Add a phase here and it appears automatically;
 * when one goes live, give it real expeditions in the home panel.
 */
export interface UpcomingPhase {
  id: string;
  /** Short place name shown as the card title. */
  place: string;
  /** One line about what learners will discover there. */
  teaser: string;
}

export const LIVE_PHASE = {
  number: 1,
  place: 'Belize',
  teaser: 'Dive the Belize Barrier Reef: who lives here, what they eat, and what is changing.',
};

/** Phase 2, live: the open water beyond Belize's reef. */
export const OCEAN_PHASE = {
  number: 2,
  place: 'The Open Ocean',
  teaser: 'Leave the reef behind for the deep blue: drifting plankton, the whale sharks that visit Belize each spring, and the glowing animals of the midnight zone.',
};

/** Phases still to come appear as "Coming soon" cards. Add one here and it shows on the home screen. */
export const upcomingPhases: UpcomingPhase[] = [];
