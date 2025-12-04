// deno-lint-ignore-file no-explicit-any
import * as THREE from "three";
import { SceneManager } from "./SceneManager.ts";
import { PhysicsEngine } from "./PhysicsEngine.ts";

// #region - Types ----------
type MeshState = {
  uuid: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
  color: number | null;
  visible: boolean;
  mass: number;
};

type SceneState = {
  key: string;
  meshes: MeshState[];
};

// #region - Classes ----------
export class SaveManager {
  private sceneManager: SceneManager;
  private physics: PhysicsEngine;
  private mainCube: THREE.Mesh;
  private invBox: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private grounds: { [k: string]: THREE.Mesh };
  private autosaveId: number | null = null;
  private storageKey = "cmpm121_save";
  private isDragging = false;
  private tutorialStep: number = 0;
  private language: string = "english";

  constructor(opts: {
    sceneManager: SceneManager;
    physics: PhysicsEngine;
    mainCube: THREE.Mesh;
    invBox: HTMLElement;
    renderer: THREE.WebGLRenderer;
    grounds: { [k: string]: THREE.Mesh };
    tutorialStep?: number;
    language?: string;
  }) {
    this.sceneManager = opts.sceneManager;
    this.physics = opts.physics;
    this.mainCube = opts.mainCube;
    this.invBox = opts.invBox;
    this.renderer = opts.renderer;
    this.grounds = opts.grounds;
    this.tutorialStep = opts.tutorialStep ?? 0;
    this.language = opts.language ?? "english";
  }

  // Public method to update dragging state
  setDragging(dragging: boolean): void {
    this.isDragging = dragging;
  }

  // Public method to update tutorial step
  setTutorialStep(tutorialStep: number): void {
    this.tutorialStep = tutorialStep;
  }

  // Public method to update language
  setLanguage(language: string): void {
    this.language = language;
  }

