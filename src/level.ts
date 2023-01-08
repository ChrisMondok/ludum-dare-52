import {Entity} from './main.js';
import {persistent, Type} from './serialization.js';
import {Rectangle, distSquared, Point} from './math.js';
import {Player, SpawnPoint} from './player.js';
import {Camera} from './camera.js';
import {playSoundAt, SoundName} from './sounds.js';

export class Level implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() width = 800;
  @persistent() height = 800;
  @persistent() entities: Entity[] = [];
  @persistent() name = "unnamed level";
  @persistent() seeds = 0;
  @persistent() gameOver = false;
  @persistent() score = 0;
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

    if(this.gameOver) {
      ctx.save();
      camera.ctx.textAlign = 'center';
      camera.ctx.textBaseline = 'middle';
      camera.ctx.font = '42pt sans-serif';
      camera.ctx.fillText('Game Over', camera.width / 2, camera.height / 2 - 48);
      camera.ctx.fillText(`Score: ${this.score}`, camera.width / 2, camera.height / 2 + 48);
      ctx.restore();
    } else {
      ctx.save();
      camera.ctx.font = '12pt sans-serif';
      
      const [firstSpawner] = this.getEntitiesOfType(SpawnPoint);
      camera.ctx.fillText(`Lives: ${firstSpawner?.lives ?? 0}`, 16, 32);
      const [player] = this.getEntitiesOfType(Player);
      camera.ctx.fillText(`Health: ${player?.health ?? 0}`, 16, 48);
      camera.ctx.fillText(`Seeds: ${this.seeds}`, 16, 64);
      camera.ctx.fillText(`Score: ${this.score}`, 16, 80);
      ctx.restore();
    }
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

  playSoundAt(sound: SoundName, position: Point) {
    const center = (this.x + this.width / 2);
    const x = (position.x - center) / (this.width / 2);
    const y = 0;
    playSoundAt(sound, x, y);
  }
}

function removeFromArray<T>(array: T[], item: T) {
  const index = array.indexOf(item);
  if(index === -1) return;
  array.splice(index, 1);
}
