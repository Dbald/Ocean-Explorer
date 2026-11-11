/**
 * Experience shell: entry screen, modes, loading and error recovery, settings,
 * and the wiring between lesson state, the renderer, narration and input.
 */
import { Ambience, Narrator, type NarrationState } from './audio/narrator.ts';
import { foodRelationshipById } from './content/food.ts';
import { habitatById } from './content/habitats.ts';
import { COMPOSITE_NOTICE, GUIDING_QUESTION, LESSON_TITLE, OBJECTIVE, PRODUCT_NAME, connectItems, exitQuestions, stepById, steps, videoSegments } from './content/lesson.ts';
import { CHANGING_QUESTION, CHANGING_TITLE, beltSnapshots, isLitterId, litterById, stepsFor, type CauseId, type ChangingLevel } from './content/changing.ts';
import { findNarrationId, findableById, spotterNarrationId } from './content/findables.ts';
import { narrationById } from './content/narration.ts';
import { recordedAudioFor } from './content/recordings.ts';
import { organismById, organisms } from './content/organisms.ts';
import { LIVE_PHASE, OCEAN_PHASE, upcomingPhases } from './content/phases.ts';
import { OCEAN_QUESTION, OCEAN_TITLE, chainLinks, feedItems, isOceanAnimal, oceanAnimalsAt, oceanStepsFor, raftFinds, type OceanLevel, type OceanStop } from './content/openOcean.ts';
import { oceanStep, oceanStopFor, renderMagnifier, renderOceanDock } from './ui/oceanViews.ts';
import { DEEP_QUESTION, DEEP_TITLE, deepAnimalsAt, deepStepsFor, glowFinds, isDeepAnimal, zoneById, zoneClues, type DeepLevel, type DeepZone } from './content/deepOcean.ts';
import { deepStep, renderDeepDock } from './ui/deepViews.ts';
import type { HabitatId, StepId, VideoSegment } from './content/types.ts';
import { currentFindTarget, initialState, reduce, type Action, type LessonState, type Mode } from './lesson/controller.ts';
import { clearAll, loadPreferences, loadSession, savePreferences, saveSession, type Preferences } from './lesson/store.ts';
import { MapView } from './scene/MapView.ts';
import { ReefScene, webglAvailable, type Viewpoint } from './scene/ReefScene.ts';
import { StaticScene } from './scene/StaticScene.ts';
import { renderGuide, renderTranscript, SHORTCUTS } from './ui/guide.ts';
import { btn, esc, ICON } from './ui/html.ts';
import { changingStep, mapStateFor, remainingLitter, renderChangingDock } from './ui/changingViews.ts';
import { findOrder, renderCard, renderExploreDock, renderFindDock, renderLessonDock } from './ui/views.ts';
import { CodexBridge, LESSON_ID, eventsFor, isEmbedded, type FromCodex } from './embed/bridge.ts';
import { findablesAt } from './content/findables.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface SceneTarget {
  view: Viewpoint;
  stop: HabitatId | OceanStop | DeepZone;
  shelter: 'before' | 'after' | null;
}

export class App {
  private state: LessonState;
  /** A saved session from a previous visit, offered as "Resume" on the entry screen. */
  private resumable: LessonState | null = null;
  /** Whether the home panel is showing; hidden, the reef fills the screen. */
  private homeOpen = true;
  private prefs: Preferences;
  private paused = false;
  private muted = false;
  private scene3d: ReefScene | null = null;
  private staticScene: StaticScene | null = null;
  private mapView: MapView | null = null;
  private lastView: Viewpoint | null = null;
  private narrator: Narrator;
  private ambience = new Ambience();
  private caption: string | null = null;
  private narrationState: NarrationState = 'idle';
  /** Clips to play back to back (e.g. "You found it!" then the animal's fact). */
  private narrationQueue: string[] = [];
  /** Animal pointed out by the game's Hint button in the illustrations view. */
  private staticHint: string | null = null;
  private videos: VideoSegment[] = [];
  private returnFocus: HTMLElement | null = null;
  private perfTimer = 0;
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /** Set when running inside The Codex (`?embed=codex` in a frame). */
  private bridge: CodexBridge | null = null;

  constructor() {
    this.prefs = loadPreferences(this.reducedMotion);
    const params = new URLSearchParams(location.search);
    if (isEmbedded()) {
      document.documentElement.dataset.embed = 'codex';
      this.bridge = new CodexBridge({
        onCommand: (cmd) => this.onCodexCommand(cmd),
        extraOrigins: import.meta.env.VITE_CODEX_ORIGINS ?? '',
        dev: import.meta.env.DEV,
      });
    }
    const forced = params.get('presentation');
    if (forced === 'static' || forced === '3d') this.prefs.presentation = forced;
    const saved = loadSession();
    this.resumable = saved.mode !== null ? saved : null;
    this.state = initialState();
    this.narrator = new Narrator({
      onCaption: (text) => {
        this.caption = text;
        this.renderCaptions();
      },
      onState: (s) => {
        this.narrationState = s;
        this.renderCaptions();
        if (s === 'idle' && this.narrationQueue.length) {
          const next = this.narrationQueue.shift()!;
          window.setTimeout(() => this.playNarration(next), 250);
        }
      },
    }, recordedAudioFor);
  }

  init() {
    this.applyPrefs();
    this.bindEvents();
    this.mapView = new MapView($('stage'));
    const insets = new ResizeObserver(() => this.updateInsets());
    insets.observe($('dock'));
    insets.observe($('entry'));
    window.addEventListener('resize', () => this.updateInsets());
    this.renderAll();
    this.startPresentation();
    void this.detectVideos();
    $('guide').innerHTML = this.guideMarkup();
    // Tells the start-up watchdog in index.html that the app is running.
    document.documentElement.setAttribute('data-booted', '1');
    $('boot-error').hidden = true;
    if (location.hash === '#guide') this.openGuide();
    if (location.hash === '#record') void this.openRecorder();
    if (this.bridge) {
      this.bridge.send({ type: 'ready', lesson: LESSON_ID, labels: this.prefs.labelsAlways });
      // The Codex can open straight into an activity: ?embed=codex&start=lesson
      const start = new URLSearchParams(location.search).get('start');
      if (start === 'lesson') this.onCodexCommand({ type: 'start', mode: 'lesson', resume: true });
    }
  }

  /** A command from The Codex. Only ever arrives in embedded mode, from a trusted origin. */
  private onCodexCommand(cmd: FromCodex) {
    switch (cmd.type) {
      case 'start':
        if (cmd.resume && this.resumable?.mode === cmd.mode) return this.handleAction('resume', undefined, document.body);
        if (this.state.mode === cmd.mode) return;
        return this.handleAction('start', cmd.mode, document.body);
      case 'set_labels':
        return this.setLabels(cmd.on, false);
      case 'go_to_step':
        if (this.state.mode === 'lesson') this.dispatch({ type: 'goto', step: cmd.step });
        return;
      case 'pause_narration':
        if (!this.paused) this.togglePause();
        return;
      case 'open_panel':
        if (cmd.panel === 'guide') return this.openGuide();
        return this.openDialog(cmd.panel);
    }
  }

  /** Name labels on the creatures: a preference, also switchable from The Codex. */
  private setLabels(on: boolean, announce: boolean) {
    if (this.prefs.labelsAlways === on) return;
    this.prefs.labelsAlways = on;
    savePreferences(this.prefs);
    this.syncScene();
    this.refreshSettings();
    if (announce) this.bridge?.send({ type: 'labels_changed', on });
  }

  /** Labels show everywhere except the "Can you find…?" game, where they would give the answers away. */
  private labelsVisible() {
    return this.state.mode !== 'find';
  }

  private titleOf = (id: string) => findableById.get(id)?.title ?? organismById.get(id)?.title ?? id;

  private recorder: { open(): void; close(): void; isOpen: boolean } | null = null;

