/**
 * Narration clips recorded in Devin's own voice. Each id here must be a
 * narration segment id with a matching file at public/media/narration/<id>.mp3.
 * Segments not listed fall back to the browser's voice; captions are the same
 * either way, so read the script word for word (or update the text to match).
 */
export const recordedNarration: string[] = [];

export const narrationAudioSrc = (id: string) => `media/narration/${id}.mp3`;

export function recordedAudioFor(id: string): string | null {
  return recordedNarration.includes(id) ? narrationAudioSrc(id) : null;
}
