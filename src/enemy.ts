import {GRID_SIZE, GRAVITY} from './constants.js';
import {Player} from './player.js';
import {Rectangle, Shape, Point, getBottomOf, getTopOf, getRightOf, getLeftOf, clamp, distSquared, getVerticalCenterOf, randomBetween} from './math.js';
import {Camera} from './camera.js';
import {Terrain} from './terrain.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';
import {DamageBox} from './damage-box.js';
import {Editor} from './editor.js';

export type EnemyArchetype = Partial<Enemy>;

export const SLOW_RANGED_ARCHETYPE: EnemyArchetype = {
  jumpSpeed: GRAVITY / 4,
  walkSpeed: 5 * GRID_SIZE,
  groundAcceleration: 100 * GRID_SIZE,
  maxDistanceFromPlayer: GRID_SIZE * 8,
  minDistanceFromPlayer: GRID_SIZE * 3,
  minTimeBetweenAttacks: 2,
  minTimeBetweenJumps: 2.5,
  attackSpeed: 300,
  attackTTL: 5,
}

export const FAST_RANGED_ARCHETYPE: EnemyArchetype = {
  jumpSpeed: GRAVITY / 3,
  walkSpeed: 15 * GRID_SIZE,
  groundAcceleration: 100 * GRID_SIZE,
  maxDistanceFromPlayer: GRID_SIZE * 8,
  minDistanceFromPlayer: GRID_SIZE * 3,
  minTimeBetweenAttacks: 2,
  minTimeBetweenJumps: 2.5,
  attackSpeed: 300,
  attackTTL: 5,
}

export class Enemy implements Entity, Rectangle {
  readonly level!: Level;

  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';
  readonly minTimeToUpdateTargets = 0.25;
  readonly maxTimeToUpdateTargets = 1;

  @persistent() jumpSpeed = GRAVITY / 3;
  @persistent() walkSpeed = 5 * GRID_SIZE;
  @persistent() groundAcceleration = 100 * GRID_SIZE;
  @persistent() maxDistanceFromPlayer = GRID_SIZE * 8;
  @persistent() minDistanceFromPlayer = GRID_SIZE * 3;
  @persistent() minTimeBetweenAttacks = 2;
  @persistent() minTimeBetweenJumps = 2.5;
  @persistent() attackSpeed = 300;
  @persistent() attackTTL = 5;

  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;
  @persistent() health = 2;

  @persistent() width = GRID_SIZE / 2;
  @persistent() height = GRID_SIZE;

  @persistent() jumpCooldown = this.minTimeBetweenJumps;
  @persistent() target: (Entity&Shape)|null = null;
  @persistent() readonly moveTarget: Point = {x: 0, y: 0};
  @persistent() jumpTarget: Point|null = null;
  @persistent() attackCooldown = this.minTimeBetweenAttacks;
  @persistent() updateTargetCooldown = 0;

  constructor(archetype?: EnemyArchetype) {
    if(archetype) Object.assign(this, archetype);
  }

  tick(dt: number) {
    this.updateTargetCooldown = Math.max(0, this.updateTargetCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.updateTargets();

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
    } else {

      // don't fall through the ground
      this.dy = Math.min(this.dy, 0);

      if(this.dy === 0) this.walk(this.moveTarget, dt);

      if(this.jumpTarget) {
        this.jump();
      }

      this.doAttacking(dt);
    }
  }

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

