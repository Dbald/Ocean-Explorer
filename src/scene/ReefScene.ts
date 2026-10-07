/**
 * Environment renderer: builds the composite reef, frames fixed guided
 * viewpoints, handles selection and highlights, and exposes quality and motion
 * controls. It knows nothing about lesson rules — the app tells it what to show.
 */
import * as THREE from 'three';
import type { HabitatId } from '../content/types.ts';
import { buildEnvironment, terrainHeight, type Environment } from './environment.ts';
import { buildBarracuda, buildConch, buildElkhorn, buildParrotfish, buildSmallFish, buildTurtle, type CoralColony, type FishRig, type TurtleRig } from './organisms.ts';
import {
  buildBlueTangs,
  buildCushionStar,
  buildEagleRay,
  buildGreenMoray,
  buildHermitCrab,
  buildNurseShark,
  buildOctopus,
  buildSeaCucumber,
  buildSeaUrchin,
  buildSergeantMajors,
  buildSpinyLobster,
  buildStingray,
  type SpotterModel,
} from './spotters.ts';
import { disposeTree, sharedTime, tagOrganism } from './util.ts';

/** The algae-covered side of the rock where the parrotfish grazes. */
const GRAZE_ROCK = { x: -12.95, z: 0.8, radius: 0.3 };
/** Where the barracuda pauses, side-on to the camera, while its card is open. */
const BARRACUDA_HOLD = new THREE.Vector3(-15.0, 1.5, -0.6);

export type Viewpoint = HabitatId | 'shelter';
export type Quality = 'high' | 'low';

interface View {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const VIEWS: Record<Viewpoint, View> = {
  reef: { position: new THREE.Vector3(-15.2, 2.7, 7.6), target: new THREE.Vector3(-15.2, 0.8, -0.6) },
  seagrass: { position: new THREE.Vector3(4.6, 1.9, 4.6), target: new THREE.Vector3(4.0, 0.45, 0.2) },
  sand: { position: new THREE.Vector3(18.5, 1.25, 3.2), target: new THREE.Vector3(17.7, 0.15, 0.9) },
  shelter: { position: new THREE.Vector3(-18.1, 1.5, 4.3), target: new THREE.Vector3(-18.0, 0.6, 0.4) },
};

export interface SceneOptions {
  quality: Quality;
  ambientMotion: boolean;
  instantCamera: boolean;
  onSelect: (id: string) => void;
  onProgress?: (fraction: number, label: string) => void;
  onContextLost?: () => void;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    // three.js needs WebGL 2; older boards with only WebGL 1 get the illustrations instead.
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export class ReefScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
  private clock = new THREE.Timer();
  private env!: Environment;
  /** The main object for each tappable id (framing, ring); `instances` holds every copy (e.g. all sea fans). */
  private organisms = new Map<string, THREE.Object3D>();
  private instances = new Map<string, THREE.Object3D[]>();
  private pickables: THREE.Object3D[] = [];
  private spotterModels = new Map<string, SpotterModel>();
  private eagleRay: SpotterModel | null = null;
  /** Tap reactions in progress: elapsed seconds and total length. */
  private reactions = new Map<string, { t: number; duration: number }>();
  private hintId: string | null = null;
  private ring!: THREE.Mesh;
  private hoverId: string | null = null;
  private selectedId: string | null = null;
  private raf = 0;
  private time = 0;
  private opts: SceneOptions;
  private dirLight!: THREE.DirectionalLight;
  private camFrom: View = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  private camTo: View = VIEWS.reef;
  private camT = 1;
  private currentTarget = VIEWS.reef.target.clone();
  private parrot!: FishRig;
  private barracuda!: FishRig;
  private smallFish!: FishRig;
  private turtle!: TurtleRig;
  private focusColony!: CoralColony;
  private shelterView: 'before' | 'after' | null = null;
  private fishFrom = new THREE.Vector3();
  private fishTo = new THREE.Vector3(-17.55, 0.62, 0.15);
  private fishT = 1;
  private fishHome = new THREE.Vector3(-17.55, 0.62, 0.15);
  private shelterMarker!: THREE.Mesh;
  private resizeObserver: ResizeObserver;
  private frames = 0;
  private fpsWindowStart = performance.now();
  fps = 0;

