import {Circle, touches} from './math.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Camera} from './camera.js';
import {GRAVITY} from './constants.js';
import {Level} from './level.js';
import {Terrain} from './terrain.js';

export class Seed implements Entity, Circle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;

  @persistent() level!: Level;

  readonly radius = 4;

  tick(dt: number) {
    const heightAboveGround = Terrain.getDistanceToGround(this.level, this);
    this.x += this.dx * dt;
    this.y += Math.min(this.dy * dt, heightAboveGround);
    if(heightAboveGround > 0) {
      this.dy += GRAVITY * dt;
    } else {
      this.dy = Math.min(this.dy, 0);
    }

    if(!touches(this.level, this)) {
      this.level.remove(this);
    }
  }

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();
  }

  toString() {
    return `seed at ${this.x}, ${this.y}`;
  }
}
