import type { AssetRecord } from './types.ts';

/**
 * Asset register: creator, source, license, attribution and permitted
 * distribution for every visual and media asset. Online availability does not
 * establish reuse rights — add a record here before shipping any new asset.
 *
 * All MVP visuals are generated in code in this repository, so no third-party
 * image, model or audio files are distributed.
 */
const project = {
  creator: 'Devinci Global LLC (generated in code in this repository)',
  source: 'Ocean Explorer repository',
  license: 'Project-owned',
  attribution: 'None required',
  distribution: 'Unrestricted for Ocean Explorer',
};

export const assets: AssetRecord[] = [
  { id: 'proc-elkhorn-coral', description: '3D elkhorn coral thicket built from procedural geometry', ...project },
  { id: 'proc-parrotfish', description: '3D stoplight parrotfish built from procedural geometry', ...project },
  { id: 'proc-barracuda', description: '3D great barracuda built from procedural geometry', ...project },
  { id: 'proc-turtle', description: '3D green sea turtle built from procedural geometry', ...project },
  { id: 'proc-conch', description: '3D queen conch built from procedural geometry', ...project },
  { id: 'svg-elkhorn-coral', description: 'Static illustration of elkhorn coral (inline SVG)', ...project },
  { id: 'svg-parrotfish', description: 'Static illustration of a stoplight parrotfish (inline SVG)', ...project },
  { id: 'svg-barracuda', description: 'Static illustration of a great barracuda (inline SVG)', ...project },
  { id: 'svg-turtle', description: 'Static illustration of a green sea turtle (inline SVG)', ...project },
  { id: 'svg-conch', description: 'Static illustration of a queen conch (inline SVG)', ...project },
  { id: 'proc-environment', description: 'Water, light, seafloor, seagrass, rocks and particles (procedural)', ...project },
  {
    id: 'audio-narration',
    description: 'Lesson narration recorded by Devin Baldwin (14 clips, public/media/narration)',
    creator: 'Devin Baldwin',
    source: 'Recorded for Ocean Explorer, October 2026',
    license: 'Project-owned',
    attribution: 'Narration: Devin Baldwin',
    distribution: 'Unrestricted for Ocean Explorer',
  },
  { id: 'audio-ambience', description: 'Ocean ambience synthesized at runtime with the Web Audio API', ...project },
  {
    id: 'lib-three',
    description: 'three.js rendering library',
    creator: 'three.js authors',
    source: 'https://github.com/mrdoob/three.js',
    license: 'MIT',
    attribution: 'Copyright © 2010–present three.js authors (license text ships in the bundle notice)',
    distribution: 'Permitted under MIT',
  },
];

export const assetById = new Map(assets.map((a) => [a.id, a]));