  private container: HTMLElement;

  constructor(container: HTMLElement, opts: SceneOptions) {
    this.container = container;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.tabIndex = -1;
    container.appendChild(this.canvas);
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.opts.onContextLost?.();
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
  }

  async build() {
    const progress = this.opts.onProgress ?? (() => {});
    progress(0.05, 'Filling the water…');
    await nextFrame();
    this.scene.fog = new THREE.FogExp2('#2b93a8', 0.045);
    this.scene.add(new THREE.HemisphereLight('#c8f6ff', '#3c6a5c', 1.5));
    this.dirLight = new THREE.DirectionalLight('#fff3d6', 2.4);
    this.dirLight.position.set(-6, 14, 6);
    this.dirLight.target.position.set(-2, 0, -1);
    this.dirLight.shadow.mapSize.set(2048, 2048);
    const sc = this.dirLight.shadow.camera;
    sc.left = -28;
    sc.right = 28;
    sc.top = 12;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 40;
    this.dirLight.shadow.bias = -0.0008;
    this.scene.add(this.dirLight, this.dirLight.target);

    progress(0.2, 'Shaping the seafloor…');
    await nextFrame();
    // Keep seagrass clear around the turtle, sea star and sea cucumber so children can see them.
    this.env = buildEnvironment([
      { x: 4, z: 0.3, r: 1.1 },
      { x: 2.85, z: 1.35, r: 0.45 },
      { x: 5.3, z: 1.65, r: 0.45 },
    ]);
    this.scene.add(this.env.root);

    progress(0.55, 'Growing the coral…');
    await nextFrame();
    this.buildOrganisms();

    progress(0.85, 'Waking up the reef…');
    await nextFrame();
    this.applyQuality(this.opts.quality);
    this.setViewpoint('reef', true);
    this.resize();
    this.renderer.compile(this.scene, this.camera);
    progress(1, 'Ready');
    this.loop();
  }

  private place(obj: THREE.Object3D, x: number, z: number, lift: number) {
    obj.position.set(x, terrainHeight(x, z) + lift, z);
  }

  private register(id: string, obj: THREE.Object3D, others: THREE.Object3D[] = []) {
    const all = [obj, ...others];
    all.forEach((o) => tagOrganism(o, id));
    this.organisms.set(id, obj);
    this.instances.set(id, all);
    this.pickables.push(...all);
  }

  /** An invisible, generous tap target so small animals are easy to hit with a finger. */
  private addTapArea(holder: THREE.Object3D, radius: number, y = 0.1) {
    const area = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    area.position.y = y;
    holder.add(area);
  }

  private addSpotter(id: string, model: SpotterModel, x: number, z: number, opts: { lift?: number; yaw?: number; tap?: number; tapY?: number; free?: boolean } = {}) {
    const holder = new THREE.Group();
    holder.add(model.group);
    if (opts.free) holder.position.set(x, opts.lift ?? 0, z);
    else this.place(holder, x, z, opts.lift ?? 0);
    holder.rotation.y = opts.yaw ?? 0;
    this.addTapArea(holder, opts.tap ?? 0.3, opts.tapY ?? 0.1);
    this.scene.add(holder);
    this.spotterModels.set(id, model);
    this.register(id, holder);
    return holder;
  }

