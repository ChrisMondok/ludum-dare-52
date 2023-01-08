import {Shape, Point} from './math.js';
import {Camera} from './camera.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';
import {Editor} from './editor.js';

type Spawnable = Entity&Shape;

export class Spawner implements Entity, Point {
  @persistent() readonly contents!: Spawnable;
  @persistent() timeUntilSpawned!: number;

  get x() {
    return this.contents.x;
  }
  
  get y() {
    return this.contents.y;
  }

  // note: ctor args will not be set when deserializing!
  constructor(contents: Spawnable, delay: number) {
    this.contents = contents;
    this.timeUntilSpawned = delay;
  }

  level!: Level;

  tick(dt: number) {
    if(!this.contents) throw new Error(`Spawner wasn't set up right`);
    this.timeUntilSpawned -= dt;
    if(this.timeUntilSpawned <= 0) {
      this.level.remove(this);
      this.level.add(this.contents);
      this.level.playSoundAt('spawn', this);
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