  // #region - Save ----------
  save(): void {
    // Ensure any scene graph transforms are up-to-date
    const entries = this.sceneManager.getAllEntries();

    // Build scenes array using LOCAL transforms (simpler: local = what we see in scene)
    const scenes: SceneState[] = entries.map(({ key, scene }) => {
      const meshes = scene.getMeshes()
        .filter((m) => {
          // Skip ground meshes - they have fixed collision sizes and shouldn't be saved
          if (
            this.grounds &&
            Object.values(this.grounds).some((g) => g?.uuid === m.uuid)
          ) return false;
          return true;
        })
        .map((m) => {
          m.updateMatrixWorld(true);

          return {
            uuid: m.uuid,
            position: [m.position.x, m.position.y, m.position.z] as [
              number,
              number,
              number,
            ],
            quaternion: [
              m.quaternion.x,
              m.quaternion.y,
              m.quaternion.z,
              m.quaternion.w,
            ] as [number, number, number, number],
            scale: [m.scale.x, m.scale.y, m.scale.z] as [
              number,
              number,
              number,
            ],
            color:
              (m.material && (m.material as THREE.MeshStandardMaterial).color)
                ? (m.material as THREE.MeshStandardMaterial).color.getHex()
                : null,
            visible: m.visible,
            mass: m.userData.mass ?? 0,
          } as MeshState;
        });

      return { key, meshes };
    });

    // Inventory state (same as before)
    const invItem = document.getElementById("invItem");

    // Find which scene the mainCube is currently in
    let mainCubeSceneKey: string | null = null;
    for (const { key, scene } of entries) {
      if (scene.getMeshes().includes(this.mainCube)) {
        mainCubeSceneKey = key;
        break;
      }
    }

    const data = {
      scenes,
      mainCubeState: {
        position: [
          this.mainCube.position.x,
          this.mainCube.position.y,
          this.mainCube.position.z,
        ] as [number, number, number],
        quaternion: [
          this.mainCube.quaternion.x,
          this.mainCube.quaternion.y,
          this.mainCube.quaternion.z,
          this.mainCube.quaternion.w,
        ] as [number, number, number, number],
        scale: [
          this.mainCube.scale.x,
          this.mainCube.scale.y,
          this.mainCube.scale.z,
        ] as [number, number, number],
        color: (this.mainCube.material &&
            (this.mainCube.material as THREE.MeshStandardMaterial).color)
          ? (this.mainCube.material as THREE.MeshStandardMaterial).color
            .getHex()
          : null,
        visible: this.mainCube.visible,
        mass: this.mainCube.userData.mass ?? 0,
        sceneKey: mainCubeSceneKey, // Save which scene it belongs to
      },
      inventory: {
        inInventory: this.mainCube.visible === false && !!invItem,
        invItemColor: invItem
          ? (invItem as HTMLElement).style.background || null
          : null,
      },
      activeScene: this.sceneManager.getCurrentSceneKey(),
      darkMode: this.invBox.classList.contains("dark"),
      tutorialStep: this.tutorialStep,
      language: this.language,
      savedAt: Date.now(),
    };

    // Debug logs
    try {
      //console.log("[SaveManager] saving mainCube:", data.mainCubeState);
      //console.log("[SaveManager] mainCube local position before save:", { x: this.mainCube.position.x, y: this.mainCube.position.y, z: this.mainCube.position.z });
      //console.log("[SaveManager] saving tutorialStep:", data.tutorialStep);
      //console.log("[SaveManager] saving language:", data.language);
    } catch (_e) { /* ignore */ }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // #region - Load ----------
  load(): boolean {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      console.log("[SaveManager] No save found");
      return false;
    }
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (_e) {
      //console.log("[SaveManager] Failed to parse save");
      return false;
    }
    if (!data || !data.scenes) {
      //console.log("[SaveManager] Invalid save data");
      return false;
    }

    console.log("[SaveManager] Loading save:", data);

    // Restore meshes (skip mainCube for now, handle it separately to avoid duplicate physics registration)
    for (const s of data.scenes as SceneState[]) {
      const entry = this.sceneManager.getAllEntries().find((e) =>
        e.key === s.key
      );
      if (!entry) continue;
      const scene = entry.scene;
      for (const mstate of s.meshes) {
        // Skip mainCube in this loop—we handle it separately later
        if (mstate.uuid === this.mainCube.uuid) continue;

        // Skip ground meshes - they have fixed collision sizes and shouldn't be scaled from saves
        if (
          this.grounds &&
          Object.values(this.grounds).some((g) => g?.uuid === mstate.uuid)
        ) continue;

        const mesh = scene.getMeshes().find((mm) => mm.uuid === mstate.uuid);
        if (!mesh) continue;

        try {
          if (mesh.userData.physicsBody) this.physics.removeMesh(mesh);
        } catch (_e) { /* ignore */ }

        if ((mesh.userData.mass ?? 0) > 0) {
          this.physics.addMesh(mesh, mesh.userData.mass ?? 0);
        }

        if (mstate.position) {
          mesh.position.set(
            mstate.position[0],
            mstate.position[1],
            mstate.position[2],
          );
        }

        if (mstate.quaternion) {
          mesh.quaternion.set(
            mstate.quaternion[0],
            mstate.quaternion[1],
            mstate.quaternion[2],
            mstate.quaternion[3],
          );
        }

        if (mstate.scale) {
          mesh.scale.set(mstate.scale[0], mstate.scale[1], mstate.scale[2]);
        }

        mesh.updateMatrixWorld(true);

        if (mesh.userData.physicsBody) {
          const body = mesh.userData.physicsBody;
          body.position.copy(mesh.position);
          body.quaternion.copy(mesh.quaternion);
        }

        if (
          mstate.color && mesh.material &&
          (mesh.material as THREE.MeshStandardMaterial).color
        ) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(
            mstate.color,
          );
        }

        mesh.visible = !!mstate.visible;
        mesh.userData.mass = mstate.mass ?? mesh.userData.mass;

        try {
          if (mesh.userData.physicsBody) this.physics.removeMesh(mesh);
        } catch (_e) {
          /* ignore */
        }
        if ((mesh.userData.mass ?? 0) > 0) {
          this.physics.addMesh(mesh, mesh.userData.mass ?? 0);
        }
      }
    }