    if(Editor.active) {
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
        ctx.beginPath();
        ctx.moveTo(this.moveTarget.x, this.moveTarget.y);
        ctx.lineTo(this.jumpTarget.x, this.jumpTarget.y);
        ctx.stroke();

        ctx.beginPath();
        const jh = this.getMaxJumpHeight();
        ctx.moveTo(this.x - GRID_SIZE, this.moveTarget.y - jh);
        ctx.lineTo(this.x + GRID_SIZE, this.moveTarget.y - jh);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  takeDamage(source: DamageBox) {
    this.health--;
    this.dx += source.impactX;
    this.dy += source.impactY;
    if(this.health <= 0) this.level.remove(this);
    return true;
  }

  private walk(to: Point, dt: number) {
    const targetSpeed = distSquared(to, this) < Math.pow(this.width / 2, 2)
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
    const climb = this.y - this.jumpTarget.y;
    const timeToTop = this.jumpSpeed / GRAVITY;
    const jumpHeight = this.getMaxJumpHeight();
    if(jumpHeight > climb) {
      const fallingDistance = jumpHeight - climb;
      const timeToFall = Math.sqrt(2 * fallingDistance / GRAVITY);
      const jumpTime = timeToTop + timeToFall;
      this.dy = -1 * this.jumpSpeed;
      this.dx = (this.jumpTarget.x - this.x) / jumpTime;
      this.jumpCooldown = this.minTimeBetweenJumps;
    } else {
      console.log(`Aborting jump that's too high`);
    }
  }

  private getMaxJumpHeight() {
    const timeToTop = this.jumpSpeed / GRAVITY;
    return this.jumpSpeed * timeToTop - GRAVITY * Math.pow(timeToTop, 2) / 2;
  }

  private updateTargets() {
    if(this.target && this.level.entities.indexOf(this.target) === -1)  {
      this.target = null;
    }

    if(this.updateTargetCooldown > 0) return;

    if(!this.target) {
      this.jumpTarget = null;
      this.moveTarget.x = this.x;
      this.moveTarget.y = this.y;
      this.target = this.level.closest(Player, this);
    }

    if(!this.target) return;

    if(this.target) {
      this.updateTargetCooldown = Math.random() * (this.maxTimeToUpdateTargets - this.minTimeToUpdateTargets) + this.minTimeToUpdateTargets;
    }

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
        const y = getTopOf(targetTerrain);
        if(this.getMaxJumpHeight() >= this.y - y) {
          this.jumpTarget = {
            x: clamp(this.x, getLeftOf(targetTerrain) + this.width, getRightOf(targetTerrain) - this.width),
            y,
          };
        } else {
          this.jumpTarget = null;
          this.moveTarget.y = getTopOf(myTerrain);
          const x = randomBetween(getLeftOf(myTerrain) + this.width / 2, getRightOf(myTerrain) - this.width / 2);
          this.moveTarget.x = x;
        }
      }
    }
  }

  private getFallPoint(fromTerrain: Terrain, toTerrain: Terrain): Point|null {
    if(!this.target) return null;
    const leftEdge = {x: getLeftOf(fromTerrain) - this.width, y: getTopOf(fromTerrain)};
    const rightEdge = {x: getRightOf(fromTerrain) + this.width, y: getTopOf(fromTerrain)};

    if(Math.abs(this.x - leftEdge.x) < Math.abs(this.x - rightEdge.x)) {
      if(toTerrain.isBelow(leftEdge)) return leftEdge;
      if(toTerrain.isBelow(rightEdge)) return rightEdge;
    } else {
      if(toTerrain.isBelow(rightEdge)) return rightEdge;
      if(toTerrain.isBelow(leftEdge)) return leftEdge;
    }
    return null;
  }

  private doAttacking(dt: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if(this.attackCooldown > 0) return;
    if(!this.target) return;
    const attackHeight = clamp(getVerticalCenterOf(this.target), this.y - this.height, this.y);
    if(attackHeight >= getTopOf(this.target) && attackHeight <= getBottomOf(this.target)) {
      this.attackCooldown = this.minTimeBetweenAttacks;
      const direction = Math.sign(this.target.x - this.x);
      const attack = new DamageBox();
      attack.x = this.x;
      attack.y = attackHeight;
      attack.height = GRID_SIZE / 2;
      attack.ttl = this.attackTTL;
      attack.dx = direction * this.attackSpeed;
      attack.target = 'player';
      attack.impactY = -200;
      attack.impactX = 200 * direction;
      this.level.add(attack);
    }
  }
}
