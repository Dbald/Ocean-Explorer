/**
 * Environment renderer: builds the composite reef, frames fixed guided
 * viewpoints, handles selection and highlights, and exposes quality and motion
 * controls. It knows nothing about lesson rules — the app tells it what to show.
 */
import * as THREE from 'three';
import type { HabitatId } from '../content/types.ts';
import { buildEnvironment, terrainHeight, type Environment } from './environment.ts';
import { buildBarracuda, buildConch, buildElkhorn, buildParrotfish, buildSmallFish, buildTurtle, type CoralColony, type FishRig, type TurtleRig } from './organisms.ts';
import { disposeTree, sharedTime, tagOrganism } from './util.ts';

/** The parrotfish grazes on an algae-covered rock at the edge of the thicket. */
const PARROT_HOME = { x: -12.75, z: 1.15 };

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
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
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
  private organisms = new Map<string, THREE.Object3D>();
  private pickables: THREE.Object3D[] = [];
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
    this.env = buildEnvironment([{ x: 4, z: 0.3, r: 1.1 }]);
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

  private register(id: string, obj: THREE.Object3D) {
    tagOrganism(obj, id);
    this.organisms.set(id, obj);
    this.pickables.push(obj);
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
    this.parrot.group.position.set(PARROT_HOME.x, terrainHeight(PARROT_HOME.x, PARROT_HOME.z) + 0.42, PARROT_HOME.z);
    this.parrot.group.rotation.set(0, Math.PI * 0.85, -0.35);
    this.register('stoplight-parrotfish', this.parrot.group);
    this.scene.add(this.parrot.group);

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

    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && o.userData.organismId) m.castShadow = true;
    });
  }

  // ── Public controls ────────────────────────────────────────────────────────

  setViewpoint(view: Viewpoint, instant = this.opts.instantCamera) {
    const to = VIEWS[view];
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
    this.selectedId = id;
    this.updateHighlights();
  }

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
    for (const [id, obj] of this.organisms) {
      const level = id === this.selectedId ? 0.16 : id === this.hoverId ? 0.08 : 0;
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
    const target = this.selectedId ? this.organisms.get(this.selectedId) : null;
    this.ring.visible = !!target;
    if (target) {
      const box = new THREE.Box3().setFromObject(target);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      // The coral thicket is wide; ring its focus colony instead.
      const anchor = this.selectedId === 'elkhorn-coral' ? this.focusColony.group.position : center;
      const radius = this.selectedId === 'elkhorn-coral' ? 1.6 : Math.max(size.x, size.z) * 0.65 + 0.08;
      this.ring.scale.setScalar(radius);
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
    if (!this.opts.ambientMotion) return;

    this.parrot.tail.rotation.y = Math.sin(t * 5) * 0.35;
    this.parrot.group.position.x = PARROT_HOME.x + Math.sin(t * 0.8) * 0.06;
    this.barracuda.tail.rotation.y = Math.sin(t * 2.2) * 0.2;
    // Slow patrol on a gentle ellipse, facing the direction of travel.
    const a = t * 0.12;
    this.barracuda.group.position.set(-15 + Math.cos(a) * 2.2, 2.1 + Math.sin(a * 2) * 0.12, -2.2 + Math.sin(a) * 0.9);
    this.barracuda.group.rotation.y = Math.atan2(-Math.cos(a) * 0.9, -Math.sin(a) * 2.2);
    this.smallFish.tail.rotation.y = Math.sin(t * 8) * 0.4;
    if (this.fishT >= 1) this.smallFish.group.position.y = this.fishTo.y + Math.sin(t * 1.3) * 0.02;
    this.turtle.flippers.forEach((f, i) => (f.rotation.x = Math.sin(t * 0.7 + (i % 2) * Math.PI) * (i < 2 ? 0.18 : 0.08)));
    this.turtle.head.rotation.z = Math.sin(t * 0.35) * 0.08 - 0.05;
    for (const fan of this.env.fans) fan.rotation.z = Math.sin(t * 0.6 + (fan.userData.sway as number)) * 0.06;
    this.env.shafts.children.forEach((s) => (s.rotation.z = 0.22 + Math.sin(t * 0.15 + (s.userData.phase as number)) * 0.04));
    this.env.snow.position.y = Math.sin(t * 0.1) * 0.3;
    this.env.snow.position.x = Math.sin(t * 0.05) * 0.4;
  }
}