    // Inventory
    if (data.inventory && data.inventory.inInventory) {
      // Put main cube into inventory
      try {
        if (this.mainCube.userData.physicsBody) {
          this.physics.removeMesh(this.mainCube);
        }
      } catch (_e) {
        /* ignore */
      }
      this.mainCube.visible = false;
      if (data.inventory.invItemColor) {
        const existing = document.getElementById("invItem");
        if (existing) existing.remove();
        const it = document.createElement("div");
        it.id = "invItem";
        it.className = "inv-item";
        it.style.background = data.inventory.invItemColor;
        this.invBox.appendChild(it);
      }
    } else {
      this.mainCube.visible = true;
    }

    // Place mainCube in its saved scene if found, and restore its transform from saved mesh state
    // If we have saved mainCube state, use it directly (no UUID matching needed)
    const cubeMeshState = data.mainCubeState as MeshState & {
      sceneKey?: string;
    };

    // Use the saved scene key if available, otherwise fall back to active scene
    let cubeSceneKey: string | null = cubeMeshState?.sceneKey ?? null;
    if (!cubeSceneKey && data.activeScene) {
      cubeSceneKey = data.activeScene;
    }

    if (cubeSceneKey) {
      const entry = this.sceneManager.getAllEntries().find((e) =>
        e.key === cubeSceneKey
      );
      if (entry) {
        // ensure cube is only in that scene
        for (const e of this.sceneManager.getAllEntries()) {
          try {
            e.scene.removeMesh(this.mainCube);
          } catch (_ex) { /* ignore */ }
        }
        entry.scene.addMesh(this.mainCube, this.mainCube.userData.mass ?? 1);
      }
    }
    // Always restore mainCube transform from saved mesh state if present
    // This must happen AFTER addMesh so physics body exists but BEFORE inventory override
    if (cubeMeshState) {
      //console.log("[SaveManager] Restoring mainCube from saved state:", cubeMeshState);
      if (cubeMeshState.position) {
        this.mainCube.position.set(...cubeMeshState.position);
      }
      if (cubeMeshState.quaternion) {
        this.mainCube.quaternion.set(...cubeMeshState.quaternion);
      }
      if (cubeMeshState.scale) this.mainCube.scale.set(...cubeMeshState.scale);
      //console.log("[SaveManager] mainCube position after restore:", { x: this.mainCube.position.x, y: this.mainCube.position.y, z: this.mainCube.position.z });
      if (
        cubeMeshState.color && this.mainCube.material &&
        (this.mainCube.material as THREE.MeshStandardMaterial).color
      ) {
        (this.mainCube.material as THREE.MeshStandardMaterial).color.setHex(
          cubeMeshState.color,
        );
      }
      this.mainCube.visible = !!cubeMeshState.visible;
      this.mainCube.userData.mass = cubeMeshState.mass ??
        this.mainCube.userData.mass;
      this.mainCube.updateMatrixWorld(true);
      // Sync physics body transform
      try {
        if (this.mainCube.userData.physicsBody) {
          const body = this.mainCube.userData.physicsBody;
          body.position.copy(this.mainCube.position);
          body.quaternion.copy(this.mainCube.quaternion);
        }
      } catch (_e) { /* ignore */ }
    } else {
      //console.log("[SaveManager] No saved mainCube mesh state found");
    }

    // Theme
    if (data.darkMode) {
      this.invBox.classList.add("dark");
      this.renderer.setClearColor(0x000000, 1);
    } else {
      this.invBox.classList.remove("dark");
      this.renderer.setClearColor(0xffffff, 1);
    }

    // Active scene
    if (data.activeScene) this.sceneManager.switchScene(data.activeScene);

    // Tutorial step
    if (typeof data.tutorialStep === "number") {
      this.tutorialStep = data.tutorialStep;
      (globalThis as any).tutorialStep = this.tutorialStep;
      try {
        (globalThis as any).updateTutorial();
      } catch (_e) { /* ignore */ }
    }

    // Language
    if (typeof data.language === "string") {
      this.language = data.language;
      (globalThis as any).language = this.language;
      try {
        (globalThis as any).setLanguage(this.language);
      } catch (_e) { /* ignore */ }
    }

