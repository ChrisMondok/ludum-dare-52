import {GRID_SIZE} from './constants.js';
import {Entity} from './main.js';
import {Rectangle, touches, Shape} from './math.js';
import {persistent} from './serialization.js';
import {Level} from './level.js';
import {Camera} from './camera.js';
import {Enemy} from './enemy.js';
import {Player} from './player.js';
import {Plant} from './plant.js';

export class DamageBox implements Entity, Rectangle {
  @persistent() target: 'enemy'|'player' = 'enemy';
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() dx = 0;
  @persistent() dy = 0;
  @persistent() width = GRID_SIZE;
  @persistent() height = GRID_SIZE;
  @persistent() ttl = 0.00001;
  @persistent() impactX = 0;
  @persistent() impactY = -300;
  @persistent() blocksAttacks = false;

  readonly xOrigin = 'center';
  readonly yOrigin = 'center';

  level!: Level;

  tick(dt: number) {
    if(this.ttl < 0) this.level.remove(this);
    this.ttl -= dt;
    this.x += this.dx * dt;
    this.y += this.dy * dt;
    let hit = false;
    if(this.blocksAttacks) {
      for(const other of this.level.getEntitiesOfType(DamageBox)) {
        if(other.target === this.target) continue;
        if(touches(this, other)) {
          this.level.playSoundAt('block', this);
          this.level.remove(this);
          this.level.remove(other);
          return;
        }
      }
    }
    for(const plant of this.level.getEntitiesOfType(Plant)) {
      if(touches(this, plant)) {
        plant.distroyWithoutHarvesting();
      }
    }
    for(const target of this.getPotentialTargets()) {
      if(touches(this, target)) {
        hit = target.takeDamage(this) || hit;
      }
    }
    if(hit) this.level.remove(this);
  }

  draw({ctx}: Camera) {
    ctx.save();
    const direction = Math.sign(this.dx);
    if(this.target === 'player') {
      ctx.beginPath();
      ctx.fillStyle = 'green';
      ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, 2 * Math.PI, false);
      ctx.fill();
    } else {
      ctx.fillStyle = 'purple';
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(this.x - this.width / 2 * direction, this.y + this.height / 2);
      ctx.lineTo(this.x + this.width / 2 * direction, this.y - this.height / 2);
      ctx.stroke();
    }
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
  takeDamage(source: DamageBox): boolean;
}
