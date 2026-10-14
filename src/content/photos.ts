/**
 * Real reference photos, shown beside the illustrated animals (in the card,
 * the game and Expedition 2) so children can see what the real thing looks
 * like. Each photo is a file in public/media/photos/ with its credit, licence
 * and source. Subjects without a photo simply show none.
 *
 * Use photos you may reuse: your own, public domain (for example NOAA or
 * other US government photos), CC0, CC BY or CC BY-SA. The credit and licence
 * appear under the photo. See docs/photos.md.
 */
import { findables } from './findables.ts';

export interface ReferencePhoto {
  /** A findable id (every tappable animal), or one of the extra subjects below. */
  subject: string;
  /** File name in public/media/photos/. */
  file: string;
  /** What the photo shows, for screen readers. */
  alt: string;
  /** e.g. "Photo: NOAA" or "Photo: Devin Baldwin". */
  credit: string;
  /** e.g. "Public domain", "CC BY 4.0". */
  license: string;
  /** Where the photo came from (or the photographer's page). */
  sourceUrl: string;
}

/** Every subject that can have a photo, in the order of the photo checklist. */
export const PHOTO_SUBJECTS: { id: string; label: string }[] = [
  ...findables.map((f) => ({ id: f.id, label: f.title })),
  { id: 'sargassum', label: 'Sargassum floating in the ocean (close up)' },
  { id: 'sargassum-beach', label: 'Sargassum piled up on a beach' },
];

export const referencePhotos: ReferencePhoto[] = [];

export const photoSrc = (p: ReferencePhoto) => `media/photos/${p.file}`;

export function photoFor(subject: string, list: ReferencePhoto[] = referencePhotos): ReferencePhoto | undefined {
  return list.find((p) => p.subject === subject);
}
