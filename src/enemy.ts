import {GRID_SIZE, GRAVITY} from './constants.js';
import {Player} from './player.js';
import {Rectangle, Shape, Point, getBottomOf, getTopOf, getRightOf, getLeftOf, clamp, distSquared} from './math.js';
import {Camera} from './camera.js';
import {Terrain} from './terrain.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';

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
    // if(!Editor.active) return;
    ctx.save();
    ctx.fillStyle = 'coral';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();
    ctx.fillText(this.timeUntilSpawned.toFixed(2), this.x, this.y - 10);
  }
}

export class Enemy implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;

  maxDistanceFromPlayer = GRID_SIZE * 8;
  minDistanceFromPlayer = GRID_SIZE * 3;


  width = GRID_SIZE / 2;
  height = GRID_SIZE;
  jumpDelay = 2;
  jumpSpeed = GRAVITY / 4;
  walkSpeed = 15 * GRID_SIZE;
  groundAcceleration = 50 * GRID_SIZE;

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
    if(this.moveTarget) {
      ctx.strokeStyle = 'red';
      ctx.strokeRect(this.moveTarget.x - 5.5, this.moveTarget.y - 5.5, 10, 10);
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.moveTarget.x, this.moveTarget.y);
      ctx.stroke();
    }

    if(this.target) {
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, this.minDistanceFromPlayer, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, this.maxDistanceFromPlayer, 0, Math.PI, true);
      ctx.stroke();
    }
    ctx.restore();
  }

  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';

  level!: Level;

  target: (Entity&Shape)|null = null;

  @persistent() moveTarget: Point = {x: this.x, y: this.y};

  private timeSpentOnWrongTerrain = 0;

  tick(dt: number) {
    this.updateTargets();

    const myTerrain = Terrain.getGroundBelow(this.level, this);
    const targetTerrain = Terrain.getGroundBelow(this.level, this.moveTarget);
    const heightAboveGround = myTerrain ? getTopOf(myTerrain) - getBottomOf(this) : Infinity;

    // Enemies can't walk out of bounds
    this.x = clamp(this.x + this.dx * dt, getLeftOf(this.level), getRightOf(this.level));
    // Enemies can go up through terrain
    this.y += Math.min(this.dy * dt, heightAboveGround);

    if(heightAboveGround > 0) {
      // in the air
      this.dy += GRAVITY * dt;
      this.timeSpentOnWrongTerrain = 0;
      return;
    }

    // don't fall through the ground
    this.dy = Math.min(this.dy, 0);

    if(!myTerrain || !targetTerrain) {
      console.log(`I don't know what this means`);
      this.walk(this, dt);
      return;
    }

    if(myTerrain === targetTerrain || targetTerrain.isBelow(this.moveTarget) && this.y < getTopOf(targetTerrain)) {
      this.walk(this.moveTarget, dt);
      return;
    } 

    // we have to jump
    this.walk(this, dt);
    this.timeSpentOnWrongTerrain += dt;

    if(this.timeSpentOnWrongTerrain > this.jumpDelay) {
      if(targetTerrain) {
        this.jump();
      } else {
        throw new Error(`Trying to jump to nowhere`);
      }
    }
    
  }

  private walk(to: Point, dt: number) {
    const targetSpeed = distSquared(to, this) < Math.pow(GRID_SIZE, 2)
      ? 0
      : Math.sign(to.x - this.x) * this.walkSpeed;
    if(targetSpeed !== 0 && this.dx !== 0 && Math.sign(targetSpeed) !== Math.sign(this.dx)) {
      this.dx = 0;
    } else {
      // accelerate
      let delta = targetSpeed - this.dx;
      const maxAccel = this.groundAcceleration * dt;
      delta = Math.max(Math.min(delta, maxAccel), -maxAccel);
      this.dx += delta;
    }
  }

  private jump() {
    const climb = this.moveTarget.y - this.y;
    const timeToTop = this.jumpSpeed / GRAVITY;
    const jumpHeight = this.jumpSpeed * timeToTop + GRAVITY * Math.pow(timeToTop, 2) / 2;
    if(jumpHeight > climb) {
      const fallingDistance = jumpHeight - climb;
      const timeToFall = Math.sqrt(2 * fallingDistance / GRAVITY);
      const jumpTime = timeToTop + timeToFall;
      this.dy = -1 * this.jumpSpeed;
      this.dx = (this.moveTarget.x - this.x) / jumpTime;
      console.table({dx: this.dx, dy:  this.dy});
      // jumps always come up, consistently, a little short and I can't figure out why.
      this.dx *= 1.6;
    } else {
      console.log(`I can't jump that far`);
    }
    this.timeSpentOnWrongTerrain = 0;
  }

  private updateTargets() {
    if(this.target && this.level.entities.indexOf(this.target) === -1)  {
      this.target = null;
    }
    if(!this.target) {
      this.target = this.level.closest(Player, this);
      console.log(`target is ${this.target}`);
    }

    if(!this.target) return;

    const targetTerrain = Terrain.getGroundBelow(this.level, this.target);

    if(!targetTerrain) return;
    this.moveTarget.y = getTopOf(targetTerrain);

    if(this.x > this.target.x) {
      this.moveTarget.x = clamp(this.x, this.target.x + this.minDistanceFromPlayer, this.target.x + this.maxDistanceFromPlayer);
    } else {
      this.moveTarget.x = clamp(this.x, this.target.x - this.minDistanceFromPlayer, this.target.x - this.maxDistanceFromPlayer);
    }

    this.moveTarget.x = clamp(this.moveTarget.x, getLeftOf(targetTerrain) + this.width, getRightOf(targetTerrain) - this.width);

    const myTerrain = Terrain.getGroundBelow(this.level, this);
    if(myTerrain && myTerrain !== targetTerrain) {
      const fallPoint = this.getFallPoint(myTerrain, targetTerrain);
      if(fallPoint) this.moveTarget = fallPoint;
    }
  }

  private getFallPoint(fromTerrain: Terrain, toTerrain: Terrain): Point|null {
    if(!this.target) return null;
    const leftEdge = {x: getLeftOf(fromTerrain) - this.width, y: getTopOf(fromTerrain)};
    const rightEdge = {x: getRightOf(fromTerrain) + this.width, y: getTopOf(fromTerrain)};

    if(this.x > this.target.x) {
      if(toTerrain.isBelow(leftEdge)) return leftEdge;
      if(toTerrain.isBelow(rightEdge)) return rightEdge;
    } else {
      if(toTerrain.isBelow(rightEdge)) return rightEdge;
      if(toTerrain.isBelow(leftEdge)) return leftEdge;
    }
    return null;
  }
}
