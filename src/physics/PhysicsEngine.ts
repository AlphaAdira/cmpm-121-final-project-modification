import * as THREE from "three";
import { AmmoPhysics } from "three/addons/physics/AmmoPhysics.js";

// The shape of the actual AmmoPhysics object returned by the library
export interface AmmoPhysicsObject {
  addMesh(mesh: THREE.Mesh, mass?: number): void;
  // Add update function (not included in ammo.js by default)
  update(deltaTime: number): void;
}

export class PhysicsEngine {
  private physics!: AmmoPhysicsObject;
  private ready = false;

  async init() {
    this.physics = await AmmoPhysics() as unknown as AmmoPhysicsObject;
    this.ready = true;
    console.log("%c[Physics] Ready.", "color:#4caf50");
  }

  isReady() {
    return this.ready;
  }

  /** Adds any mesh with an optional mass */
  addMesh(mesh: THREE.Mesh, mass: number = 1) {
    if (!this.ready) throw new Error("Physics not initialized yet.");
    this.physics.addMesh(mesh, mass);
    return mesh;
  }

  /** Creates a physics-enabled box */
  addBox(size: THREE.Vector3, position: THREE.Vector3, mass: number = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);

    this.physics.addMesh(cube, mass);
    return cube;
  }

  /** Creates a physics-enabled sphere */
  addSphere(radius: number, position: THREE.Vector3, mass: number = 1, color = 0xffffff) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);

    this.physics.addMesh(sphere, mass);
    return sphere;
  }
}