    return true;
  }

  // #region - Reset ----------
  reset(): void {
    // Remove saved state
    localStorage.removeItem(this.storageKey);

    // Clear inventory UI and win/fail messages
    const invItem = document.getElementById("invItem");
    if (invItem) invItem.remove();

    const successMsg = document.getElementById("success");
    if (successMsg) successMsg.remove();

    const failMsg = document.getElementById("fail");
    if (failMsg) failMsg.remove();

    // Reset tutorial step
    this.tutorialStep = 0;
    (globalThis as any).tutorialStep = 0;
    try {
      (globalThis as any).updateTutorial();
      //console.log(`[SaveManager] Tutorial step reset to 0`);
    } catch (_e) { /* ignore */ }

    // Reset mainCube
    try {
      if (this.mainCube.userData.physicsBody) {
        this.physics.removeMesh(this.mainCube);
      }
    } catch (_e) { /* ignore */ }
    this.mainCube.position.set(0, -4, 0);
    this.mainCube.quaternion.set(0, 0, 0, 1);
    this.mainCube.scale.set(1, 1, 1);
    this.mainCube.visible = true;
    this.mainCube.userData.mass = 1;

    // Put cube into default scene (first scene in manager)
    const first = this.sceneManager.getAllEntries()[0];
    if (first) {
      for (const e of this.sceneManager.getAllEntries()) {
        try {
          e.scene.removeMesh(this.mainCube);
        } catch (_e) { /* ignore */ }
      }
      first.scene.addMesh(this.mainCube, 1);
    }

    // Reset ground objects if provided (use correct original scales)
    if (this.grounds) {
      const g1 = this.grounds["ground1"];
      const g2 = this.grounds["ground2"];
      const wg = this.grounds["winGround"];
      const fg = this.grounds["failGround"];
      if (g1) {
        g1.position.set(0, -5, 0);
        g1.scale.set(1, 1, 1);
      }
      if (g2) {
        g2.position.set(0, -5, 0);
        g2.scale.set(1, 1, 1);
      }
      if (wg) {
        wg.position.set(5, -4, 0);
        wg.scale.set(1, 1, 1);
      }
      if (fg) {
        fg.position.set(-5, -4, 0);
        fg.scale.set(1, 1, 1);
      }
    }

    // Switch to first scene
    const firstKey = this.sceneManager.getAllEntries()[0]?.key;
    if (firstKey) this.sceneManager.switchScene(firstKey);

    // Save defaults so reload uses them
    this.save();
  }

  // #region - Autosave ----------
  startAutoSave(intervalMs = 5000) {
    this.stopAutoSave();
    //console.log("[SaveManager] Starting autosave every", intervalMs, "ms");
    try {
      this.autosaveId = globalThis.setInterval(() => {
        try {
          // Only autosave if cube is at rest
          if (this.isCubeAtRest()) {
            console.log("[SaveManager] Autosave triggered");
            this.save();
          } else {
            console.log("[SaveManager] Skipping autosave - cube is moving");
          }
        } catch (_e) {
          console.error("[SaveManager] Autosave error:", _e);
        }
      }, intervalMs) as unknown as number;
    } catch (_e) {
      //console.error("[SaveManager] Failed to start autosave:", _e);
      this.autosaveId = null;
    }
  }

  private isCubeAtRest(): boolean {
    // Don't save while dragging
    if (this.isDragging) return false;

    // Check if cube has a physics body and if its velocity is near-zero
    const body = this.mainCube.userData.physicsBody;
    if (!body) return true; // No physics body, consider it at rest

    try {
      const vel = body.getLinearVelocity();
      const angVel = body.getAngularVelocity();

      // Check if both linear and angular velocities are very small (threshold: 0.1)
      const velMag = Math.sqrt(vel.x() ** 2 + vel.y() ** 2 + vel.z() ** 2);
      const angVelMag = Math.sqrt(
        angVel.x() ** 2 + angVel.y() ** 2 + angVel.z() ** 2,
      );

      return velMag < 0.1 && angVelMag < 0.1;
    } catch (_e) {
      // If we can't check velocity, assume at rest
      return true;
    }
  }

  stopAutoSave() {
    if (this.autosaveId !== null) {
      try {
        globalThis.clearInterval(this.autosaveId);
      } catch (_e) { /* ignore */ }
      this.autosaveId = null;
    }
  }
}
