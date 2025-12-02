// deno-lint-ignore-file no-explicit-any
import * as THREE from "three";

export class PhysicsEngine {
  private Ammo: any;
  private physicsWorld: any;
  private rigidBodies: THREE.Mesh[] = [];
  private tmpTransform: any;

  private ready = false;
  isReady() {
    return this.ready;
  }

  constructor() {}

  async init() {
    // Load Ammo.js
    // If using ES module Ammo, modify accordingly
    // @ts-ignore - global Ammo
    this.Ammo = await Ammo();

    const gravity = new this.Ammo.btVector3(0, -9.81, 0);

    const config = new this.Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.Ammo.btCollisionDispatcher(config);
    const broadphase = new this.Ammo.btDbvtBroadphase();
    const solver = new this.Ammo.btSequentialImpulseConstraintSolver();

    this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      config,
    );
    this.physicsWorld.setGravity(gravity);

    this.tmpTransform = new this.Ammo.btTransform();
    this.ready = true;
  }

  // ------------------------------------------------------
  // Create & register a physics box mesh
  // ------------------------------------------------------
  addBox(
    size: THREE.Vector3,
    position: THREE.Vector3,
    mass: number,
    color: number = 0xffffff,
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(position);

    this.addMesh(mesh, mass);
    return mesh;
  }

  // ------------------------------------------------------
  // Add a mesh into the physics world
  // ------------------------------------------------------
  addMesh(mesh: THREE.Mesh, mass: number) {
    if (!this.ready) return;

    // Remove old body if replacing
    if (mesh.userData.physicsBody) {
      this.removeMesh(mesh);
    }

    const { Ammo } = this;

    // Get box size from geometry bounds
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const halfExtents = new Ammo.btVector3(
      (box.max.x - box.min.x) * 0.5,
      (box.max.y - box.min.y) * 0.5,
      (box.max.z - box.min.z) * 0.5,
    );

    const shape = new Ammo.btBoxShape(halfExtents);
    shape.setMargin(0.05);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

    const quaternion = mesh.quaternion;
    transform.setRotation(
      new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
    );

    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    if (mass > 0) shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia,
    );
    const body = new Ammo.btRigidBody(rbInfo);

    // Store reference
    mesh.userData.physicsBody = body;

    // Add to world
    this.physicsWorld.addRigidBody(body);

    if (mass > 0) {
      this.rigidBodies.push(mesh);
    }
  }

  // ------------------------------------------------------
  // Remove mesh from physics world
  // ------------------------------------------------------
  removeMesh(mesh: THREE.Mesh) {
    const body = mesh.userData.physicsBody;
    if (!body) return;

    this.physicsWorld.removeRigidBody(body);

    // Remove from rigid body list
    this.rigidBodies = this.rigidBodies.filter((m) => m !== mesh);

    mesh.userData.physicsBody = null;
  }

  // ------------------------------------------------------
  // Update physics simulation
  // ------------------------------------------------------
  update(deltaTime: number) {
    if (!this.ready) return;

    const { physicsWorld, tmpTransform } = this;

    physicsWorld.stepSimulation(deltaTime, 10);

    // Sync rigid bodies back to mesh transforms
    for (const mesh of this.rigidBodies) {
      const body = mesh.userData.physicsBody;
      if (!body) continue;

      // Skip rigid body update while user is dragging (kinematic override)
      if (mesh.userData.kinematic === true) {
        continue;
      }

      const motionState = body.getMotionState();
      if (motionState) {
        motionState.getWorldTransform(tmpTransform);

        const origin = tmpTransform.getOrigin();
        const rotation = tmpTransform.getRotation();

        mesh.position.set(origin.x(), origin.y(), origin.z());
        mesh.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
      }
    }
  }
}
