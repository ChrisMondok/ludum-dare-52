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
  readonly minTimeBetweenJumps = 2;
  readonly jumpSpeed = GRAVITY / 4;
  readonly walkSpeed = 15 * GRID_SIZE;

  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;

  readonly maxDistanceFromPlayer = GRID_SIZE * 8;
  readonly minDistanceFromPlayer = GRID_SIZE * 3;

  @persistent() width = GRID_SIZE / 2;
  @persistent() height = GRID_SIZE;

  @persistent() jumpCooldown = this.minTimeBetweenJumps;
  readonly groundAcceleration = 50 * GRID_SIZE;

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

    ctx.strokeStyle = 'red';
    ctx.strokeRect(this.moveTarget.x - 5.5, this.moveTarget.y - 5.5, 10, 10);
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.moveTarget.x, this.moveTarget.y);
    ctx.stroke();

    if(this.target) {
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, this.minDistanceFromPlayer, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, this.maxDistanceFromPlayer, 0, Math.PI, true);
      ctx.stroke();
    }

    if(this.jumpTarget) {
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(this.jumpTarget.x - 5.5, this.jumpTarget.y - 5.5, 10, 10);
    }

    ctx.restore();
  }

  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';

  level!: Level;

  target: (Entity&Shape)|null = null;

  @persistent() readonly moveTarget: Point = {x: 0, y: 0};
  @persistent() jumpTarget: Point|null = null;

  tick(dt: number) {
    this.updateTargets();
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

    const myTerrain = Terrain.getGroundBelow(this.level, this);
    const heightAboveGround = myTerrain ? getTopOf(myTerrain) - getBottomOf(this) : Infinity;

    // Enemies can't walk out of bounds
    this.x = clamp(this.x + this.dx * dt, getLeftOf(this.level), getRightOf(this.level));
    // Enemies can go up through terrain
    this.y += Math.min(this.dy * dt, heightAboveGround);

    if(heightAboveGround > 0) {
      // in the air
      this.dy += GRAVITY * dt;
      return;
    }

    // don't fall through the ground
    this.dy = Math.min(this.dy, 0);

    this.walk(this.moveTarget, dt);

    if(this.jumpTarget) {
      this.jump();
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
    if(!this.jumpTarget) return;
    if(this.jumpCooldown > 0) return;
    const climb = this.jumpTarget.y - this.y;
    const timeToTop = this.jumpSpeed / GRAVITY;
    const jumpHeight = this.jumpSpeed * timeToTop + GRAVITY * Math.pow(timeToTop, 2) / 2;
    if(jumpHeight > climb) {
      const fallingDistance = jumpHeight - climb;
      const timeToFall = Math.sqrt(2 * fallingDistance / GRAVITY);
      const jumpTime = timeToTop + timeToFall;
      this.dy = -1 * this.jumpSpeed;
      this.dx = (this.jumpTarget.x - this.x) / jumpTime;
      console.table({dx: this.dx, dy:  this.dy});
      // jumps always come up, consistently, a little short and I can't figure out why.
      this.dx *= 1.6;
      this.jumpCooldown = this.minTimeBetweenJumps;
    } else {
      console.log(`I can't jump that high`);
    }
  }

  private updateTargets() {
    if(this.target && this.level.entities.indexOf(this.target) === -1)  {
      this.target = null;
    }
    if(!this.target) {
      this.jumpTarget = null;
      this.moveTarget.x = this.x;
      this.moveTarget.y = this.y;
      this.target = this.level.closest(Player, this);
      console.log(`target is ${this.target}`);
    }

    if(!this.target) return;

    const myTerrain = Terrain.getGroundBelow(this.level, this);
    const targetTerrain = Terrain.getGroundBelow(this.level, this.target);

    if(!myTerrain || !targetTerrain) {
      this.jumpTarget = null;
      this.moveTarget.x = this.x;
      this.moveTarget.y = this.y;
      return;
    }

    this.moveTarget.y = getTopOf(myTerrain);

    if(myTerrain === targetTerrain) {
      this.jumpTarget = null;
      // set the move target to the target, since we're on the same ground
      if(this.x > this.target.x) {
        this.moveTarget.x = clamp(this.x, this.target.x + this.minDistanceFromPlayer, this.target.x + this.maxDistanceFromPlayer);
      } else {
        this.moveTarget.x = clamp(this.x, this.target.x - this.minDistanceFromPlayer, this.target.x - this.maxDistanceFromPlayer);
      }

      // now keep it within the terrain
      this.moveTarget.x = clamp(this.moveTarget.x, getLeftOf(targetTerrain) + this.width, getRightOf(targetTerrain) - this.width);
    } else {
      const fallPoint = this.getFallPoint(myTerrain, targetTerrain);
      if(fallPoint) {
        this.jumpTarget = null;
        this.moveTarget.x = fallPoint.x;
        this.moveTarget.y = fallPoint.y;
      } else {
        // move to the closest point to the target on my terrain
        this.moveTarget.x = clamp(this.target.x, getLeftOf(myTerrain) + this.width, getRightOf(myTerrain) - this.width);
        this.jumpTarget = {
          x: clamp(this.x, getLeftOf(targetTerrain) + this.width, getRightOf(targetTerrain) - this.width),
          y: getTopOf(targetTerrain),
        };
      }
    }

    //    if(!targetTerrain) return;
    //
    //    this.moveTarget.y = getTopOf(targetTerrain);
    //
    //
    //    if(myTerrain && myTerrain !== targetTerrain) {
    //      const fallPoint = this.getFallPoint(myTerrain, targetTerrain);
    //      if(fallPoint) this.moveTarget = fallPoint;
    //    }
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
