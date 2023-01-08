import {persistent} from './serialization.js';
import {HELD_KEYS, PRESSED_KEYS} from './keyboard.js';
import {Seed} from './seed.js';
import {GRAVITY, GRID_SIZE} from './constants.js';
import {DamageBox} from './damage-box.js';
import {Editor} from './editor.js';
import {Plant} from './plant.js';
import {Entity} from './main.js';
import {Level} from './level.js';
import {Terrain} from './terrain.js';
import {Camera} from './camera.js';
import {Rectangle, Circle, touches, distSquared, clamp, getLeftOf, getRightOf} from './math.js';

const GROUND_SPEED = 10 * GRID_SIZE;
const GROUND_ACCELERATION = 50 * GRID_SIZE;
const JUMP_SPEED = GRAVITY / 3.5;

export class Player implements Entity, Rectangle {
  readonly height = GRID_SIZE;
  readonly width = GRID_SIZE / 2;
  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';
  readonly minTimeBetweenAttacks = 0.5;
  readonly attackSpeed = 500;
  readonly attackTTL = 0.10;
  readonly invulnurabilityTime = 1;

  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;

  @persistent() level!: Level;

  @persistent() seeds = 0;

  @persistent() attackCooldown = 0;
  @persistent() attackDirection = 1;

  @persistent() invulnurableFor = this.invulnurabilityTime;
  @persistent() health = 5;

  tick(dt: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.invulnurableFor = Math.max(0, this.invulnurableFor - dt);
    const distanceToGround = Terrain.getDistanceToGround(this.level, this);
    const distanceToCeiling = Terrain.getDistanceToCeiling(this.level, this);
    this.x += this.dx * dt;
    this.x = clamp(this.x, getLeftOf(this.level) + this.width / 2, getRightOf(this.level) - this.width / 2);
    if(this.dy * dt > distanceToGround) {
      this.dy = 0;
      this.y += distanceToGround;
    } else if(-1 * this.dy * dt > distanceToCeiling ) {
      this.dy = 0;
      this.y -= distanceToCeiling;
    } else {
      this.y += Math.min(this.dy * dt, distanceToGround);
    }

    if(distanceToGround > 0) {
      // in air
      this.dy += GRAVITY * dt;
    } else {
      // on the ground
      this.dy = Math.min(this.dy, 0);
      this.doWalking(dt);
      this.doPlanting();
    }

    this.doAttacking();

    if(!touches(this.level, this)) {
      this.level.remove(this);
    }

    for(const seed of this.level.getEntitiesOfType(Seed)) {
      if(touches(this, seed)) {
        this.level.remove(seed);
        this.seeds++;
      }
    }
  }

  draw({ctx}: Camera) {
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 1 - ((this.invulnurableFor * 3) % 1);
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
    ctx.restore();
    ctx.fillText(`seeds: ${this.seeds.toString()}`, 16, 16);
  }

  toString() {
    return `player at ${this.x}, ${this.y}`;
  }

  takeDamage(source: DamageBox) {
    if(this.invulnurableFor > 0) return false;
    this.dx += source.impactX;
    this.dy += source.impactY;
    this.invulnurableFor = this.invulnurabilityTime;
    this.health--;
    if(this.health < 0) this.level.remove(this);
    return true;
  }

  private doWalking(dt: number) {
    const targetSpeed = this.wantToMoveX() * GROUND_SPEED;
    if(targetSpeed !== 0 && this.dx !== 0 && Math.sign(targetSpeed) !== Math.sign(this.dx)) {
      this.dx = 0;
    } else {
      // accelerate
      let delta = targetSpeed - this.dx;
      const maxAccel = GROUND_ACCELERATION * dt;
      delta = Math.max(Math.min(delta, maxAccel), -maxAccel);
      this.dx += delta;
    }

    if(PRESSED_KEYS.has('KeyW') || PRESSED_KEYS.has('KeyI') || PRESSED_KEYS.has('Space')) {
      this.dy -= JUMP_SPEED;
    }
  }

  private wantToMoveX(): number {
    const left = HELD_KEYS.has('ArrowLeft') || HELD_KEYS.has('KeyA') || HELD_KEYS.has('KeyJ');
    const right = HELD_KEYS.has('ArrowRight') || HELD_KEYS.has('KeyD') || HELD_KEYS.has('KeyL');
    if(left == right) return 0;
    return left ? -1 : 1;
  }

  private doPlanting() {
    const isPressingTheButton = PRESSED_KEYS.has('KeyS') || PRESSED_KEYS.has('KeyK');
    if(!isPressingTheButton) return;
    
    // harvest
    for(const plant of this.level.getEntitiesOfType(Plant)) {
      if(distSquared(this, plant) < Math.pow(GRID_SIZE, 2)) {
        plant.harvest();
        return;
      }
    }

    // plant (if nothing to harvest)
    if(!this.seeds) return;
    this.seeds--;
    const plant = new Plant();
    plant.x = this.x;
    plant.y = this.y;
    this.level.add(plant);
  }

  private doAttacking() {
    if(this.dx !== 0) this.attackDirection = Math.sign(this.dx);
    if(this.attackCooldown > 0) return;
    if(PRESSED_KEYS.has('KeyX') || PRESSED_KEYS.has('ShiftLeft') || PRESSED_KEYS.has('ShiftRight')) {
      this.attackCooldown = this.minTimeBetweenAttacks;
      const attack = new DamageBox();
      attack.width = GRID_SIZE;
      attack.height = GRID_SIZE;
      attack.x = this.x + this.attackDirection * ((attack.width + this.width) / 2);
      attack.y = this.y - this.height / 2;
      attack.impactX = 200 * this.attackDirection;
      attack.impactY = -200;
      attack.dx = this.dx + this.attackSpeed * this.attackDirection;
      attack.dy = this.dy;
      attack.ttl = this.attackTTL;
      attack.blocksAttacks = true;
      this.level.add(attack);
    }
  }
}

export class SpawnPoint implements Entity, Circle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() level!: Level;
  @persistent() lives = 3;

  readonly radius = 8;

  tick() {
    if(this.level.getEntitiesOfType(Player).length === 0) {
      const player = new Player();
      player.x = this.x;
      player.y = this.y;
      this.level.add(player);
    }
  }

  draw({ctx}: Camera) {
    if(!Editor.active) return;
    ctx.save();
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();
  }

  toString() {
    return `Spawn point at ${this.x}, ${this.y}`;
  }
}
