import {GRID_SIZE} from './constants.js';
import {Entity} from './main.js';
import {Rectangle, touches, Shape} from './math.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';
import {Camera} from './camera.js';
import {Enemy} from './enemy.js';
import {Player} from './player.js';

export class DamageBox implements Entity, Rectangle {
  @persistent() target: 'enemy'|'player' = 'enemy';;
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;
  @persistent() width = GRID_SIZE;
  @persistent() height = GRID_SIZE;
  @persistent() ttl = 0.00001;
  @persistent() impactX = 0;
  @persistent() impactY = 0;

  readonly xOrigin = 'center';
  readonly yOrigin = 'center';

  level!: Level;

  tick(dt: number) {
    if(this.ttl < 0) this.level.remove(this);
    this.ttl -= dt;
    this.x += this.dx * dt;
    this.y += this.dy * dt;
    let hit = false;
    for(const target of this.getPotentialTargets()) {
      if(touches(this, target)) {
        hit = true;
        target.takeDamage(this);
      }
    }
    if(hit) this.level.remove(this);
  }

  draw({ctx}: Camera) {
    ctx.save();
    ctx.fillStyle = 'purple';
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    ctx.restore();
  }

  private getPotentialTargets(): Damageable[] {
    switch(this.target) {
      case 'enemy':
        return this.level.getEntitiesOfType(Enemy);
      case 'player':
        return this.level.getEntitiesOfType(Player);
    }
  }
}

type Damageable = Entity&Shape&{
  takeDamage(source: DamageBox): void;
}
