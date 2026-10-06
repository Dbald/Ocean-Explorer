/**
 * Narration: plays a recorded voice clip when one exists for the segment,
 * otherwise speaks the text with the browser's speech engine when available.
 * Captions always carry the same text, so no essential content depends on
 * audio. Audio only ever starts after an intentional user action.
 */
export type NarrationState = 'idle' | 'playing' | 'paused';

export interface NarratorEvents {
  onCaption: (text: string | null) => void;
  onState: (state: NarrationState) => void;
}

export class Narrator {
  private synth: SpeechSynthesis | null = 'speechSynthesis' in window ? window.speechSynthesis : null;
  private current: { id: string; text: string } | null = null;
  private state: NarrationState = 'idle';
  private volume = 0.9;
  private muted = false;
  private sentences: string[] = [];
  private sentenceIndex = 0;
  private token = 0;

  private events: NarratorEvents;
  private audioFor: (id: string) => string | null;
  private audio: HTMLAudioElement | null = null;

  constructor(events: NarratorEvents, audioFor: (id: string) => string | null = () => null) {
    this.events = events;
    this.audioFor = audioFor;
  }

  /** True when there is a voice to mute (browser speech or a recording); captions work either way. */
  get voiceAvailable() {
    return !!this.synth || !!this.audio;
  }

  get playing() {
    return this.state === 'playing';
  }

  get narrationState() {
    return this.state;
  }

  get currentId() {
    return this.current?.id ?? null;
  }

  play(id: string, text: string) {
    this.stopSpeech();
    this.current = { id, text };
    this.sentences = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g)?.map((s) => s.trim()) ?? [text];
    this.sentenceIndex = 0;
    this.setState('playing');
    const src = this.audioFor(id);
    if (src) this.playRecording(src);
    else this.speakNext();
  }

  replay() {
    if (this.current) this.play(this.current.id, this.current.text);
  }

  pause() {
    if (this.state !== 'playing') return;
    if (this.audio) {
      this.audio.pause();
      this.setState('paused');
      return;
    }
    this.token++;
    this.synth?.cancel();
    this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('playing');
    if (this.audio) void this.audio.play().catch(() => this.fallBackToSpeech());
    else this.speakNext();
  }

  /** Skip the current segment. */
  skip() {
    this.stopSpeech();
    this.current = null;
    this.events.onCaption(null);
    this.setState('idle');
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
  }

  setMuted(m: boolean) {
    this.muted = m;
    // A muted recording keeps playing silently, so captions stay in time with it.
    if (this.audio) {
      this.audio.muted = m;
      return;
    }
    if (m && this.state === 'playing') {
      // Keep captions flowing at reading pace while muted.
      this.token++;
      this.synth?.cancel();
      this.speakNext();
    }
  }

  private stopSpeech() {
    this.token++;
    this.synth?.cancel();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  /**
   * Plays a recorded clip. Captions advance sentence by sentence, timed in
   * proportion to each sentence's length across the clip's duration.
   */
  private playRecording(src: string) {
    const token = this.token;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = this.volume;
    audio.muted = this.muted;
    this.audio = audio;
    const lengths = this.sentences.map((s) => s.length);
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    const ends: number[] = [];
    lengths.reduce((acc, len) => {
      ends.push((acc + len) / total);
      return acc + len;
    }, 0);
    let shown = 0;
    this.events.onCaption(this.sentences[0] ?? null);
    audio.addEventListener('timeupdate', () => {
      if (token !== this.token || !audio.duration) return;
      const f = audio.currentTime / audio.duration;
      const i = Math.min(ends.findIndex((e) => f < e), this.sentences.length - 1);
      const index = i === -1 ? this.sentences.length - 1 : i;
      if (index !== shown) {
        shown = index;
        this.sentenceIndex = index;
        this.events.onCaption(this.sentences[index]);
      }
    });
    audio.addEventListener('ended', () => {
      if (token !== this.token) return;
      this.audio = null;
      this.setState('idle');
    });
    audio.addEventListener('error', () => {
      if (token === this.token) this.fallBackToSpeech();
    });
    void audio.play().catch(() => {
      if (token === this.token) this.fallBackToSpeech();
    });
  }

  /** A missing or unplayable recording never silences the lesson. */
  private fallBackToSpeech() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.state === 'playing') this.speakNext();
  }

  private setState(s: NarrationState) {
    this.state = s;
    this.events.onState(s);
  }

  private speakNext() {
    const token = ++this.token;
    if (this.sentenceIndex >= this.sentences.length) {
      this.setState('idle');
      return;
    }
    const sentence = this.sentences[this.sentenceIndex];
    this.events.onCaption(sentence);
    const advance = () => {
      if (token !== this.token || this.state !== 'playing') return;
      this.sentenceIndex++;
      this.speakNext();
    };
    // Without a voice (or when muted), captions advance at a comfortable reading pace.
    const readingMs = Math.max(2200, sentence.split(/\s+/).length * 380);
    if (!this.synth || this.muted || this.volume === 0) {
      window.setTimeout(advance, readingMs);
      return;
    }
    const u = new SpeechSynthesisUtterance(sentence);
    u.volume = this.volume;
    u.rate = 0.95;
    u.lang = 'en-US';
    let finished = false;
    u.onend = () => {
      finished = true;
      advance();
    };
    u.onerror = () => {
      if (!finished) window.setTimeout(advance, 400);
    };
    this.synth.speak(u);
    // Some engines never fire onend; never let captions stall.
    window.setTimeout(() => {
      if (!finished) advance();
    }, readingMs * 2.5);
  }
}

/** Gentle ocean ambience synthesized at runtime — no audio files to license or load. */
export class Ambience {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private volume = 0.35;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      const ctx = new Ctx();
      const seconds = 4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        // Brown noise: soft, low rumble like distant water.
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(filter.frequency);
      const gain = ctx.createGain();
      gain.gain.value = this.volume * 0.5;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
      lfo.start();
      this.ctx = ctx;
      this.gain = gain;
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.2);
  }

  suspend() {
    void this.ctx?.suspend();
  }
}
