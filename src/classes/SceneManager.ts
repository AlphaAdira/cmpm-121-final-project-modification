import { GameScene } from "./GameScene.ts";

export class SceneManager {
  private order: string[] = [];
  private scenes: Map<string, GameScene> = new Map();
  private currentIndex = 0;

  addScene(key: string, scene: GameScene) {
    if (!this.scenes.has(key)) {
      this.order.push(key);
    }
    this.scenes.set(key, scene);
  }

  switchScene(key: string) {
    const index = this.order.indexOf(key);
    if (index === -1) {
      console.warn(`Scene ${key} does not exist`);
      return;
    }
    this.currentIndex = index;
  }

  getCurrentScene(): GameScene | null {
    const key = this.order[this.currentIndex];
    return this.scenes.get(key) ?? null;
  }

  // ---------- Navigation ----------
  goNext() {
    if (this.currentIndex < this.order.length - 1) {
      this.currentIndex++;
    }
  }

  goPrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  getCurrentSceneIndex(): number {
    return this.currentIndex;
  }

  getSceneCount(): number {
    return this.order.length;
  }

  // Return all scenes in order
  getAllScenes(): GameScene[] {
    return this.order.map((k) => this.scenes.get(k)!).filter(Boolean);
  }

  // Return entries [key, scene] in order
  getAllEntries(): Array<{ key: string; scene: GameScene }> {
    return this.order.map((k) => ({ key: k, scene: this.scenes.get(k)! }));
  }

  getCurrentSceneKey(): string | null {
    return this.order[this.currentIndex] ?? null;
  }
}
