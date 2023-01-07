import {GRID_SIZE} from './constants.js';
import {Entity} from './main.js';
import {Level} from './level.js';
import {persistent} from './serialization.js';
import {Shape, Rectangle, getBottomOf, getTopOf, getRightOf, getLeftOf} from './math.js';
import {Camera} from './camera.js';

export class Terrain implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() width = 0;
  @persistent() height = 0;
  readonly xOrigin = 'left';
  readonly yOrigin = 'top';

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = '#835835';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#4b3625';
    ctx.fillRect(this.x, this.y, this.width, Math.min(this.height, GRID_SIZE));
    ctx.fillStyle = '#7fb054';
    ctx.fillRect(this.x, this.y, this.width, Math.min(this.height, GRID_SIZE / 2));
    ctx.restore();
  }

  isBelow(shape: Shape) {
    if(getLeftOf(this) > getRightOf(shape)) return false;
    if(getRightOf(this) < getLeftOf(shape)) return false;
    return getBottomOf(shape) <= getTopOf(this);
  }

  isAbove(shape: Shape) {
    if(getLeftOf(this) > getRightOf(shape)) return false;
    if(getRightOf(this) < getLeftOf(shape)) return false;
    return getTopOf(shape) >= getBottomOf(this);
  }

  toString() {
    return `terrain from ${this.x}, ${this.y} to ${this.x + this.width}, ${this.y + this.height}`;
  }

  static getDistanceToGround(level: Level, shape: Shape) {
    const g = this.getGroundBelow(level, shape);
    if(!g) return Infinity;
    return getTopOf(g) - getBottomOf(shape);
  }

  static getGroundBelow(level: Level, point: Shape): Terrain|null {
    let ground: Terrain|null = null;
    for(let t of level.getEntitiesOfType(Terrain)) {
      if(!t.isBelow(point)) continue;
      if(!ground) {
        ground = t;
      } else if(t.y < ground.y) {
        ground = t;
      }
    }
    return ground;
  }

  static getDistanceToCeiling(level: Level, shape: Shape) {
    const g = this.getCeilingAbove(level, shape);
    if(!g) return Infinity;
    return getTopOf(shape) - getBottomOf(g);
  }

  static getCeilingAbove(level: Level, point: Shape): Terrain|null {
    let ceiling: Terrain|null = null;
    for(let t of level.getEntitiesOfType(Terrain)) {
      if(!t.isAbove(point)) continue;
      if(!ceiling) {
        ceiling = t;
      } else if(t.y > ceiling.y) {
        ceiling = t;
      }
    }
    return ceiling;
  }
}
