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

export const upcomingPhases: UpcomingPhase[] = [
  {
    id: 'open-ocean',
    place: 'The Open Ocean',
    teaser: 'Leave the reef behind for the deep blue: drifting plankton, huge food webs and long migrations.',
  },
];
