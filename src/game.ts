import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Terrain} from './terrain.js';
import {HELD_KEYS, PRESSED_KEYS} from './keyboard.js';
import {GRID_SIZE} from './constants.js';

export class Game implements Entity {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  @persistent()
  private readonly entities: Entity[] = [];

  @persistent()
  readonly terrain: Terrain[] = [];

  width = 800;
  height = 800;

  constructor() {
    const canvas = this.canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;

    new ResizeObserver(([entry]) => {
      this.width = this.canvas.width = entry.contentRect.width;
      this.height = this.canvas.height = entry.contentRect.height;
    }).observe(canvas);
  }

  tick(dt: number) {
    for(const e of this.entities) e.tick?.(dt);
    if(PRESSED_KEYS.has('Control')) console.log(Array.from(HELD_KEYS.keys()).join(', '));
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    if(HELD_KEYS.has('g')) this.drawGrid();
    for(const e of this.entities) e.draw?.(this.ctx);
  }

  add(entity: Entity) {
    entity.game = this;
    this.entities.push(entity);
    if(entity instanceof Terrain) this.terrain.push(entity);
  }

  private drawGrid() {
    this.ctx.beginPath();
    for(let y = 0.5; y <= this.height + 1; y += GRID_SIZE) {
      this.ctx.moveTo(0.5, y);
      this.ctx.lineTo(this.width, y);
    }
    for(let x = 0.5; x <= this.width + 1; x += GRID_SIZE) {
      this.ctx.moveTo(x, 0.5);
      this.ctx.lineTo(x, this.height);
    }
    this.ctx.stroke();
  }
}

