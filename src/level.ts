import {Entity} from './main.js';
import {persistent, Type} from './serialization.js';
import {Rectangle, distSquared, Point} from './math.js';
import {Camera} from './camera.js';

export class Level implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() width = 800;
  @persistent() height = 800;
  @persistent() entities: Entity[] = [];
  @persistent() name = "unnamed level";
  private readonly entitiesByType = new Map<any, any>;

  // huh that's weird
  readonly level = this;

  readonly xOrigin = 'left';
  readonly yOrigin = 'top';

  tick(dt: number) {
    for(const e of this.entities) e.tick?.(dt);
  }

  draw(camera: Camera) {
    const {ctx} = camera;
    ctx.save();
    ctx.fillStyle = 'skyblue';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
    for(const e of this.entities) e.draw?.(camera);
  }

  add(entity: Entity) {
    entity.level = this;
    this.entities.push(entity);
    this.entityAdded(entity);
  }

  remove(entity: Entity) {
    removeFromArray(this.entities, entity);
    if(this.entitiesByType.has(entity.constructor)) {
      removeFromArray(this.entitiesByType.get(entity.constructor)!, entity)
    }
  }

  deserialized() {
    for(const entity of this.entities) {
      this.entityAdded(entity);
      entity.level = this;
    }
  }

  private entityAdded(entity: Entity) {
    if(this.entitiesByType.has(entity.constructor)) {
      this.entitiesByType.get(entity.constructor)!.push(entity);
    } else {
      this.entitiesByType.set(entity.constructor, [entity]);
    }
  }

  getEntitiesOfType<T>(type: Type<T>): T[] {
    if(!this.entitiesByType.has(type)) this.entitiesByType.set(type, []);
    return this.entitiesByType.get(type)!;
  }

  closest<T extends Point>(type: Type<T>, to: Point): T|null {
    let closest: T|null = null;
    for(const instance of this.getEntitiesOfType(type)) {
      if(closest) {
        if(distSquared(instance, to) < distSquared(closest, to)) {
          closest = instance;
        }
      } else {
        closest = instance;
      }
    }
    return closest;
  }
}

function removeFromArray<T>(array: T[], item: T) {
  const index = array.indexOf(item);
  if(index === -1) return;
  array.splice(index, 1);
}