  /** The recording page loads on demand, so it adds nothing to the lesson's own load. */
  private async openRecorder() {
    this.stopNarration();
    if (!this.recorder) {
      const { Recorder } = await import('./ui/recorder.ts');
      this.recorder = new Recorder($('recorder'), () => {
        if (location.hash === '#record') history.replaceState(null, '', location.pathname + location.search);
      });
    }
    $('guide').hidden = true;
    this.recorder.open();
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private dispatch(action: Action) {
    const prev = this.state;
    this.state = reduce(prev, action);
    if (this.state.mode !== null) saveSession(this.state);
    this.afterChange(prev, action);
  }

  private afterChange(prev: LessonState, action: Action) {
    const s = this.state;
    const stepChanged = prev.step !== s.step || prev.mode !== s.mode;
    if (action.type === 'start' || action.type === 'restart') this.startAudio();
    if (this.bridge) for (const ev of eventsFor(prev, s, this.titleOf)) this.bridge.send(ev);

    this.renderAll();
    this.syncScene();

    // Narration follows what changed, unless paused or turned off.
    if (s.mode === 'lesson' && stepChanged) this.narrate(stepById.get(s.step)!.narrationId);
    else if (s.mode === 'explore' && action.type === 'start') this.narrate(habitatById.get(s.stop)!.narrationId);
    if (action.type === 'visitStop' && prev.stop !== s.stop && s.mode !== 'changing') this.narrate(habitatById.get(s.stop)!.narrationId);
    if (action.type === 'selectOrganism' && action.id) {
      this.narrate(organismById.get(action.id)?.narrationId ?? spotterNarrationId(action.id));
    }

    if (s.mode === 'changing') this.narrateChanging(prev, action);
    if (s.mode === 'ocean') this.narrateOcean(prev, action);
    if (s.mode === 'deep') this.narrateDeep(prev, action);

    const chStepChanged = s.mode === 'changing' && (prev.mode !== 'changing' || prev.changing.step !== s.changing.step);
    const ocStepChanged = s.mode === 'ocean' && (prev.mode !== 'ocean' || prev.ocean.step !== s.ocean.step);
    const dzStepChanged = s.mode === 'deep' && (prev.mode !== 'deep' || prev.deep.step !== s.deep.step);
    if ((stepChanged || chStepChanged || ocStepChanged || dzStepChanged) && s.mode !== null) this.focusKey('instruction');
    // Little Explorers start the "tiny things" step looking through the magnifier.
    if (ocStepChanged && oceanStep(s).kind === 'tiny' && !s.ocean.magnifier) this.dispatch({ type: 'ocMagnifier', open: true });
    if (action.type === 'selectOrganism' && action.id) this.focusKey('card-title');
  }

  /** Expedition 2 narration: each step, each year on the map, the research reveal. */
  private narrateChanging(prev: LessonState, action: Action) {
    const s = this.state;
    const c = s.changing;
    const stepChanged = prev.mode !== 'changing' || prev.changing.step !== c.step || action.type === 'startChanging';
    if (stepChanged) {
      const step = changingStep(s);
      return this.narrateSequence(step.kind === 'recap' && c.level === 'older' ? [step.narrationId, 'ch-beyond'] : [step.narrationId]);
    }
    if (action.type === 'chBelt' && prev.changing.belt !== c.belt) this.narrate(beltSnapshots[c.belt].narrationId);
    if (action.type === 'chReveal' && c.revealed && !prev.changing.revealed) this.narrate('ch-causes-reveal');
    if (action.type === 'chHelper') this.narrate(`ch-help-${action.id}`);
    if (action.type === 'chSargassum' && action.on && !prev.changing.sargassumSeen && c.level === 'older') this.narrate('ch-twist');
  }

  /** Expedition 3 narration: each step, each plankton, the food-chain twist, the spawning finding, feeding. */
  private narrateOcean(prev: LessonState, action: Action) {
    const s = this.state;
    const o = s.ocean;
    const stepChanged = prev.mode !== 'ocean' || prev.ocean.step !== o.step || action.type === 'startOcean';
    if (stepChanged) {
      const step = oceanStep(s);
      return this.narrateSequence(step.kind === 'recap' && o.level === 'older' ? [step.narrationId, 'oc-oxygen'] : [step.narrationId]);
    }
    if (action.type === 'ocPlankton') this.narrate(`oc-plankton-${action.id}`, true);
    if (action.type === 'ocChain' && o.chain.length === chainLinks.length && prev.ocean.chain.length < chainLinks.length) this.narrate('oc-chain-done');
    if (action.type === 'ocSpawn' && o.sawSpawn && !prev.ocean.sawSpawn) this.narrate('oc-spawn-reveal');
    if (action.type === 'ocFeed') this.narrate(`ocl-feed-${action.id}`, true);
  }

  /** Expedition 4 narration: each step, each new zone, the clue twist, the glow finding. */
  private narrateDeep(prev: LessonState, action: Action) {
    const s = this.state;
    const d = s.deep;
    const stepChanged = prev.mode !== 'deep' || prev.deep.step !== d.step || action.type === 'startDeep';
    if (stepChanged) {
      const step = deepStep(s);
      return this.narrateSequence(step.kind === 'recap' && d.level === 'older' ? [step.narrationId, 'dz-marine-snow'] : [step.narrationId]);
    }
    if ((action.type === 'dzZone' || action.type === 'dzDeeper') && prev.deep.zone !== d.zone) this.narrate(`dz-zone-${d.zone}`, true);
    const placed = Object.keys(d.sorted).length;
    if (action.type === 'dzSort' && placed === zoneClues.length && Object.keys(prev.deep.sorted).length < zoneClues.length) this.narrate('dz-sort-done');
    if (action.type === 'dzLights' && d.sawDark && !prev.deep.sawDark && d.level === 'older') this.narrate('dz-glow-reveal');
  }

  private narrate(id: string, force = false) {
    this.narrateSequence([id], force);
  }

  /** Plays narration clips one after another; any new narration replaces the queue. */
  private narrateSequence(ids: string[], force = false) {
    if (!force && (!this.prefs.autoNarrate || this.paused)) return;
    const [first, ...rest] = ids;
    this.narrationQueue = rest;
    if (first) this.playNarration(first);
  }

  private playNarration(id: string) {
    const seg = narrationById.get(id);
    if (seg) this.narrator.play(seg.id, seg.text);
  }

  private stopNarration() {
    this.narrationQueue = [];
    this.narrator.skip();
  }

  /** A tap on an animal in the scene: it always says hello; in the game it is also a guess. */
  private onTap(id: string) {
    if (isLitterId(id)) return this.cleanLitter(id);
    if (this.state.mode === 'ocean') return this.oceanTap(id);
    if (this.state.mode === 'deep') return this.deepTap(id);
    this.scene3d?.react(id);
    // On the home screen, tapping an animal dives straight into Explore with its card open.
    if (this.state.mode === null) {
      this.paused = false;
      this.resumable = null;
      this.dispatch({ type: 'start', mode: 'explore' });
    }
    if (this.state.mode === 'find') return this.findTap(id);
    // In Expedition 2 animals still say hello, without opening a card over the activity.
    if (this.state.mode === 'changing') return this.narrate(findableById.has(id) ? spotterNarrationId(id) : (organismById.get(id)?.narrationId ?? ''), true);
    this.returnFocus = null;
    this.dispatch({ type: 'selectOrganism', id });
  }

  /** Picking up a piece of trash: it floats away and its fact is read aloud. */
  private cleanLitter(id: string) {
    const s = this.state;
    const kind = changingStep(s).kind;
    if (s.mode !== 'changing' || (kind !== 'reef' && kind !== 'cleanup') || s.changing.cleaned.includes(id)) return;
    this.dispatch({ type: 'chClean', id });
    const item = litterById.get(id)!;
    const left = remainingLitter(this.state);
    const lines = [`ch-litter-${item.kind}`];
    if (!left.length) lines.push('ch-little-thanks');
    else if (s.changing.level === 'little' && !left.some((l) => litterById.get(l)!.stop === item.stop)) lines.push('ch-little-clean-stop');
    this.narrateSequence(lines);
  }

  /** A tap on an open-ocean animal: it says hello; in the raft hunt it is also a find. */
  private oceanTap(id: string) {
    if (!isOceanAnimal(id)) return;
    this.scene3d?.react(id);
    const s = this.state;
    if (s.ocean.level === 'little' && oceanStep(s).kind === 'raft' && raftFinds.includes(id)) {
      this.dispatch({ type: 'ocFind', id });
      return this.narrate(`oc-animal-${id}`, true);
    }
    this.dispatch({ type: 'ocMeet', id });
    this.narrate(`oc-animal-${id}`, true);
  }

  /**
   * A tap on a deep-sea animal: it says hello; with the lights off in the
   * Little Explorers' hunt it is also a find. The sunlight zone's whale shark
   * is Expedition 3's, so its tap is translated.
   */
  private deepTap(sceneId: string) {
    const id = sceneId === 'whale-shark' ? 'diving-whale-shark' : sceneId;
    if (!isDeepAnimal(id)) return;
    this.scene3d?.react(id === 'diving-whale-shark' ? 'whale-shark' : id);
    const s = this.state;
    if (s.deep.level === 'little' && deepStep(s).kind === 'glow' && !s.deep.lights && glowFinds.includes(id)) {
      this.dispatch({ type: 'dzFind', id });
      return this.narrate(`dz-animal-${id}`, true);
    }
    this.dispatch({ type: 'dzMeet', id });
    this.narrate(`dz-animal-${id}`, true);
  }

  private startDeep(level: DeepLevel) {
    this.paused = false;
    this.resumable = null;
    this.startAudio();
    this.dispatch({ type: 'startDeep', level });
  }

  private deepNav(delta: number) {
    this.dispatch({ type: 'dzGoto', step: this.state.deep.step + delta });
  }

  private startOcean(level: OceanLevel) {
    this.paused = false;
    this.resumable = null;
    this.startAudio();
    this.dispatch({ type: 'startOcean', level });
  }

  private oceanNav(delta: number) {
    this.dispatch({ type: 'ocGoto', step: this.state.ocean.step + delta });
  }

  private startChanging(level: ChangingLevel) {
    this.paused = false;
    this.resumable = null;
    this.startAudio();
    this.dispatch({ type: 'startChanging', level });
  }

  private changingNav(delta: number) {
    this.dispatch({ type: 'chGoto', step: this.state.changing.step + delta });
  }

  // ── "Can you find…?" ───────────────────────────────────────────────────────

  private startFind() {
    this.paused = false;
    this.resumable = null;
    this.startAudio();
    this.dispatch({ type: 'startFind', order: findOrder() });
    const first = currentFindTarget(this.state);
    this.narrateSequence(['find-intro', ...(first ? [findNarrationId(first)] : [])]);
  }

  private findTap(id: string) {
    this.dispatch({ type: 'findTap', id });
    const tap = this.state.find.lastTap;
    if (tap?.correct) this.narrateSequence(['find-yes', spotterNarrationId(id)]);
    else this.narrate(spotterNarrationId(id));
  }

  private findNext() {
    this.scene3d?.hint(null);
    this.staticHint = null;
    this.dispatch({ type: 'findNext' });
    const next = currentFindTarget(this.state);
    if (next) this.narrate(findNarrationId(next));
    else this.narrateSequence(['find-done', 'find-remember']);
  }

  private findHint() {
    const target = currentFindTarget(this.state);
    if (!target) return;
    this.scene3d?.hint(target);
    this.staticHint = target;
    this.syncScene();
    window.setTimeout(() => {
      if (this.staticHint === target) {
        this.staticHint = null;
        this.syncScene();
      }
    }, 3300);
  }

  private startAudio() {
    if (this.prefs.ambienceVolume > 0) this.ambience.start();
    this.ambience.setVolume(this.prefs.ambienceVolume);
  }

  // ── Presentation (3D or static) ────────────────────────────────────────────

  private async startPresentation() {
    this.scene3d?.dispose();
    this.scene3d = null;
    this.staticScene?.dispose();
    this.staticScene = null;
    this.lastView = null;
    const stage = $('stage');
    stage.dataset.presentation = this.prefs.presentation;

    if (this.prefs.presentation === 'static') {
      this.useStatic();
      return;
    }
    if (!webglAvailable()) {
      this.fallbackToStatic('3D isn’t available in this browser. Showing illustrations — every activity still works.');
      return;
    }
    const loading = $('loading');
    loading.hidden = false;
    $('loading-actions').innerHTML = '';
    try {
      const scene = new ReefScene(stage, {
        quality: this.prefs.quality,
        ambientMotion: this.prefs.ambientMotion && !this.paused,
        instantCamera: this.prefs.instantCamera,
        onSelect: (id) => this.onTap(id),
        onProgress: (f, label) => {
          $('loading-label').textContent = label;
          $('loading-bar').style.width = `${Math.round(f * 100)}%`;
          loading.querySelector('[role=progressbar]')?.setAttribute('aria-valuenow', String(Math.round(f * 100)));
        },
        onContextLost: () => this.fallbackToStatic('The 3D view stopped working. Showing illustrations — your place in the lesson is kept.'),
      });
      this.scene3d = scene;
      this.bindCanvas(scene);
      await scene.build();
      loading.hidden = true;
      this.updateInsets();
      this.syncScene();
    } catch (err) {
      console.error(err);
      this.scene3d?.dispose();
      this.scene3d = null;
      $('loading-label').textContent = 'The 3D reef could not load.';
      $('loading-actions').innerHTML = btn('Try again', 'retry-3d', { cls: 'primary' }) + btn('Use illustrations', 'use-static', { cls: 'secondary' });
    }
  }

  private useStatic() {
    $('loading').hidden = true;
    this.staticScene = new StaticScene($('stage'), (id) => this.onTap(id));
    this.syncScene();
  }

  private fallbackToStatic(message: string) {
    this.scene3d?.dispose();
    this.scene3d = null;
    $('stage').dataset.presentation = 'static';
    if (!this.staticScene) this.useStatic();
    this.toast(message);
  }

  private bindCanvas(scene: ReefScene) {
    let down: { x: number; y: number } | null = null;
    scene.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    scene.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      const id = scene.pick(e.clientX, e.clientY);
      if (id) this.onTap(id);
    });
    scene.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') scene.setHover(scene.pick(e.clientX, e.clientY));
    });
    scene.canvas.addEventListener('pointerleave', () => scene.setHover(null));
  }

  /** Which view frames the current task. Pure function of lesson state. */
  private sceneTarget(): SceneTarget {
    const s = this.state;
    const at = (stop: HabitatId): SceneTarget => ({ view: stop, stop, shelter: null });
    if (s.mode === 'explore' || s.mode === 'find') return at(s.stop);
    if (s.mode === 'ocean') {
      const stop = oceanStopFor(s);
      return { view: stop, stop, shelter: null };
    }
    if (s.mode === 'deep') return { view: s.deep.zone, stop: s.deep.zone, shelter: null };
    if (s.mode === 'changing') {
      const kind = changingStep(s).kind;
      return at(kind === 'reef' || kind === 'cleanup' || kind === 'seaweed' ? s.stop : 'reef');
    }
    if (s.mode !== 'lesson') return at('reef');
    switch (s.step) {
      case 'explore':
        return at(s.stop);
      case 'connect': {
        const rel = foodRelationshipById.get(connectItems[s.connectIndex].relationship);
        return at(organismById.get(rel?.consumer ?? '')?.habitat ?? 'reef');
      }
      case 'investigate':
        return { view: 'shelter', stop: 'reef', shelter: s.shelter.recorded ? s.shelter.view : 'before' };
      case 'explain': {
        const q = exitQuestions[s.exitIndex];
        if (q.kind === 'food-choice') {
          const rel = foodRelationshipById.get(q.item.relationship);
          return at(organismById.get(rel?.consumer ?? '')?.habitat ?? 'reef');
        }
        if (q.kind === 'shelter-reasoning') return { view: 'shelter', stop: 'reef', shelter: 'before' };
        const pick: Record<string, HabitatId> = { coral: 'reef', seagrass: 'seagrass', 'algae-sand': 'sand' };
        return at(pick[s.protect.choice ?? ''] ?? 'reef');
      }
      default:
        return at('reef');
    }
  }

  private syncScene() {
    const t = this.sceneTarget();
    if (this.scene3d) {
      if (t.view !== this.lastView) {
        this.scene3d.setViewpoint(t.view, this.lastView === null || this.prefs.instantCamera);
        this.lastView = t.view;
      }
      this.scene3d.setShelterView(t.shelter);
      this.scene3d.setSelected(this.state.selectedOrganism);
    }
    // Expedition 2 layers: sargassum mats, trash to clean up, and the map of the belt.
    const s = this.state;
    const kind = s.mode === 'changing' ? changingStep(s).kind : null;
    const sargassum = (kind === 'reef' || kind === 'seaweed') && s.changing.sargassum;
    const litter = kind === 'reef' || kind === 'cleanup' ? remainingLitter(s) : null;
    this.scene3d?.setSargassum(sargassum);
    this.scene3d?.setLitter(litter);
    // Expedition 3: the open water, the spawning snappers, and who is here.
    const ocean = s.mode === 'ocean';
    const okind = ocean ? oceanStep(s).kind : null;
    const spawning = okind === 'spawn' && s.ocean.spawning;
    // Expedition 4 dives from Expedition 3's open water, so that water stays on above it.
    const deep = s.mode === 'deep';
    this.scene3d?.setOpenOcean(ocean || deep);
    if (ocean) this.scene3d?.setOceanStop(t.stop as OceanStop, okind === 'feed');
    if (deep) this.scene3d?.setOceanStop('blue');
    this.scene3d?.setSpawning(spawning);
    this.scene3d?.setDeep(deep);
    this.scene3d?.setDeepLights(!deep || s.deep.lights);
    // In the raft hunt (and the glow hunt) the names would give the answers away, as in "Can you find…?".
    const raftHunt = okind === 'raft' || (deep && s.deep.level === 'little' && deepStep(s).kind === 'glow');
    const here = ocean
      ? oceanAnimalsAt(t.stop as OceanStop).map((a) => ({ id: a.id, title: a.title, done: s.ocean.met.includes(a.id) }))
      : deep
        ? deepAnimalsAt(s.deep.zone).map((a) => ({ id: a.id === 'diving-whale-shark' ? 'whale-shark' : a.id, title: a.title, done: s.deep.met.includes(a.id) }))
        : findablesAt(t.stop as HabitatId).map((f) => ({ id: f.id, title: f.title, done: this.state.discovered.includes(f.id) }));
    // Name tags float over the creatures at the current stop, like the illustrations' labels.
    // Shown on hover (or for the selected animal) unless "Always show name labels" is on.
    this.scene3d?.setLabels(this.labelsVisible() && !raftHunt && !t.shelter && !litter ? here : null, this.prefs.labelsAlways);
    this.staticScene?.render({
      stop: t.stop,
      selected: this.state.selectedOrganism,
      shelterView: t.shelter,
      labels: this.labelsVisible() && !raftHunt,
      labelsAlways: this.prefs.labelsAlways,
      discovered: ocean ? s.ocean.met : deep ? s.deep.met : this.state.discovered,
      hint: this.staticHint,
      sargassum,
      litter,
      spawning,
      lights: deep ? s.deep.lights : true,
    });
    this.renderMagnifierLayer();
    const map = mapStateFor(s);
    this.mapView?.show(!!map);
    if (map) this.mapView?.render(map);
    $('stage').dataset.map = map ? 'on' : 'off';
    $('stage').setAttribute('data-stop', t.stop);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  /** The plankton magnifier floats over the scene while it is open. */
  private renderMagnifierLayer() {
    const layer = $('magnifier-layer');
    const open = this.state.mode === 'ocean' && this.state.ocean.magnifier;
    layer.hidden = !open;
    if (open) this.patch(layer, renderMagnifier(this.state));
    else if (layer.innerHTML) layer.innerHTML = '';
  }

  private renderAll() {
    this.renderTop();
    this.renderEntry();
    this.renderDock();
    this.renderCardPanel();
    this.renderCaptions();
  }

  /** Re-renders a region while keeping keyboard focus and open disclosures. */
  private patch(el: HTMLElement, html: string) {
    const active = document.activeElement as HTMLElement | null;
    const key = el.contains(active) ? active?.dataset.key : undefined;
    const open = new Set([...el.querySelectorAll<HTMLDetailsElement>('details[open]')].map((d) => d.dataset.key));
    el.innerHTML = html;
    el.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => {
      if (open.has(d.dataset.key)) d.open = true;
    });
    if (key) {
      const target = el.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
      if (target && !(target as HTMLButtonElement).disabled) target.focus();
      else el.querySelector<HTMLElement>('[data-key="instruction"], h2')?.focus();
    }
  }

  private renderTop() {
    const s = this.state;
    const parts: string[] = [];
    const sub = document.querySelector('.brand-sub');
    if (sub) sub.textContent = s.mode === null ? PRODUCT_NAME : s.mode === 'changing' ? `Belize: ${CHANGING_TITLE}` : s.mode === 'ocean' ? `The Open Ocean: ${OCEAN_TITLE}` : s.mode === 'deep' ? `The Open Ocean: ${DEEP_TITLE}` : LESSON_TITLE;
    // Progress through a guided lesson: a bar and "1 of 6". The full step name is there for screen readers.
    const progress = (i: number, n: number, label: string) =>
      `<div class="progress"><span class="progress-track" aria-hidden="true"><span style="width:${Math.round(((i + 1) / n) * 100)}%"></span></span><span class="progress-count" aria-hidden="true">${i + 1} of ${n}</span><span class="step-indicator sr-only">${esc(label)}</span></div>`;
    if (s.mode === 'lesson') {
      const i = steps.findIndex((x) => x.id === s.step);
      parts.push(progress(i, steps.length, `Step ${i + 1} of ${steps.length}: ${steps[i].label}`));
    } else if (s.mode === 'explore') {
      parts.push('<span class="mode-pill step-indicator">Explore mode</span>');
    } else if (s.mode === 'find') {
      parts.push('<span class="mode-pill step-indicator">Can you find…?</span>');
    } else if (s.mode === 'ocean') {
      const list = oceanStepsFor(s.ocean.level);
      const i = Math.min(s.ocean.step, list.length - 1);
      parts.push(progress(i, list.length, `${s.ocean.level === 'little' ? 'Little Explorers' : 'Expedition 3'} · Step ${i + 1} of ${list.length}: ${list[i].label}`));
    } else if (s.mode === 'deep') {
      const list = deepStepsFor(s.deep.level);
      const i = Math.min(s.deep.step, list.length - 1);
      parts.push(progress(i, list.length, `${s.deep.level === 'little' ? 'Little Explorers' : 'Expedition 4'} · Step ${i + 1} of ${list.length}: ${list[i].label}`));
    } else if (s.mode === 'changing') {
      const list = stepsFor(s.changing.level);
      const i = Math.min(s.changing.step, list.length - 1);
      parts.push(progress(i, list.length, `${s.changing.level === 'little' ? 'Little Explorers' : 'Expedition 2'} · Step ${i + 1} of ${list.length}: ${list[i].label}`));
    }
    parts.push(btn('Teacher guide', 'guide', { cls: 'icon-btn round', icon: ICON.guide, aria: 'Teacher guide' }));
    parts.push(btn('Transcript', 'transcript', { cls: 'icon-btn round', icon: ICON.transcript, aria: 'Transcript' }));
    parts.push(btn('Settings', 'settings', { cls: 'icon-btn round', icon: ICON.settings, aria: 'Settings' }));
    // Inside The Codex, the course page handles leaving the lesson.
    if (s.mode !== null && !this.bridge) parts.push(btn('Save & exit', 'home', { cls: 'save-exit', key: 'save-exit' }));
    this.patch($('top-actions'), parts.join(''));
    this.renderHud();
  }

  /** A short prompt over the reef for what the class is doing now. */
  private stagePrompt(): string {
    const s = this.state;
    if (s.mode === null) return 'Tap any animal to meet it';
    if (s.mode === 'explore') return 'Tap an animal to meet it';
    if (s.mode === 'find') return '';
    if (s.mode === 'ocean') {
      const byKind: Record<string, string> = {
        briefing: 'Into the deep blue',
        dive: 'Look closer: who lives out here?',
        chain: 'Who eats whom?',
        spawn: 'When do the whale sharks come?',
        explain: 'Show what you know',
        recap: 'What did we find?',
        tiny: 'Look through the magnifier',
        feed: 'What does the whale shark eat?',
        raft: 'Who is hiding in the seaweed?',
      };
      return byKind[oceanStep(s).kind] ?? '';
    }
    if (s.mode === 'deep') {
      const kind = deepStep(s).kind;
      const z = zoneById.get(s.deep.zone)!;
      // While diving, the prompt doubles as a depth readout.
      if (kind === 'descend' || kind === 'glow') return `${z.title} · ${z.depth}`;
      const byKind: Record<string, string> = { briefing: 'Into the deep', sort: 'Which zone is it?', explain: 'Show what you know', recap: 'What did we find?' };
      return byKind[kind] ?? '';
    }
    if (s.mode === 'changing') {
      const kind = changingStep(s).kind;
      const byKind: Record<string, string> = {
        briefing: 'What’s changing here?',
        belt: 'Follow the sargassum',
        causes: 'What feeds the sargassum?',
        reef: 'Compare, then clean up',
        cleanup: 'Find the trash',
        seaweed: 'Is it lighter or darker?',
        help: 'How can we help?',
        explain: 'Show what you know',
        recap: 'What did we find?',
      };
      return byKind[kind] ?? '';
    }
    const byStep: Record<StepId, string> = {
      briefing: 'Look around: what lives here?',
      explore: 'Tap an animal to meet it',
      connect: 'Who eats what?',
      investigate: 'Where could a small fish hide?',
      explain: 'Show what you know',
      recap: 'What did we find?',
    };
    return byStep[s.step];
  }

  /** Chips over the top of the reef, and the fullscreen button in its corner. */
  private renderHud() {
    const prompt = this.stagePrompt();
    const full = !!document.fullscreenElement;
    // Inside The Codex its header already shows the course, the progress and Save & exit, so ours is
    // hidden; the guide, transcript and settings move here, beside fullscreen.
    const tools = this.bridge
      ? [
          btn('Teacher guide', 'guide', { cls: 'icon-btn round hud-btn', icon: ICON.guide, aria: 'Teacher guide' }),
          btn('Transcript', 'transcript', { cls: 'icon-btn round hud-btn', icon: ICON.transcript, aria: 'Transcript' }),
          btn('Settings', 'settings', { cls: 'icon-btn round hud-btn', icon: ICON.settings, aria: 'Settings' }),
        ].join('')
      : '';
    this.patch(
      $('stage-hud'),
      `<div class="hud-chips">
        <span class="live-chip"><span class="live-dot" aria-hidden="true"></span>Live · ${esc(PRODUCT_NAME)}</span>
        ${prompt ? `<span class="prompt-chip">${esc(prompt)}</span>` : ''}
      </div>
      <div class="hud-tools">
        ${tools}
        ${document.fullscreenEnabled ? btn(full ? 'Exit fullscreen' : 'Fullscreen', 'fullscreen', { cls: 'icon-btn round hud-btn', icon: full ? ICON.exitFullscreen : ICON.fullscreen, aria: full ? 'Exit fullscreen' : 'Fullscreen' }) : ''}
      </div>`,
    );
  }

  private renderEntry() {
    const entry = $('entry');
    entry.hidden = this.state.mode !== null;
    if (entry.hidden) return;
    const r = this.resumable;
    const resumeLabel = !r
      ? ''
      : r.mode === 'lesson'
        ? `Resume lesson (step ${steps.findIndex((x) => x.id === r.step) + 1}: ${stepById.get(r.step)!.label})`
        : r.mode === 'find'
          ? 'Resume Can you find…?'
          : r.mode === 'changing'
            ? `Resume ${CHANGING_TITLE} (step ${r.changing.step + 1}: ${stepsFor(r.changing.level)[r.changing.step]?.label ?? ''})`
            : r.mode === 'ocean'
              ? `Resume ${OCEAN_TITLE} (step ${r.ocean.step + 1}: ${oceanStepsFor(r.ocean.level)[r.ocean.step]?.label ?? ''})`
              : r.mode === 'deep'
                ? `Resume ${DEEP_TITLE} (step ${r.deep.step + 1}: ${deepStepsFor(r.deep.level)[r.deep.step]?.label ?? ''})`
                : 'Resume exploring';
    const draft = organisms.some((o) => o.review.status !== 'reviewed');
    entry.dataset.open = String(this.homeOpen);

    // Collapsed: the reef gets the whole screen and one button brings the lessons back.
    if (!this.homeOpen) {
      this.patch(
        entry,
        `<div class="home-peek">
          ${btn('Lessons', 'home-toggle', { cls: 'primary big', key: 'home-toggle', icon: '☰', aria: 'Show lessons' })}
        </div>`,
      );
      this.updateInsets();
      return;
    }

    const soon = upcomingPhases
      .map(
        (p, i) => `<section class="phase is-soon" aria-labelledby="phase-${esc(p.id)}-title">
          <div class="phase-head">
            <span class="phase-num">Phase ${OCEAN_PHASE.number + i + 1}</span>
            <span class="soon-badge">Coming soon</span>
          </div>
          <h2 id="phase-${esc(p.id)}-title">${esc(p.place)}</h2>
          <p class="small muted">${esc(p.teaser)}</p>
        </section>`,
      )
      .join('');

    this.patch(
      entry,
      `<div class="home-panel">
        <div class="home-head">
          <div>
            <p class="eyebrow">${esc(PRODUCT_NAME)}</p>
            <h1 id="entry-title">Choose an expedition</h1>
          </div>
          ${btn('Hide lessons', 'home-toggle', { cls: 'ghost icon-btn home-hide', key: 'home-toggle', icon: '✕', aria: 'Hide lessons and show the whole reef' })}
        </div>
        <div class="home-scroll">
          ${r ? `<div class="row entry-actions">${btn(resumeLabel, 'resume', { cls: 'primary big', key: 'entry-resume', icon: '↩' })}</div>` : ''}

          <section class="phase is-live" aria-labelledby="phase-live-title">
            <div class="phase-head">
              <span class="phase-num">Phase ${LIVE_PHASE.number}</span>
              <span class="live-badge">Now exploring</span>
            </div>
            <h2 id="phase-live-title">${esc(LIVE_PHASE.place)}</h2>
            <p class="small muted">${esc(LIVE_PHASE.teaser)}</p>

            <article class="expedition" aria-labelledby="exp1-title">
              <p class="eyebrow">Expedition 1</p>
              <h3 id="exp1-title">${esc(LESSON_TITLE)}</h3>
              <p class="question">${esc(GUIDING_QUESTION)}</p>
              <details class="exp-more" data-key="exp1-more"><summary>What students learn</summary><p class="small">${esc(OBJECTIVE)}</p></details>
              <div class="row entry-actions">
                ${btn('Start lesson', 'start', { arg: 'lesson', cls: r ? 'secondary big' : 'primary big', key: 'entry-start', icon: '▶' })}
                ${btn('Explore', 'start', { arg: 'explore', cls: 'secondary big', key: 'entry-explore' })}
                ${btn('Can you find…?', 'find', { cls: 'secondary big', key: 'entry-find', icon: '🔍' })}
              </div>
            </article>

            <article class="expedition" aria-labelledby="exp2-title">
              <p class="eyebrow">Expedition 2</p>
              <h3 id="exp2-title">${esc(CHANGING_TITLE)}</h3>
              <p class="question">${esc(CHANGING_QUESTION)}</p>
              <p class="small">Sargassum, trash and warming water — and how people can help.</p>
              <div class="row entry-actions">
                ${btn('Grades 3–6', 'start-changing', { arg: 'older', cls: 'secondary big', key: 'entry-ch-older', icon: '▶' })}
                ${btn('Little Explorers (TK–2)', 'start-changing', { arg: 'little', cls: 'secondary big', key: 'entry-ch-little', icon: '▶' })}
              </div>
            </article>
          </section>

          <section class="phase is-live" aria-labelledby="phase-ocean-title">
            <div class="phase-head">
              <span class="phase-num">Phase ${OCEAN_PHASE.number}</span>
              <span class="live-badge">New</span>
            </div>
            <h2 id="phase-ocean-title">${esc(OCEAN_PHASE.place)}</h2>
            <p class="small muted">${esc(OCEAN_PHASE.teaser)}</p>

            <article class="expedition" aria-labelledby="exp3-title">
              <p class="eyebrow">Expedition 3</p>
              <h3 id="exp3-title">${esc(OCEAN_TITLE)}</h3>
              <p class="question">${esc(OCEAN_QUESTION)}</p>
              <p class="small">Plankton, the open-ocean food chain, and the whale sharks of Gladden Spit, Belize.</p>
              <div class="row entry-actions">
                ${btn('Grades 3–6', 'start-ocean', { arg: 'older', cls: 'secondary big', key: 'entry-oc-older', icon: '▶', aria: `${OCEAN_TITLE}: Grades 3–6` })}
                ${btn('Little Explorers (TK–2)', 'start-ocean', { arg: 'little', cls: 'secondary big', key: 'entry-oc-little', icon: '▶', aria: `${OCEAN_TITLE}: Little Explorers (TK–2)` })}
              </div>
            </article>

            <article class="expedition" aria-labelledby="exp4-title">
              <p class="eyebrow">Expedition 4 <span class="live-badge">New</span></p>
              <h3 id="exp4-title">${esc(DEEP_TITLE)}</h3>
              <p class="question">${esc(DEEP_QUESTION)}</p>
              <p class="small">The sunlight, twilight and midnight zones, and the animals that make their own light.</p>
              <div class="row entry-actions">
                ${btn('Grades 3–6', 'start-deep', { arg: 'older', cls: 'secondary big', key: 'entry-dz-older', icon: '▶', aria: `${DEEP_TITLE}: Grades 3–6` })}
                ${btn('Little Explorers (TK–2)', 'start-deep', { arg: 'little', cls: 'secondary big', key: 'entry-dz-little', icon: '▶', aria: `${DEEP_TITLE}: Little Explorers (TK–2)` })}
              </div>
            </article>
          </section>

          ${soon}

          <p class="small muted">Sound starts only after you choose. Captions are on. About 10 minutes each, teacher-led.</p>
          <p class="small muted">${esc(COMPOSITE_NOTICE)}${draft ? ' Draft content — scientific review pending.' : ''}</p>
        </div>
      </div>`,
    );
    this.updateInsets();
  }

  /** Showing or hiding the home panel; the reef reframes to use the space. */
  private toggleHome() {
    this.homeOpen = !this.homeOpen;
    this.renderEntry();
    this.focusKey('home-toggle');
  }

  /** Tells the scene how much of the screen the lesson panel covers. */
  private updateInsets() {
    const dock = $('dock');
    let right = 0;
    let bottom = 0;
    // On the home screen the lesson panel plays the dock's part, so the reef frames beside it.
    const home = $('entry').hidden ? null : $('entry').querySelector<HTMLElement>('.home-panel');
    const panel = !dock.hidden ? dock : home;
    if (panel) {
      const r = panel.getBoundingClientRect();
      const side = r.width < window.innerWidth * 0.7;
      if (side) right = window.innerWidth - r.left;
      else bottom = window.innerHeight - r.top;
    }
    document.documentElement.style.setProperty('--inset-right', `${right}px`);
    document.documentElement.style.setProperty('--inset-bottom', `${bottom}px`);
    this.scene3d?.setInsets(right, bottom);
  }

  private renderDock() {
    const dock = $('dock');
    dock.hidden = this.state.mode === null;
    if (dock.hidden) return this.updateInsets();
    const ctx = { videos: this.videos };
    dock.dataset.mode = this.state.mode ?? '';
    dock.dataset.step = this.state.mode === 'changing' ? changingStep(this.state).kind : this.state.mode === 'ocean' ? oceanStep(this.state).kind : this.state.mode === 'deep' ? deepStep(this.state).kind : this.state.step;
    const mode = this.state.mode;
    this.patch(
      dock,
      mode === 'lesson'
        ? renderLessonDock(this.state, ctx, this.paused)
        : mode === 'find'
          ? renderFindDock(this.state)
          : mode === 'changing'
            ? renderChangingDock(this.state, this.paused)
            : mode === 'ocean'
              ? renderOceanDock(this.state, this.paused)
              : mode === 'deep'
                ? renderDeepDock(this.state, this.paused)
                : renderExploreDock(this.state),
    );
    this.updateInsets();
  }

  private renderCardPanel() {
    const card = $('card');
    const id = this.state.selectedOrganism;
    // In the game, the dock celebrates the find, so no card covers it.
    card.hidden = !id || this.state.mode === null || this.state.mode === 'find';
    if (!card.hidden && id) this.patch(card, renderCard(id));
  }

  private renderCaptions() {
    const bar = $('caption-bar');
    const active = this.narrationState !== 'idle';
    bar.hidden = this.state.mode === null || !active;
    $('caption').textContent = this.prefs.captions && active ? (this.caption ?? '') : '';
    $('caption').hidden = !this.prefs.captions;
    const playing = this.narrationState === 'playing';
    const voice = this.narrator.voiceAvailable;
    this.patch(
      $('caption-controls'),
      [
        btn(playing ? 'Pause narration' : 'Play narration', 'narr-toggle', { cls: 'small-btn', icon: playing ? '❚❚' : '▶' }),
        btn('Skip', 'narr-skip', { cls: 'small-btn', icon: '⏭' }),
        voice ? btn(this.muted ? 'Unmute voice' : 'Mute voice', 'narr-mute', { cls: 'small-btn', pressed: this.muted }) : '<span class="small muted">Captions only — no voice in this browser</span>',
      ].join(''),
    );
  }

  /** Rendering is synchronous, so focus moves immediately — a fast keypress never lands on a stale element. */
  private focusKey(key: string) {
    document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }

  private toast(message: string) {
    const n = $('notice');
    n.textContent = message;
    n.hidden = false;
    window.clearTimeout(Number(n.dataset.timer));
    n.dataset.timer = String(window.setTimeout(() => (n.hidden = true), 7000));
  }

  // ── Settings, guide, transcript, confirm ───────────────────────────────────

  private applyPrefs() {
    const p = this.prefs;
    document.documentElement.style.setProperty('--text-scale', String(p.textScale));
    document.documentElement.dataset.motion = p.ambientMotion ? 'on' : 'off';
    this.narrator.setVolume(p.voiceVolume);
    this.ambience.setVolume(p.ambienceVolume);
    this.scene3d?.setAmbientMotion(p.ambientMotion && !this.paused);
    this.scene3d?.setInstantCamera(p.instantCamera);
    $('perf').hidden = !p.showPerformance;
    window.clearInterval(this.perfTimer);
    if (p.showPerformance) {
      this.perfTimer = window.setInterval(() => {
        const fps = this.scene3d ? `${this.scene3d.fps.toFixed(0)} FPS` : 'static';
        $('perf').textContent = `${fps} · ${p.quality} · ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`;
      }, 500);
    }
    savePreferences(p);
  }

  private settingsMarkup() {
    const p = this.prefs;
    const toggle = (label: string, key: keyof Preferences, help = '') =>
      `<div class="setting"><span>${esc(label)}${help ? `<span class="small muted"> ${esc(help)}</span>` : ''}</span>${btn(p[key] ? 'On' : 'Off', 'pref-toggle', { arg: key, cls: 'switch', pressed: !!p[key], aria: label })}</div>`;
    const choice = (label: string, key: 'quality' | 'presentation', options: [string, string][]) =>
      `<div class="setting"><span>${esc(label)}</span><div class="segmented" role="group" aria-label="${esc(label)}">${options
        .map(([v, l]) => btn(l, 'pref-choice', { arg: `${key}|${v}`, cls: `seg${p[key] === v ? ' is-current' : ''}`, pressed: p[key] === v }))
        .join('')}</div></div>`;
    const slider = (label: string, key: 'voiceVolume' | 'ambienceVolume') =>
      `<label class="setting"><span>${esc(label)}</span><input type="range" min="0" max="1" step="0.05" value="${p[key]}" data-input="${key}" data-key="${key}"></label>`;
    return `<div class="dialog-head"><h2 id="settings-title">Settings</h2>${btn('Close', 'close-dialog', { arg: 'settings', cls: 'icon-btn', icon: '✕', aria: 'Close settings' })}</div>
      <div class="setting"><span>Text size</span><div class="row tight">
        ${btn('Smaller', 'text-size', { arg: '-', cls: 'secondary', aria: 'Smaller text' })}
        <span class="value" aria-live="polite">${Math.round(p.textScale * 100)}%</span>
        ${btn('Larger', 'text-size', { arg: '+', cls: 'secondary', aria: 'Larger text' })}</div></div>
      ${choice('Presentation', 'presentation', [['3d', '3D reef'], ['static', 'Illustrations']])}
      ${choice('3D quality', 'quality', [['high', 'High'], ['low', 'Low']])}
      ${toggle('Ambient motion', 'ambientMotion', 'Swaying seagrass, swimming fish, light')}
      ${toggle('Instant camera moves', 'instantCamera')}
      ${toggle('Always show name labels', 'labelsAlways', 'Off: a name shows when you point at an animal')}
      ${toggle('Captions', 'captions')}
      ${toggle('Read aloud automatically', 'autoNarrate')}
      ${slider('Voice volume', 'voiceVolume')}
      ${slider('Ambience volume', 'ambienceVolume')}
      ${toggle('Show performance', 'showPerformance', 'For the technical rehearsal')}
      <div class="setting"><span>Lesson</span><div class="row tight">
        ${btn('Restart lesson', 'restart', { cls: 'secondary' })}
        ${btn('Clear session', 'clear-session', { cls: 'secondary danger' })}</div></div>
      <p class="small muted">Clear session removes saved progress and settings from this computer. Nothing is stored anywhere else.</p>
      <h3>Keyboard</h3>
      <table class="shortcuts"><tbody>${SHORTCUTS.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table>`;
  }

  private openDialog(id: 'settings' | 'transcript') {
    const d = $<HTMLDialogElement>(id);
    if (id === 'settings') d.innerHTML = this.settingsMarkup();
    else
      d.innerHTML = `<div class="dialog-head"><h2 id="transcript-title">Transcript</h2>${btn('Close', 'close-dialog', { arg: 'transcript', cls: 'icon-btn', icon: '✕', aria: 'Close transcript' })}</div>${renderTranscript(this.videos.map((v) => v.id))}`;
    this.returnFocus = document.activeElement as HTMLElement;
    if (!d.open) d.showModal();
  }

  private refreshSettings() {
    const d = $<HTMLDialogElement>('settings');
    if (d.open) this.patch(d, this.settingsMarkup());
  }

  private confirm(title: string, message: string, label: string, onYes: () => void) {
    const d = $<HTMLDialogElement>('confirm');
    d.innerHTML = `<h2 id="confirm-title">${esc(title)}</h2><p>${esc(message)}</p>
      <div class="row">${btn(label, 'confirm-yes', { cls: 'primary danger' })}${btn('Cancel', 'close-dialog', { arg: 'confirm', cls: 'secondary' })}</div>`;
    this.pendingConfirm = onYes;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('[data-action="close-dialog"]')?.focus();
  }
  private pendingConfirm: (() => void) | null = null;

  private guideMarkup() {
    return `<div class="guide-toolbar"><a class="btn secondary" href="#record"><span class="btn-icon" aria-hidden="true">●</span><span>Record narration</span></a>${btn('Print guide', 'print-guide', { cls: 'secondary', icon: '⎙' })}${btn('Close guide', 'close-guide', { cls: 'primary', icon: '✕' })}</div>${renderGuide(this.videos.map((v) => v.id))}`;
  }

  private openGuide() {
    this.returnFocus = document.activeElement as HTMLElement;
    const g = $('guide');
    g.innerHTML = this.guideMarkup();
    g.hidden = false;
    document.body.classList.add('guide-open');
    // The lesson behind an open overlay can't be reached by keyboard or screen reader.
    $('app').inert = true;
    g.querySelector<HTMLElement>('[data-action="close-guide"]')?.focus();
  }

  private closeGuide() {
    $('guide').hidden = true;
    document.body.classList.remove('guide-open');
    $('app').inert = false;
    if (location.hash === '#guide') history.replaceState(null, '', location.pathname + location.search);
    this.returnFocus?.focus();
  }

  // ── Video ──────────────────────────────────────────────────────────────────

  private async detectVideos() {
    const found: VideoSegment[] = [];
    await Promise.all(
      videoSegments.map(async (v) => {
        try {
          const res = await fetch(new URL(v.src, document.baseURI), { method: 'HEAD' });
          if (res.ok && (res.headers.get('content-type') ?? '').startsWith('video/')) found.push(v);
        } catch {
          // Missing optional media never blocks the lesson.
        }
      }),
    );
    this.videos = videoSegments.filter((v) => found.includes(v));
    if (this.videos.length) {
      this.renderDock();
      $('guide').innerHTML = this.guideMarkup();
    }
  }

  private openVideo(id: string) {
    const v = this.videos.find((x) => x.id === id);
    if (!v) return;
    this.stopNarration();
    const panel = $('video-panel');
    panel.innerHTML = `<div class="dialog-head"><h2 class="h-small">${esc(v.title)}</h2>${btn('Close video', 'close-video', { cls: 'icon-btn', icon: '✕', aria: 'Close video' })}</div>
      <video controls autoplay playsinline preload="metadata" src="${esc(v.src)}">
        <track kind="captions" srclang="en" label="English" src="${esc(v.captions)}" default>
      </video>
      <details><summary>Text version</summary><p>${esc(v.transcript)}</p></details>`;
    panel.hidden = false;
    panel.querySelector('video')?.addEventListener('error', () => {
      panel.querySelector('video')?.remove();
      panel.insertAdjacentHTML('beforeend', `<p>The video couldn’t play. Here is the text version:</p><p>${esc(v.transcript)}</p>`);
    });
  }

  private closeVideo() {
    const panel = $('video-panel');
    panel.querySelector('video')?.pause();
    panel.hidden = true;
    panel.innerHTML = '';
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private bindEvents() {
    document.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.handleAction(el.dataset.action!, el.dataset.arg, el);
    });

    document.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      switch (el.dataset.input) {
        case 'baseline':
          // Update state without re-rendering so typing is never interrupted.
          this.state = reduce(this.state, { type: 'setBaseline', text: el.value });
          saveSession(this.state);
          break;
        case 'voiceVolume':
        case 'ambienceVolume': {
          const key = el.dataset.input as 'voiceVolume' | 'ambienceVolume';
          this.prefs[key] = Number(el.value);
          if (key === 'ambienceVolume' && this.state.mode !== null) this.startAudio();
          this.applyPrefs();
          break;
        }
      }
    });

    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('fullscreenchange', () => this.renderTop());
    for (const id of ['settings', 'transcript', 'confirm']) {
      $<HTMLDialogElement>(id).addEventListener('close', () => {
        if (id !== 'confirm') this.returnFocus?.focus();
      });
    }
    window.addEventListener('hashchange', () => {
      if (location.hash === '#guide') this.openGuide();
      if (location.hash === '#record') void this.openRecorder();
    });
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.recorder?.isOpen) return this.recorder.close();
      if (!$('guide').hidden) return this.closeGuide();
      if (!$('video-panel').hidden) return this.closeVideo();
      if (this.state.selectedOrganism) {
        e.preventDefault();
        return this.closeCard();
      }
      return;
    }
    const target = e.target as HTMLElement;
    const typing = target.closest('input, textarea, select, [contenteditable]');
    const modalOpen = document.querySelector('dialog[open]') || !$('guide').hidden || !$('recorder').hidden;
    if (typing || modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    const mode = this.state.mode;
    if (mode !== 'lesson' && mode !== 'changing' && mode !== 'ocean' && mode !== 'deep') return;
    const key = e.key.toLowerCase();
    if (key === 'n' || e.key === 'PageDown') {
      e.preventDefault();
      if (mode === 'changing') this.changingNav(1);
      else if (mode === 'ocean') this.oceanNav(1);
      else if (mode === 'deep') this.deepNav(1);
      else this.dispatch({ type: 'next' });
    } else if (key === 'b' || e.key === 'PageUp') {
      e.preventDefault();
      if (mode === 'changing') this.changingNav(-1);
      else if (mode === 'ocean') this.oceanNav(-1);
      else if (mode === 'deep') this.deepNav(-1);
      else this.dispatch({ type: 'back' });
    } else if (key === 'p') {
      this.togglePause();
    } else if (key === 'r') {
      this.replay();
    }
  }

  private replay() {
    const id =
      this.state.mode === 'changing'
        ? changingStep(this.state).narrationId
        : this.state.mode === 'ocean'
          ? oceanStep(this.state).narrationId
          : this.state.mode === 'deep'
            ? deepStep(this.state).narrationId
            : stepById.get(this.state.step)!.narrationId;
    this.narrate(id, true);
  }

  private closeCard() {
    this.dispatch({ type: 'selectOrganism', id: null });
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back && document.contains(back)) back.focus();
    else this.focusKey('instruction');
  }

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.narrator.pause();
      this.ambience.suspend();
    } else {
      this.narrator.resume();
      if (this.state.mode !== null) this.startAudio();
    }
    this.scene3d?.setAmbientMotion(this.prefs.ambientMotion && !this.paused);
    this.renderDock();
  }

  private handleAction(action: string, arg: string | undefined, el: HTMLElement) {
    const [a, b] = (arg ?? '').split('|');
    switch (action) {
      case 'start':
        this.paused = false;
        this.resumable = null;
        return this.dispatch({ type: 'start', mode: a as Mode });
      case 'resume': {
        if (!this.resumable) return;
        const prev = this.state;
        this.state = { ...this.resumable, selectedOrganism: null };
        this.resumable = null;
        this.startAudio();
        return this.afterChange(prev, { type: 'goto', step: this.state.step });
      }
      case 'home-toggle':
        return this.toggleHome();
      case 'home':
        this.stopNarration();
        this.homeOpen = true;
        this.resumable = this.state;
        return this.dispatch({ type: 'exit' });
      case 'stop':
        return this.dispatch({ type: 'visitStop', stop: a as HabitatId });
      case 'select':
        this.returnFocus = el;
        this.scene3d?.react(a);
        return this.dispatch({ type: 'selectOrganism', id: a });
      case 'find':
        return this.startFind();
      case 'find-pick':
        this.scene3d?.react(a);
        return this.findTap(a);
      case 'find-next':
        this.findNext();
        return this.focusKey('instruction');
      case 'find-again': {
        const target = currentFindTarget(this.state);
        return target ? this.narrate(findNarrationId(target), true) : undefined;
      }
      case 'find-hint':
        return this.findHint();
      case 'close-card':
        return this.closeCard();
      case 'return':
        // Closing the card also returns the camera from its close-up to the task's view.
        this.dispatch({ type: 'selectOrganism', id: null });
        return this.focusKey('instruction');
      case 'listen':
        return this.narrate(organismById.get(a)?.narrationId ?? spotterNarrationId(a), true);
      case 'baseline-shared':
        return this.dispatch({ type: 'markBaselineShared' });
      case 'choose':
        return this.dispatch({ type: 'chooseOption', item: a, option: b });
      case 'submit':
        this.dispatch({ type: 'submitChoice', item: a });
        return this.focusKey(`feedback:${a}`);
      case 'retry':
        this.dispatch({ type: 'retryChoice', item: a });
        return this.focusKey(`options:${a}`);
      case 'connect-item':
        this.dispatch({ type: 'setConnectIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'exit-item':
        this.dispatch({ type: 'setExitIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'predict':
        return this.dispatch({ type: 'choosePrediction', option: a });
      case 'record-prediction':
        return this.dispatch({ type: 'recordPrediction' });
      case 'shelter-view':
        return this.dispatch({ type: 'setShelterView', view: a as 'before' | 'after' });
      case 'protect':
        return this.dispatch({ type: 'chooseProtect', choice: a });
      case 'score':
        return this.dispatch({ type: 'scoreProtect', score: this.state.protect.score === Number(a) ? null : Number(a) });
      case 'protect-discussed':
        return this.dispatch({ type: 'markProtectDiscussed' });
      case 'goto':
        return this.dispatch({ type: 'goto', step: a as StepId });
      case 'next':
        return this.dispatch({ type: 'next' });
      case 'back':
        return this.dispatch({ type: 'back' });
      case 'pause':
        return this.togglePause();
      case 'replay':
        return this.replay();
      case 'restart':
        return this.confirm('Restart the lesson?', 'This clears all answers and progress for this lesson.', 'Restart', () => {
          $<HTMLDialogElement>('settings').close();
          this.paused = false;
          if (this.state.mode === 'changing') this.dispatch({ type: 'startChanging', level: this.state.changing.level });
          else if (this.state.mode === 'ocean') this.dispatch({ type: 'startOcean', level: this.state.ocean.level });
          else if (this.state.mode === 'deep') this.dispatch({ type: 'startDeep', level: this.state.deep.level });
          else this.dispatch({ type: 'restart' });
        });
      case 'start-deep':
        return this.startDeep(a as DeepLevel);
      case 'dz-goto':
        return this.dispatch({ type: 'dzGoto', step: Number(a) });
      case 'dz-next':
        return this.deepNav(1);
      case 'dz-back':
        return this.deepNav(-1);
      case 'dz-zone':
        return this.dispatch({ type: 'dzZone', zone: a as DeepZone });
      case 'dz-deeper':
        this.dispatch({ type: 'dzDeeper' });
        return this.focusKey(this.state.deep.zone === 'midnight' ? 'instruction' : 'dz-deeper');
      case 'dz-meet':
      case 'dz-find':
        // From the list in the panel: the same as tapping the animal in the scene.
        return this.deepTap(a);
      case 'dz-sort': {
        const [clue, zone] = a.split(':');
        return this.dispatch({ type: 'dzSort', clue, zone: zone as DeepZone });
      }
      case 'dz-predict':
        return this.dispatch({ type: 'dzPredict', option: a });
      case 'dz-reveal':
        this.dispatch({ type: 'dzReveal' });
        return this.focusKey('dz-lights:off');
      case 'dz-lights':
        this.dispatch({ type: 'dzLights', on: a === 'on' });
        return this.focusKey(this.state.deep.level === 'little' ? 'dz-lights' : `dz-lights:${a}`);
      case 'dz-exit':
        this.dispatch({ type: 'dzExitIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'dz-action':
        return this.dispatch({ type: 'dzAction', id: a });
      case 'dz-score':
        return this.dispatch({ type: 'dzScore', score: this.state.deep.actionScore === Number(a) ? null : Number(a) });
      case 'dz-discussed':
        return this.dispatch({ type: 'dzDiscussed' });
      case 'start-ocean':
        return this.startOcean(a as OceanLevel);
      case 'oc-goto':
        return this.dispatch({ type: 'ocGoto', step: Number(a) });
      case 'oc-next':
        return this.oceanNav(1);
      case 'oc-back':
        return this.oceanNav(-1);
      case 'oc-stop':
        return this.dispatch({ type: 'ocStop', stop: a as OceanStop });
      case 'oc-magnifier':
        this.dispatch({ type: 'ocMagnifier', open: a === 'open' });
        return this.focusKey(a === 'open' ? `oc-plankton:diatom` : 'oc-magnifier');
      case 'oc-plankton':
        return this.dispatch({ type: 'ocPlankton', id: a });
      case 'oc-meet':
      case 'oc-find':
        // From the list in the panel: the same as tapping the animal in the scene.
        return this.oceanTap(a);
      case 'oc-chain':
        this.dispatch({ type: 'ocChain', id: a });
        return this.focusKey(this.state.ocean.chain.length === chainLinks.length ? 'instruction' : 'chain-legend');
      case 'oc-predict':
        return this.dispatch({ type: 'ocPredict', option: a });
      case 'oc-reveal':
        this.dispatch({ type: 'ocReveal' });
        return this.focusKey('oc-spawn:on');
      case 'oc-spawn':
        return this.dispatch({ type: 'ocSpawn', on: a === 'on' });
      case 'oc-feed': {
        const item = feedItems.find((f) => f.id === a);
        this.scene3d?.feedWhaleShark(!!item?.food);
        return this.dispatch({ type: 'ocFeed', id: a });
      }
      case 'oc-exit':
        this.dispatch({ type: 'ocExitIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'oc-action':
        return this.dispatch({ type: 'ocAction', id: a });
      case 'oc-score':
        return this.dispatch({ type: 'ocScore', score: this.state.ocean.actionScore === Number(a) ? null : Number(a) });
      case 'oc-discussed':
        return this.dispatch({ type: 'ocDiscussed' });
      case 'start-changing':
        return this.startChanging(a as ChangingLevel);
      case 'ch-goto':
        return this.dispatch({ type: 'chGoto', step: Number(a) });
      case 'ch-next':
        return this.changingNav(1);
      case 'ch-back':
        return this.changingNav(-1);
      case 'ch-belt':
        return this.dispatch({ type: 'chBelt', index: Number(a) });
      case 'ch-predict':
        return this.dispatch({ type: 'chPredict', option: a });
      case 'ch-reveal':
        this.dispatch({ type: 'chReveal' });
        return this.focusKey('ch-cause:nutrients');
      case 'ch-cause':
        return this.dispatch({ type: 'chToggleCause', cause: a as CauseId });
      case 'ch-sarg':
        return this.dispatch({ type: 'chSargassum', on: a === 'on' });
      case 'clean':
        return this.cleanLitter(a);
      case 'ch-exit':
        this.dispatch({ type: 'chExitIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'ch-action':
        return this.dispatch({ type: 'chAction', id: a });
      case 'ch-score':
        return this.dispatch({ type: 'chScore', score: this.state.changing.actionScore === Number(a) ? null : Number(a) });
      case 'ch-discussed':
        return this.dispatch({ type: 'chDiscussed' });
      case 'ch-helper':
        return this.dispatch({ type: 'chHelper', id: a });
      case 'say':
        return this.narrate(a, true);
      case 'clear-session':
        return this.confirm('Clear this session?', 'This removes saved progress and settings from this computer.', 'Clear session', () => {
          clearAll();
          this.prefs = loadPreferences(this.reducedMotion);
          this.resumable = null;
          this.stopNarration();
          const prev = this.state;
          this.state = initialState();
          this.applyPrefs();
          $<HTMLDialogElement>('settings').close();
          this.afterChange(prev, { type: 'exit' });
          void this.startPresentation();
          this.toast('Session cleared.');
        });
      case 'confirm-yes': {
        const fn = this.pendingConfirm;
        this.pendingConfirm = null;
        $<HTMLDialogElement>('confirm').close();
        return fn?.();
      }
      case 'close-dialog':
        return $<HTMLDialogElement>(a).close();
      case 'video':
        return this.openVideo(a);
      case 'close-video':
        return this.closeVideo();
      case 'guide':
        return this.openGuide();
      case 'close-guide':
        return this.closeGuide();
      case 'print-guide':
        return window.print();
      case 'transcript':
        return this.openDialog('transcript');
      case 'settings':
        return this.openDialog('settings');
      case 'fullscreen':
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.().catch(() => this.toast('Fullscreen isn’t available here.'));
        return;
      case 'text-size':
        this.prefs.textScale = Math.round(Math.min(1.5, Math.max(0.75, this.prefs.textScale + (a === '+' ? 0.1 : -0.1))) * 100) / 100;
        this.applyPrefs();
        return this.refreshSettings();
      case 'pref-toggle': {
        if (a === 'labelsAlways') return this.setLabels(!this.prefs.labelsAlways, true);
        const key = a as 'ambientMotion' | 'instantCamera' | 'captions' | 'autoNarrate' | 'showPerformance';
        this.prefs[key] = !this.prefs[key];
        this.applyPrefs();
        if (key === 'captions') this.renderCaptions();
        if (key === 'autoNarrate' && !this.prefs.autoNarrate) this.stopNarration();
        return this.refreshSettings();
      }
      case 'pref-choice': {
        if (a === 'quality') {
          this.prefs.quality = b as 'high' | 'low';
          this.scene3d?.setQuality(this.prefs.quality);
        } else if (a === 'presentation' && this.prefs.presentation !== b) {
          this.prefs.presentation = b as '3d' | 'static';
          void this.startPresentation();
        }
        this.applyPrefs();
        return this.refreshSettings();
      }
      case 'retry-3d':
        return void this.startPresentation();
      case 'use-static':
        this.prefs.presentation = 'static';
        this.applyPrefs();
        return void this.startPresentation();
      case 'narr-toggle':
        if (this.narrationState === 'playing') this.narrator.pause();
        else if (this.narrationState === 'paused') this.narrator.resume();
        else this.narrator.replay();
        return;
      case 'narr-skip':
        return this.stopNarration();
      case 'narr-mute':
        this.muted = !this.muted;
        this.narrator.setMuted(this.muted);
        return this.renderCaptions();
    }
  }
}