  private buildSpotters() {
    // Reef: things that were already in the scene become tappable…
    this.register('brain-coral', this.env.boulders[0], this.env.boulders.slice(1));
    this.register('sea-fan', this.env.fans[0], this.env.fans.slice(1));
    this.register('tube-sponge', this.env.sponges[0], this.env.sponges.slice(1));
    // …plus new animals placed where the reef stop can see them.
    this.addSpotter('nurse-shark', buildNurseShark(), -14.6, 2.3, { lift: 0.1, yaw: 0.25, tap: 0.6 });
    this.addSpotter('spiny-lobster', buildSpinyLobster(), -13.35, 1.05, { lift: 0.04, yaw: -2.3, tap: 0.32 });
    this.addSpotter('sea-urchin', buildSeaUrchin(), -16.35, 1.55, { tap: 0.3 });
    this.addSpotter('green-moray', buildGreenMoray(), -11.95, -0.39, { tap: 0.3, tapY: 0.2 });
    this.addSpotter('reef-octopus', buildOctopus(), -15.15, 0.65, { yaw: 0.6, tap: 0.33 });
    this.addSpotter('blue-tang', buildBlueTangs(), -13.4, -1.0, { lift: 1.35, free: true, tap: 0.75, tapY: 0.05 });
    this.addSpotter('sergeant-major', buildSergeantMajors(), -18.7, -0.2, { lift: 1.35, free: true, tap: 0.6, tapY: 0.05 });
    // Seagrass meadow.
    this.eagleRay = buildEagleRay();
    this.addSpotter('eagle-ray', this.eagleRay, 4.9, -1.1, { lift: 1.35, free: true, tap: 1.1, tapY: 0 });
    this.addSpotter('cushion-star', buildCushionStar(), 2.85, 1.35, { tap: 0.32 });
    this.addSpotter('sea-cucumber', buildSeaCucumber(), 5.3, 1.65, { yaw: 0.4, tap: 0.32 });
    // Sandy seabed.
    this.addSpotter('southern-stingray', buildStingray('#d6c79c'), 18.6, -0.02, { yaw: 0.5, tap: 0.45, tapY: 0.03 });
    const crab = buildHermitCrab();
    crab.group.scale.setScalar(1.6);
    this.addSpotter('hermit-crab', crab, 16.85, 1.55, { yaw: -0.6, tap: 0.25 });
  }

  /** Objects that bounce on tap. The coral thicket group spans the reef, so only its main colony bounces. */
  private bouncers(id: string): THREE.Object3D[] {
    return id === 'elkhorn-coral' ? [this.focusColony.group] : (this.instances.get(id) ?? []);
  }

  /** A short "hello" wiggle when tapped. */
  react(id: string) {
    this.reactions.set(id, { t: 0, duration: 1.1 });
  }

  /** Points out an animal for a few seconds: it wiggles and a ring appears around it. */
  hint(id: string | null) {
    this.hintId = id;
    if (id) this.reactions.set(id, { t: 0, duration: 3.3 });
    this.updateHighlights();
  }

  private buildOrganisms() {
    // Elkhorn thicket: the focus colony (used in the shelter comparison) plus companions.
    const coral = new THREE.Group();
    this.focusColony = buildElkhorn(21, 1.05, true);
    this.place(this.focusColony.group, -17.6, -0.2, -0.05);
    coral.add(this.focusColony.group);
    for (const [seed, x, z, s, ry] of [
      [31, -15.1, -1.6, 0.9, 1.1],
      [44, -19.6, -2.4, 1.15, 2.2],
      [57, -13.4, 0.4, 0.7, 0.4],
    ] as const) {
      const colony = buildElkhorn(seed, s);
      this.place(colony.group, x, z, -0.05);
      colony.group.rotation.y = ry;
      coral.add(colony.group);
    }
    this.register('elkhorn-coral', coral);
    this.scene.add(coral);

    this.parrot = buildParrotfish();
    this.grazeTarget.set(GRAZE_ROCK.x + GRAZE_ROCK.radius + 0.02, terrainHeight(GRAZE_ROCK.x, GRAZE_ROCK.z) + 0.1, GRAZE_ROCK.z);
    this.placeParrot(0.25, 0);
    this.register('stoplight-parrotfish', this.parrot.group);
    this.scene.add(this.parrot.group);
    // Algae growing on the rock face where the parrotfish feeds.
    const algae = new THREE.MeshStandardMaterial({ color: '#5f7a2e', roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.008, 8, 6), algae);
      blob.scale.set(0.5, 1, 1.2);
      blob.position.set(this.grazeTarget.x - 0.03 + (i % 2) * 0.012, this.grazeTarget.y - 0.06 + (i % 4) * 0.035, this.grazeTarget.z - 0.12 + i * 0.03);
      this.scene.add(blob);
    }

    this.barracuda = buildBarracuda();
    this.barracuda.group.position.set(-12.8, 2.1, -2.2);
    this.register('great-barracuda', this.barracuda.group);
    this.scene.add(this.barracuda.group);

