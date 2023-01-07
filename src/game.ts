import {Level} from './level.js';
import {Player} from './player.js';
import {Terrain} from './terrain.js';
import {GRID_SIZE} from './constants.js';
import {Entity} from './main.js';
import {Camera} from './camera.js';

export class Game implements Entity {
  levels: Level[];

  currentLevel: Level;

  constructor() {
    const level = new Level();
    level.add(new Player());
    const ground = new Terrain();
    ground.x = GRID_SIZE * 4;
    ground.y = GRID_SIZE * 10;
    ground.width = GRID_SIZE * 16;
    ground.height = GRID_SIZE * 2;
    level.add(ground);
    this.levels = [level];
    this.currentLevel = level;
  }

  tick(dt: number) {
    this.currentLevel.tick(dt);
  }

  draw(camera: Camera) {
    this.currentLevel.draw(camera);
  }
}
