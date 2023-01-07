import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Point} from './math.js';
import {Camera} from './camera.js';

export class Terrain implements Entity {

  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() width = 0;
  @persistent() height = 0;

  draw({ctx}: Camera) {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  isBelow(point: Point) {
    if(this.x > point.x) return false;
    if(this.x + this.width < point.x) return false;
    return this.y + this.height / 2 > point.y;
  }
}
