// deno-lint-ignore-file no-explicit-any
import * as THREE from "three";
import { PhysicsEngine } from "./PhysicsEngine.ts";

export class GameScene {
  public scene: THREE.Scene;
  public physics: PhysicsEngine;

  private objects: THREE.Mesh[] = [];
  private lights: THREE.Light[] = [];

  constructor(physics: PhysicsEngine) {
    this.scene = new THREE.Scene();
    this.physics = physics;
  }

  // ---------- Mesh Methods ----------
  addMesh(mesh: THREE.Mesh, mass: number = 0) {
    this.objects.push(mesh);
    this.scene.add(mesh);

    this.physics.addMesh(mesh, mass);
  }

  removeMesh(mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    this.physics.removeMesh(mesh);
    this.objects = this.objects.filter((obj) => obj !== mesh);
  }

  // ---------- Light Methods ----------
  addLight(light: THREE.Light) {
    this.lights.push(light);
    this.scene.add(light);
  }

  removeLight(light: THREE.Light) {
    this.scene.remove(light);
    this.lights = this.lights.filter((l) => l !== light);
  }

  // ---------- Save Scene State ----------
  saveState(): { meshes: any[]; lights: any[] } {
    const meshesState = this.objects.map((mesh) => ({
      id: mesh.uuid,
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      color: (mesh.material as THREE.MeshStandardMaterial).color.getHex(),
    }));

    const lightsState = this.lights.map((light) => ({
      id: light.uuid,
      type: light.type,
      position: light.position.clone(),
      rotation: light.rotation.clone(),
      color: light.color.getHex(),
      intensity: light.intensity,
    }));

    return { meshes: meshesState, lights: lightsState };
  }

  // ---------- Load Scene State ----------
  loadState(state: { meshes: any[]; lights: any[] }) {
    state.meshes.forEach((meshState, i) => {
      const mesh = this.objects[i];
      if (!mesh) return;

      mesh.position.copy(meshState.position);
      mesh.rotation.copy(meshState.rotation);
      mesh.scale.copy(meshState.scale);
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(
        meshState.color,
      );
    });

    state.lights.forEach((lightState, i) => {
      const light = this.lights[i];
      if (!light) return;

      light.position.copy(lightState.position);
      light.rotation.copy(lightState.rotation);
      light.color.setHex(lightState.color);
      light.intensity = lightState.intensity;
    });
  }

  // ---------- Clear Scene ----------
  clear() {
    this.objects.forEach((mesh) => this.scene.remove(mesh));
    this.lights.forEach((light) => this.scene.remove(light));
    this.objects = [];
    this.lights = [];
  }

  // Expose meshes so external code can operate on per-scene objects
  getMeshes(): THREE.Mesh[] {
    return this.objects;
  }
}
