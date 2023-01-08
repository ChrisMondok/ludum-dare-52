import {Point} from './math.js';
import {Camera} from './camera.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';
import {Enemy} from './enemy.js';
import {Editor} from './editor.js';

export class Spawner implements Entity, Point {
  @persistent() readonly enemy!: Enemy;
  @persistent() timeUntilSpawned!: number;

  get x() {
    return this.enemy.x;
  }
  
  get y() {
    return this.enemy.y;
  }

  // note: ctor args will not be set when deserializing!
  constructor(enemy: Enemy, delay: number) {
    this.enemy = enemy;
    this.timeUntilSpawned = delay;
  }

  level!: Level;

  tick(dt: number) {
    if(!this.enemy) throw new Error(`EnemySpawner wasn't set up right`);
    this.timeUntilSpawned -= dt;
    if(this.timeUntilSpawned <= 0) {
      this.level.remove(this);
      this.level.add(this.enemy);
    }
  }

  draw({ctx}: Camera) {
    if(!Editor.active) return;
    ctx.save();
    ctx.fillStyle = 'coral';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();
    ctx.fillText(this.timeUntilSpawned.toFixed(2), this.x, this.y - 10);
  }
}

