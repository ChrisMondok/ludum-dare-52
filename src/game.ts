import {Level} from './level.js';
import {deserialize} from './serialization.js';
import {Entity} from './main.js';
import {Camera} from './camera.js';

export class Game implements Entity {
  level: Level;

  paused = false;

  constructor(readonly levels: Level[]) {
    this.level = levels[0];
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
    if(!this.paused) this.level.tick(dt);
  }

  draw(camera: Camera) {
    this.level.draw(camera);

    if(this.paused) {
      camera.ctx.save();
      camera.ctx.textAlign = 'center';
      camera.ctx.textBaseline = 'middle';
      camera.ctx.font = '72pt sans';
      camera.ctx.fillText('Paused', camera.width / 2, camera.height / 2);
      camera.ctx.restore();
    }
  }
}
