import {Level} from './level.js';
import {deserialize} from './serialization.js';
import {Entity} from './main.js';
import {Camera} from './camera.js';

export class Game implements Entity {
  currentLevel: Level;

  constructor(readonly levels: Level[]) {
    this.currentLevel = levels[0];
  }

  static async load(path: string) {
    const response = await fetch(path);
    if(!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const levels = deserialize(await response.text());
    return new Game(levels);
  }

  tick(dt: number) {
    this.currentLevel.tick(dt);
  }

  draw(camera: Camera) {
    this.currentLevel.draw(camera);
  }
}
