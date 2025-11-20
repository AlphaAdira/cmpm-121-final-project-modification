// deno-lint-ignore-file no-explicit-any
import * as THREE from "three";
import { AmmoPhysics } from "three/examples/jsm/physics/AmmoPhysics.js";
import Ammo from "three/examples/jsm/libs/ammo.wasm.js";

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

    if (mass === 0) {
      mesh.userData.kinematic = true;
    } else {
      mesh.userData.kinematic = false;
    }

    return mesh;
  }

  /** Removes a mesh from physics simulation */
  removeMesh(mesh: THREE.Mesh) {
    if (!this.ready) throw new Error("Physics not initialized yet.");

    // Only remove if the mesh has a physics body
    if (mesh.userData.physicsBody) {
      // @ts-ignore:
      this.physics.world.removeRigidBody(mesh.userData.physicsBody);
      delete mesh.userData.physicsBody; // clear the reference
    }
  }

  /** Creates a physics-enabled box */
  addBox(
    size: THREE.Vector3,
    position: THREE.Vector3,
    mass: number = 1,
    color = 0xffffff,
  ) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);

    this.physics.addMesh(cube, mass);
    return cube;
  }

  /** Creates a physics-enabled sphere */
  addSphere(
    radius: number,
    position: THREE.Vector3,
    mass: number = 1,
    color = 0xffffff,
  ) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);

    this.physics.addMesh(sphere, mass);
    return sphere;
  }

  /** Physics body getter */
  public getPhysicsBody(mesh: THREE.Mesh) {
    return mesh.userData.physicsBody; // this is the Ammo.btRigidBody
  }

  /** Removes all physics bodies that are not attached to any mesh in the scene */
  cleanupOrphanBodies(scene: THREE.Scene) {
    if (!this.ready) throw new Error("Physics not initialized yet.");

    // @ts-ignore – AmmoPhysics exposes physicsWorld
    const world = (this.physics as any).physicsWorld;
    if (!world) {
      console.warn("[Physics] physicsWorld not found on AmmoPhysics instance.");
      return;
    }

    const numBodies = world.getNumCollisionObjects();

    // Collect all physics bodies owned by scene meshes
    const meshBodies = new Set<any>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.userData.physicsBody) {
        meshBodies.add(mesh.userData.physicsBody);
      }
    });

    const collisionArray = world.getCollisionObjectArray();
    const toRemove: any[] = [];

    // Find orphan bodies
    for (let i = 0; i < numBodies; i++) {
      const body = collisionArray.at(i);
      if (!meshBodies.has(body)) {
        toRemove.push(body);
      }
    }

    // Remove all orphans
    for (const body of toRemove) {
      world.removeRigidBody(body);
    }

    if (toRemove.length > 0) {
      console.log(`[Physics] Removed ${toRemove.length} orphan rigid bodies`);
    }
  }
}
