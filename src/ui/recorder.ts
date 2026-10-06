/**
 * Narration recording page (#record). Shows each narration line in lesson
 * order with Record, Play and Save controls, so the teacher can record the
 * whole script in one sitting. Nothing is uploaded: files are saved locally.
 */
import { habitats } from '../content/habitats.ts';
import { steps } from '../content/lesson.ts';
import { narration } from '../content/narration.ts';
import { organisms } from '../content/organisms.ts';
import { recordedNarration } from '../content/recordings.ts';
import { esc } from './html.ts';

interface Take {
  url: string;
  ext: string;
  seconds: number;
}

const groups: { title: string; ids: { id: string; label: string }[] }[] = [
  { title: 'Lesson steps', ids: steps.map((s, i) => ({ id: s.narrationId, label: `Step ${i + 1}: ${s.label}` })) },
  { title: 'Habitat stops', ids: habitats.map((h) => ({ id: h.narrationId, label: h.title })) },
  { title: 'Organism cards', ids: organisms.map((o) => ({ id: o.narrationId, label: o.commonName })) },
];

const textFor = new Map(narration.map((n) => [n.id, n.text]));

function pickMime(): { mime: string; ext: string } {
  const options = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/mp4', ext: 'm4a' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  for (const o of options) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(o.mime)) return o;
  return { mime: '', ext: 'webm' };
}

export class Recorder {
  private root: HTMLElement;
  private onClose: () => void;
  private takes = new Map<string, Take>();
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private recordingId: string | null = null;
  private startedAt = 0;
  private meterRaf = 0;
  private error = '';

  constructor(root: HTMLElement, onClose: () => void) {
    this.root = root;
    this.onClose = onClose;
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-rec]');
      if (!el) return;
      e.stopPropagation();
      const id = el.dataset.id ?? '';
      if (el.dataset.rec === 'record') void this.start(id);
      if (el.dataset.rec === 'stop') this.stop();
      if (el.dataset.rec === 'close') this.close();
    });
  }

  open() {
    this.root.hidden = false;
    document.body.classList.add('guide-open');
    document.getElementById('app')?.setAttribute('inert', '');
    this.render();
    this.root.querySelector<HTMLElement>('[data-rec="close"]')?.focus();
  }

  close() {
    this.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    cancelAnimationFrame(this.meterRaf);
    this.root.hidden = true;
    document.body.classList.remove('guide-open');
    if (document.getElementById('guide')?.hidden !== false) document.getElementById('app')?.removeAttribute('inert');
    this.onClose();
  }

  get isOpen() {
    return !this.root.hidden;
  }

  private async start(id: string) {
    if (this.recorder) this.stop();
    this.error = '';
    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        this.startMeter(this.stream);
      }
    } catch {
      this.error = window.isSecureContext
        ? 'The microphone is blocked. Allow microphone access for this site in the browser’s address bar, then press Record again.'
        : 'Recording needs a secure (https) page. Open the lesson from its https link and try again.';
      this.render();
      return;
    }
    const { mime, ext } = pickMime();
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const old = this.takes.get(id);
      if (old) URL.revokeObjectURL(old.url);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      this.takes.set(id, { url: URL.createObjectURL(blob), ext, seconds: (performance.now() - this.startedAt) / 1000 });
      this.render(`play:${id}`);
    };
    this.recorder = rec;
    this.recordingId = id;
    this.startedAt = performance.now();
    rec.start();
    this.render(`stop:${id}`);
  }

  private stop() {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.recorder = null;
    this.recordingId = null;
  }

  private startMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        const bar = this.root.querySelector<HTMLElement>('.rec-meter span');
        if (bar) bar.style.width = `${Math.min(100, peak * 140)}%`;
        this.meterRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // The level meter is a convenience; recording works without it.
    }
  }

  private render(focusKey?: string) {
    const done = [...this.takes.keys()].length;
    const total = groups.reduce((n, g) => n + g.ids.length, 0);
    this.root.innerHTML = `<div class="guide-toolbar rec-toolbar">
        <p class="rec-progress" role="status">${done} of ${total} lines recorded this session</p>
        <div class="rec-meter" aria-hidden="true" title="Microphone level"><span></span></div>
        <button type="button" class="btn primary" data-rec="close"><span class="btn-icon" aria-hidden="true">✕</span><span>Close</span></button>
      </div>
      <article class="guide recorder">
        <h1>Record your narration</h1>
        <p class="lead">Read each line below in your own voice. Your recordings replace the browser voice in the lesson.</p>
        <ol class="small">
          <li>Find a quiet room. Hold the microphone about a hand’s width from your mouth.</li>
          <li>Press <strong>Record</strong>, wait a beat, read the line, wait a beat, then press <strong>Stop</strong>.</li>
          <li>Play it back. If you want another try, press <strong>Record again</strong>.</li>
          <li>Press <strong>Save file</strong> for each line you’re happy with. Keep the file names as they are.</li>
          <li>Send the saved files over so they can be added to the lesson.</li>
        </ol>
        <p class="small">Read the words exactly as written: the captions show this text while your voice plays. If you’d like to change the wording, note it and the captions can be updated to match.</p>
        ${this.error ? `<p class="notice" role="alert">${esc(this.error)}</p>` : ''}
        ${groups
          .map(
            (g) => `<section><h2>${esc(g.title)}</h2>
            ${g.ids
              .map(({ id, label }) => {
                const take = this.takes.get(id);
                const isRecording = this.recordingId === id;
                const inLesson = recordedNarration.includes(id);
                const record = isRecording
                  ? `<button type="button" class="btn primary danger" data-rec="stop" data-id="${esc(id)}" data-key="stop:${esc(id)}"><span class="btn-icon" aria-hidden="true">■</span><span>Stop</span></button>`
                  : `<button type="button" class="btn ${take ? 'secondary' : 'primary'}" data-rec="record" data-id="${esc(id)}" data-key="record:${esc(id)}"><span class="btn-icon" aria-hidden="true">●</span><span>${take ? 'Record again' : 'Record'}</span></button>`;
                return `<div class="rec-line${isRecording ? ' is-recording' : ''}">
                  <p class="eyebrow">${esc(label)} · <span class="mono">${esc(id)}</span>${inLesson ? ' · already in the lesson ✓' : ''}</p>
                  <p class="rec-text">${esc(textFor.get(id) ?? '')}</p>
                  <div class="row">
                    ${record}
                    ${isRecording ? '<span class="rec-live" role="status">Recording…</span>' : ''}
                    ${take && !isRecording ? `<audio controls src="${take.url}" data-key="play:${esc(id)}"></audio>
                      <a class="btn secondary" href="${take.url}" download="${esc(id)}.${take.ext}">Save file</a>
                      <span class="small muted">${take.seconds.toFixed(1)} s</span>` : ''}
                  </div>
                </div>`;
              })
              .join('')}
          </section>`,
          )
          .join('')}
      </article>`;
    if (focusKey) this.root.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  }
}
