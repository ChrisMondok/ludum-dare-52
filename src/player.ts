import {persistent} from './serialization.js';
import {HELD_KEYS, PRESSED_KEYS} from './keyboard.js';
import {GRAVITY, GRID_SIZE} from './constants.js';
import {Entity} from './main.js';
import {Terrain} from './terrain.js';
import {Game} from './game.js';

const GROUND_SPEED = 10 * GRID_SIZE;
const GROUND_ACCELERATION = 50 * GRID_SIZE;
const JUMP_SPEED = GRAVITY / 4;

export class Player implements Entity {
  @persistent()
  x = 240;

  @persistent()
  y = 120;

  @persistent()
  dx = 0;

  @persistent()
  dy = 0;

  @persistent()
  game!: Game;

  readonly height = GRID_SIZE;
  readonly width = GRID_SIZE / 2;

  tick(dt: number) {
    const heightAboveGround = this.getHeightAboveGround();
    this.x += this.dx * dt;
    this.y += Math.min(this.dy * dt, heightAboveGround);

    if(this.getHeightAboveGround() > 0) {
      // in air
      this.dy += GRAVITY * dt;
    } else {
      // on the ground
      this.dy = Math.min(this.dy, 0);
      this.doWalking(dt);
    }

    if(PRESSED_KEYS.has(' ') || PRESSED_KEYS.has('w')) {
      this.dy -= JUMP_SPEED;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
  }

  private doWalking(dt: number) {
    const targetSpeed = this.wantToMoveX() * GROUND_SPEED;
    if(targetSpeed !== 0 && this.dx !== 0 && Math.sign(targetSpeed) !== Math.sign(this.dx)) {
      console.log('reverse');
      this.dx = 0;
    } else {
      // accelerate
      let delta = targetSpeed - this.dx;
      const maxAccel = GROUND_ACCELERATION * dt;
      delta = Math.max(Math.min(delta, maxAccel), -maxAccel);
      this.dx += delta;
    }
  }

  private getHeightAboveGround() {
    const g = this.getGround();
    if(!g) return Infinity;
    return g.y - this.y;
  }

  private wantToMoveX(): number {
    const left = HELD_KEYS.has('ArrowLeft') || HELD_KEYS.has('a');
    const right = HELD_KEYS.has('ArrowRight') || HELD_KEYS.has('d');
    if(left == right) return 0;
    return left ? -1 : 1;
  }

  private getGround(): Terrain|null {
    let ground: Terrain|null = null;
    for(let t of this.game.terrain) {
      if(!t.isBelow(this)) continue;
      if(!ground) {
        ground = t;
      } else if(t.y < ground.y) {
        ground = t;
      }
    }
    return ground;
  }
}
