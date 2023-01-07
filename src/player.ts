import {persistent} from './serialization.js';
import {HELD_KEYS, PRESSED_KEYS} from './keyboard.js';
import {Seed} from './seed.js';
import {GRAVITY, GRID_SIZE} from './constants.js';
import {Editor} from './editor.js';
import {Plant} from './plant.js';
import {Entity} from './main.js';
import {Level} from './level.js';
import {Terrain} from './terrain.js';
import {Camera} from './camera.js';
import {Rectangle, Circle, contains, distSquared} from './math.js';

const GROUND_SPEED = 10 * GRID_SIZE;
const GROUND_ACCELERATION = 50 * GRID_SIZE;
const JUMP_SPEED = GRAVITY / 4;

export class Player implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;

  @persistent() level!: Level;

  @persistent() seeds = 0;

  readonly height = GRID_SIZE;
  readonly width = GRID_SIZE / 2;
  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';

  tick(dt: number) {
    const distanceToGround = Terrain.getDistanceToGround(this.level, this);
    const distanceToCeiling = Terrain.getDistanceToCeiling(this.level, this);
    this.x += this.dx * dt;
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

    if(!contains(this.level, this)) {
      this.level.remove(this);
    }

    for(const seed of this.level.getEntitiesOfType(Seed)) {
      if(contains(this, seed)) {
        this.level.remove(seed);
        this.seeds++;
        console.log(this.seeds);
      }
    }
  }

  draw({ctx}: Camera) {
    ctx.beginPath();
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
  }

  toString() {
    return `Player at ${this.x}, ${this.y}`;
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

    if(PRESSED_KEYS.has(' ') || PRESSED_KEYS.has('w') || PRESSED_KEYS.has('i') || PRESSED_KEYS.has('z')) {
      this.dy -= JUMP_SPEED;
    }
  }

  private wantToMoveX(): number {
    const left = HELD_KEYS.has('ArrowLeft') || HELD_KEYS.has('a') || HELD_KEYS.has('j');
    const right = HELD_KEYS.has('ArrowRight') || HELD_KEYS.has('d') || HELD_KEYS.has('l');
    if(left == right) return 0;
    return left ? -1 : 1;
  }

  private doPlanting() {
    const isPressingTheButton = PRESSED_KEYS.has('s') || PRESSED_KEYS.has('k') || PRESSED_KEYS.has('x');
    if(!isPressingTheButton) return;
    
    // harvest
    for(const plant of this.level.getEntitiesOfType(Plant)) {
      if(distSquared(this, plant) < Math.pow(GRID_SIZE, 2)) {
        this.level.remove(plant);
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
}

export class SpawnPoint implements Entity, Circle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() level!: Level;

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
