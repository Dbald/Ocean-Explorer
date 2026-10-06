import * as THREE from 'three';

/** Small seeded PRNG so the scene is identical on every load and device. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof rng>;

export const range = (r: Rand, min: number, max: number) => min + (max - min) * r();

/** Cheap smooth value noise for terrain and rock displacement. */
export function noise2(x: number, y: number): number {
  const s = Math.sin(x * 1.7 + Math.sin(y * 0.9) * 1.3) * 0.5 + Math.sin(y * 2.3 + Math.cos(x * 1.1)) * 0.35;
  return s + Math.sin((x + y) * 3.1) * 0.15;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Shared time uniform so ambient animation can pause independently of narration. */
export const sharedTime = { value: 0 };

/** Adds animated sunlight caustics to a standard material (seafloor, rocks). */
export function withCaustics(material: THREE.MeshStandardMaterial, strength = 0.35) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.uniforms.uCausticStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOeWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vOeWorld;
uniform float uTime;
uniform float uCausticStrength;
float oeCaustic(vec2 p, float t) {
  float c = 0.0;
  c += sin(p.x * 2.1 + t * 0.9 + sin(p.y * 1.7 + t * 0.6));
  c += sin(p.y * 2.6 - t * 0.7 + sin(p.x * 1.3 - t * 0.5));
  c += sin((p.x + p.y) * 1.6 + t * 0.4);
  c = c / 3.0;
  return pow(max(0.0, 1.0 - abs(c) * 1.6), 4.0);
}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float oeUp = clamp(normal.y, 0.0, 1.0);
totalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * oeCaustic(vOeWorld.xz * 2.4, uTime) * uCausticStrength * (0.4 + 0.6 * oeUp);`,
      );
  };
  return material;
}

/** Disposes every geometry and material under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

/** Tags a group and all its meshes as belonging to a selectable organism. */
export function tagOrganism(root: THREE.Object3D, id: string) {
  root.userData.organismId = id;
  root.traverse((o) => {
    o.userData.organismId = id;
  });
}
