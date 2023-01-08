import {GRID_SIZE} from './constants.js';

export class Camera {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  width = 800;
  height = 800;

  constructor() {
    const canvas = this.canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.tabIndex = 0;
    this.ctx = this.canvas.getContext('2d')!;

    new ResizeObserver(([entry]) => {
      this.width = this.canvas.width = entry.contentRect.width;
      this.height = this.canvas.height = entry.contentRect.height;
    }).observe(canvas);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawGrid() {
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
