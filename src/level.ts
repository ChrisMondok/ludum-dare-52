import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Terrain} from './terrain.js';
import {Camera} from './camera.js';

export class Level implements Entity {
  @persistent()
  readonly entities: Entity[] = [];

  @persistent()
  readonly terrain: Terrain[] = [];

  tick(dt: number) {
    for(const e of this.entities) e.tick?.(dt);
  }

  draw(camera: Camera) {
    for(const e of this.entities) e.draw?.(camera);
  }

  add(entity: Entity) {
    entity.level = this;
    this.entities.push(entity);
    if(entity instanceof Terrain) this.terrain.push(entity);
  }
}