    this.turtle = buildTurtle();
    this.place(this.turtle.group, 4, 0.3, 0.22);
    this.turtle.group.rotation.y = 0.5;
    this.register('green-sea-turtle', this.turtle.group);
    this.scene.add(this.turtle.group);

    const conch = buildConch();
    this.place(conch, 17.6, 0.9, 0.07);
    this.conchPosition.copy(conch.position);
    conch.rotation.y = 2.4;
    this.register('queen-conch', conch);
    this.scene.add(conch);

    // The small, unprofiled reef fish used in the shelter comparison (not selectable).
    this.smallFish = buildSmallFish();
    this.smallFish.group.position.copy(this.fishHome);
    this.smallFish.group.rotation.y = -0.4;
    this.scene.add(this.smallFish.group);

    this.shelterMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.012, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#7dffb2', transparent: true, opacity: 0.9, depthTest: false }),
    );
    this.shelterMarker.renderOrder = 10;
    this.shelterMarker.visible = false;
    this.scene.add(this.shelterMarker);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.03, 8, 64),
      new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.95, depthTest: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 10;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.buildSpotters();

    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && o.userData.organismId) m.castShadow = true;
    });
  }

  /**
   * Close-up framings used while an organism's card is open, so the class can
   * actually see what the card asks them to observe (a beak, algae on a shell).
   */
  private closeups(): Record<string, View> {
    const g = this.grazeTarget;
    const turtle = this.turtle.group.position;
    const c = this.conchPosition;
    const h = BARRACUDA_HOLD;
    return {
      'stoplight-parrotfish': {
        position: new THREE.Vector3(g.x + 0.6, g.y + 0.3, g.z + 1.15),
        target: new THREE.Vector3(g.x + 0.25, g.y + 0.04, g.z),
      },
      'elkhorn-coral': { position: new THREE.Vector3(-17.4, 1.7, 3.5), target: new THREE.Vector3(-17.6, 0.65, -0.2) },
      'great-barracuda': { position: new THREE.Vector3(h.x + 0.3, h.y + 0.25, h.z + 2.6), target: h.clone() },
      'green-sea-turtle': {
        position: new THREE.Vector3(turtle.x + 0.9, turtle.y + 0.75, turtle.z + 1.7),
        target: new THREE.Vector3(turtle.x + 0.15, turtle.y + 0.05, turtle.z),
      },
      'blue-tang': { position: new THREE.Vector3(-13.1, 1.75, 1.1), target: new THREE.Vector3(-13.4, 1.35, -1.0) },
      'sergeant-major': { position: new THREE.Vector3(-18.4, 1.65, 1.5), target: new THREE.Vector3(-18.7, 1.35, -0.2) },
      'eagle-ray': { position: new THREE.Vector3(5.1, 1.95, 1.9), target: new THREE.Vector3(4.9, 1.35, -1.1) },
      'queen-conch': {
        position: new THREE.Vector3(c.x + 0.2, c.y + 0.42, c.z + 0.85),
        target: new THREE.Vector3(c.x, c.y + 0.03, c.z),
      },
    };
  }

  private closeupViews: Record<string, View> | null = null;
  private baseView: View = VIEWS.reef;
  private baseViewName: Viewpoint = 'reef';

  /** Frames a stop. While a card is open the close-up stays; closing the card returns here. */
  setViewpoint(view: Viewpoint, instant = this.opts.instantCamera) {
    this.baseView = VIEWS[view];
    this.baseViewName = view;
    if (this.selectedId && this.closeupFor(this.selectedId)) return;
    this.moveCamera(this.baseView, instant);
    this.canvas.dataset.view = view;
  }

  private closeupFor(id: string): View | null {
    this.closeupViews ??= this.closeups();
    const known = this.closeupViews[id];
    if (known) return known;
    // Anything else: frame its main object from the front, a little above.
    const obj = this.organisms.get(id);
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const d = Math.max(0.9, Math.max(size.x, size.y, size.z) * 2.2);
    const view = { position: new THREE.Vector3(c.x + d * 0.2, c.y + d * 0.4 + 0.1, c.z + d), target: c };
    this.closeupViews[id] = view;
    return view;
  }

  private moveCamera(to: View, instant: boolean) {
    if (instant) {
      this.camera.position.copy(to.position);
      this.currentTarget.copy(to.target);
      this.camera.lookAt(this.currentTarget);
      this.camTo = to;
      this.camT = 1;
      return;
    }
    this.camFrom = { position: this.camera.position.clone(), target: this.currentTarget.clone() };
    this.camTo = to;
    this.camT = 0;
  }

  setSelected(id: string | null) {
    const changed = id !== this.selectedId;
    this.selectedId = id;
    this.updateHighlights();
    if (!changed) return;
    const closeup = id ? this.closeupFor(id) : null;
    this.moveCamera(closeup ?? this.baseView, this.opts.instantCamera);
    this.canvas.dataset.view = closeup ? `closeup:${id}` : this.baseViewName;
  }

  /** d = distance of the fish's centre from the rock face; nibble tilts the head. */
  private placeParrot(d: number, nibble: number) {
    const g = this.grazeTarget;
    this.parrot.group.position.set(g.x + d, g.y + 0.06 + (d - 0.25) * 0.12, g.z);
    this.parrot.group.rotation.set(0, Math.PI, -0.25 + nibble * 0.09);
  }

  private grazeTarget = new THREE.Vector3();
  private conchPosition = new THREE.Vector3();
  private barracudaHold = 0;

  /** null = normal scene; before/after = the shelter comparison. */
  setShelterView(view: 'before' | 'after' | null) {
    if (view === this.shelterView) return;
    this.shelterView = view;
    const after = view === 'after';
    if (this.focusColony.removable) this.focusColony.removable.visible = !after;
    if (this.focusColony.rubble) this.focusColony.rubble.visible = after;
    this.shelterMarker.visible = view !== null;
    this.fishFrom.copy(this.smallFish.group.position);
    this.fishTo.copy(after ? this.env.shelterElsewhere : this.fishHome);
    this.fishT = this.opts.instantCamera ? 1 : 0;
    if (this.fishT === 1) this.smallFish.group.position.copy(this.fishTo);
  }

  setQuality(q: Quality) {
    this.opts.quality = q;
    this.applyQuality(q);
  }

  setAmbientMotion(on: boolean) {
    this.opts.ambientMotion = on;
  }

  setInstantCamera(on: boolean) {
    this.opts.instantCamera = on;
  }

  /** Returns the organism id under a client-space point, if any. */
  pick(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.pickables, true)[0];
    return (hit?.object.userData.organismId as string | undefined) ?? null;
  }

  setHover(id: string | null) {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    this.updateHighlights();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    disposeTree(this.scene);
    this.renderer.dispose();
    this.canvas.remove();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private applyQuality(q: Quality) {
    const high = q === 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1));
    this.renderer.shadowMap.enabled = high;
    this.dirLight.castShadow = high;
    this.env.snow.geometry.setDrawRange(0, high ? (this.env.snow.userData.maxCount as number) : 120);
    this.env.shafts.children.forEach((s, i) => (s.visible = high || i < 2));
    this.env.seagrass.count = high ? (this.env.seagrass.userData.maxCount as number) : Math.floor((this.env.seagrass.userData.maxCount as number) * 0.45);
    // Shadow maps need materials to recompile when toggled.
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && 'needsUpdate' in m) m.needsUpdate = true;
    });
    this.resize();
  }

  private updateHighlights() {
    const inCloseup = !!this.selectedId && !!this.closeupFor(this.selectedId);
    for (const [id, list] of this.instances) for (const obj of list) {
      // In a close-up the framing already shows what's selected, so the glow would only wash it out.
      const level = id === this.selectedId ? (inCloseup ? 0 : 0.16) : id === this.hoverId ? 0.08 : 0;
      obj.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mat && 'emissiveIntensity' in mat) {
          if (mat.userData.baseEmissive === undefined) {
            mat.userData.baseEmissive = mat.emissive.getHex();
          }
          mat.emissive.setHex(level > 0 ? 0xffd27a : (mat.userData.baseEmissive as number));
          mat.emissiveIntensity = level > 0 ? level : 1;
        }
      });
    }
    const ringId = this.selectedId ?? this.hintId;
    const target = ringId ? this.organisms.get(ringId) : null;
    this.ring.visible = !!target && (!inCloseup || !this.selectedId);
    if (target) {
      const box = new THREE.Box3().setFromObject(target);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      // The coral thicket is wide; ring its focus colony instead.
      const anchor = ringId === 'elkhorn-coral' ? this.focusColony.group.position : center;
      const radius = ringId === 'elkhorn-coral' ? 1.6 : Math.max(size.x, size.z) * 0.65 + 0.08;
      this.ring.scale.setScalar(radius);
      this.ring.userData.baseScale = radius;
      this.ring.position.set(anchor.x, Math.max(box.min.y, terrainHeight(anchor.x, anchor.z)) + 0.04, anchor.z);
    }
  }

  /**
   * Space covered by opaque UI panels. The projection is shifted so the framed
   * subjects sit in the middle of the visible area rather than behind a panel.
   */
  setInsets(right: number, bottom: number) {
    this.insets = { right: Math.max(0, right), bottom: Math.max(0, bottom) };
    this.resize();
  }

  private insets = { right: 0, bottom: 0 };

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const { right, bottom } = this.insets;
    const fullW = w + right;
    const fullH = h + bottom;
    this.camera.aspect = fullW / fullH;
    // Keep the framed subjects in view on tall/narrow screens.
    this.camera.fov = (w - right) / (h - bottom || 1) < 1 ? 68 : 50;
    if (right || bottom) this.camera.setViewOffset(fullW, fullH, right, bottom, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    const raw = this.clock.getDelta();
    // Ambient motion uses a capped step; transitions use real time so they never drag on slow devices.
    if (this.opts.ambientMotion) this.time += Math.min(raw, 0.1);
    sharedTime.value = this.time;
    this.animate(Math.min(raw, 0.5));
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    const now = performance.now();
    if (now - this.fpsWindowStart >= 1000) {
      this.fps = (this.frames * 1000) / (now - this.fpsWindowStart);
      this.frames = 0;
      this.fpsWindowStart = now;
    }
  };

  private animate(dt: number) {
    // Camera: eased transition between fixed viewpoints, never continuous drift.
    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 1.6);
      const e = this.camT < 0.5 ? 4 * this.camT ** 3 : 1 - (-2 * this.camT + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.camFrom.position, this.camTo.position, e);
      this.currentTarget.lerpVectors(this.camFrom.target, this.camTo.target, e);
      this.camera.lookAt(this.currentTarget);
    }

    // The shelter fish moves at a calm pace regardless of ambient motion; it is the evidence.
    if (this.fishT < 1) {
      this.fishT = Math.min(1, this.fishT + dt / 3);
      const e = this.fishT * this.fishT * (3 - 2 * this.fishT);
      const p = new THREE.Vector3().lerpVectors(this.fishFrom, this.fishTo, e);
      p.y += Math.sin(e * Math.PI) * 0.35;
      const dir = this.fishTo.clone().sub(this.fishFrom);
      this.smallFish.group.rotation.y = Math.atan2(-dir.z, dir.x);
      this.smallFish.group.position.copy(p);
    }
    if (this.shelterMarker.visible) {
      this.shelterMarker.position.copy(this.smallFish.group.position);
      this.shelterMarker.lookAt(this.camera.position);
    }

    const t = this.time;

    // Barracuda: slow patrol on a gentle ellipse, facing its direction of travel.
    // While its card is open it eases into a side-on hover in front of the camera.
    const a = t * 0.12;
    const patrol = new THREE.Vector3(-15 + Math.cos(a) * 2.2, 2.1 + Math.sin(a * 2) * 0.12, -2.2 + Math.sin(a) * 0.9);
    const patrolYaw = Math.atan2(-Math.cos(a) * 0.9, -Math.sin(a) * 2.2);
    const holdTarget = this.selectedId === 'great-barracuda' ? 1 : 0;
    this.barracudaHold = this.opts.instantCamera
      ? holdTarget
      : THREE.MathUtils.clamp(this.barracudaHold + Math.sign(holdTarget - this.barracudaHold) * (dt / 2), 0, 1);
    const hw = this.barracudaHold * this.barracudaHold * (3 - 2 * this.barracudaHold);
    this.barracuda.group.position.lerpVectors(patrol, BARRACUDA_HOLD, hw);
    const yawDelta = Math.atan2(Math.sin(0 - patrolYaw), Math.cos(0 - patrolYaw));
    this.barracuda.group.rotation.y = patrolYaw + yawDelta * hw;

    // Parrotfish: swims in, nibbles algae off the rock with its beak, backs off, repeats.
    // With motion off it rests with its beak on the algae, so the card still makes sense.
    if (this.opts.ambientMotion) {
      const cycle = (t % 4.5) / 4.5;
      const ease = (x: number) => x * x * (3 - 2 * x);
      if (cycle < 0.3) this.placeParrot(0.6 - 0.35 * ease(cycle / 0.3), 0);
      else if (cycle < 0.72) this.placeParrot(0.25, Math.sin(t * 16));
      else this.placeParrot(0.25 + 0.35 * ease((cycle - 0.72) / 0.28), 0);
    } else {
      this.placeParrot(0.25, 0);
    }

    // Tap reactions run even with ambient motion off: they are direct feedback to a child's tap.
    for (const [id, r] of this.reactions) {
      r.t += dt;
      const p = Math.min(1, r.t / r.duration);
      const cycles = Math.max(1, Math.round(r.duration));
      const phase = (p * cycles) % 1;
      const boing = Math.sin(phase * Math.PI) * (1 - p * 0.3);
      for (const obj of this.bouncers(id)) obj.scale.set(1 - boing * 0.07, 1 + boing * 0.16, 1 - boing * 0.07);
      this.spotterModels.get(id)?.react?.(phase);
      if (p >= 1) {
        for (const obj of this.bouncers(id)) obj.scale.set(1, 1, 1);
        this.spotterModels.get(id)?.react?.(0);
        this.reactions.delete(id);
        if (this.hintId === id) {
          this.hintId = null;
          this.updateHighlights();
        }
      }
    }
    if (this.hintId) this.ring.scale.setScalar(this.ring.userData.baseScale * (1 + Math.sin(performance.now() / 160) * 0.06));

    if (!this.opts.ambientMotion) return;

    for (const [id, m] of this.spotterModels) if (!this.reactions.has(id)) m.animate?.(t);
    if (this.eagleRay) {
      // A slow, gliding loop above the meadow.
      const a = t * 0.22;
      this.eagleRay.group.position.set(Math.cos(a) * 0.9, Math.sin(a * 2) * 0.12, Math.sin(a) * 0.45);
      this.eagleRay.group.rotation.y = Math.atan2(-Math.cos(a) * 0.45, -Math.sin(a) * 0.9);
    }

    this.parrot.tail.rotation.y = Math.sin(t * 5) * 0.35;
    this.barracuda.tail.rotation.y = Math.sin(t * 2.2) * (0.2 - hw * 0.12);
    this.smallFish.tail.rotation.y = Math.sin(t * 8) * 0.4;
    if (this.fishT >= 1) this.smallFish.group.position.y = this.fishTo.y + Math.sin(t * 1.3) * 0.02;
    this.turtle.flippers.forEach((f, i) => (f.rotation.x = Math.sin(t * 0.7 + (i % 2) * Math.PI) * (i < 2 ? 0.18 : 0.08)));
    // The turtle dips its head toward the seagrass now and then.
    const dip = Math.max(0, Math.sin(t * 0.5)) ** 2;
    this.turtle.head.rotation.z = -0.05 - dip * 0.35;
    this.turtle.head.position.y = 0.05 - dip * 0.05;
    for (const fan of this.env.fans) fan.rotation.z = Math.sin(t * 0.6 + (fan.userData.sway as number)) * 0.06;
    this.env.shafts.children.forEach((s) => (s.rotation.z = 0.22 + Math.sin(t * 0.15 + (s.userData.phase as number)) * 0.04));
    this.env.snow.position.y = Math.sin(t * 0.1) * 0.3;
    this.env.snow.position.x = Math.sin(t * 0.05) * 0.4;
  }
}
