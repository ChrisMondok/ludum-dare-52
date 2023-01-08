import {Rectangle, randomBetween} from './math.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Camera} from './camera.js';
import {Level} from './level.js';
import {Enemy, ENEMY_ARCHETYPES, EnemyArchetype} from './enemy.js';
import {Spawner} from './spawner.js';
import {Seed} from './seed.js';

export class Plant implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() age = 0;

  @persistent()
  readonly rotation = Math.random() * 2 * Math.PI;

  @persistent() readonly leaves: Leaf[] = [];

  width = 8;
  height = 16;

  @persistent() level!: Level;

  @persistent() spawnEnemyCooldown = 0;
  readonly minTimeBetweenEnemySpawns = 15;
  readonly minTimeBetweenLeaves = 2;
  readonly maxTimeBetweenLeaves = 5;
  @persistent() newLeafCooldown = 0;

  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';

  readonly stages = [...plantStages];

  tick(dt: number) {
    this.age += dt;
    this.spawnEnemyCooldown = Math.max(0, this.spawnEnemyCooldown - dt);
    this.newLeafCooldown = Math.max(0, this.newLeafCooldown - dt);
    while(this.stages.length && this.age > this.stages[0].maxAge) {
      this.stages.shift();
    }
    const stage = this.stages[0];
    stage.tick.call(this);
  }

  draw(camera: Camera) {
    this.stages[0].draw.call(this, camera);
  }

  harvest() {
    this.level.playSoundAt('destroy', this);
    this.queueEnemy(2);
    this.level.remove(this);
    this.spawnGoodies();
    this.level.score += this.leaves.length * 5;
  }

  distroyWithoutHarvesting() {
    this.level.playSoundAt('destroy', this);
    this.queueEnemy(0);
    this.level.remove(this);
  }

  queueEnemy(delay: number, archetype?: EnemyArchetype) {
    const enemy = new Enemy(archetype ?? this.stages[0].enemyArchetype);
    enemy.x = this.x;
    enemy.y = this.y;
    const spawner = new Spawner(enemy, delay);
    this.level.add(spawner);
  }

  toString() {
    return `plant at ${this.x}, ${this.y}, with age ${this.age}`;
  }

  spawnGoodies() {
    for(let i = 0; i < this.leaves.length * 2; i++) {
      const seed = new Seed();
      seed.x = this.x;
      seed.y = this.y;
      seed.dy = -300;
      seed.dx = randomBetween(-200, 200);
      const delay = randomBetween(0.2, 1);
      const spawner = new Spawner(seed, delay);
      this.level.add(spawner);
    }
  }
}

interface PlantStage {
  maxAge: number;
  tick(this: Plant): void;
  draw(this: Plant, camera: Camera): void;
  enemyArchetype: EnemyArchetype;
}

interface Leaf {
  position: number; // from 0 (base) to 1 (tip)
  rotation: number;
  size: number;
}

const plantStages: PlantStage[] = [
  {
    maxAge: 5,
    enemyArchetype: ENEMY_ARCHETYPES.SLOW_RANGED_ARCHETYPE,
    tick() {
      this.width = 2 + 3 * (this.age / 5);
      this.height = 8 + 16 * (this.age / 5);
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.beginPath();
      ctx.translate(this.x, this.y);
      ctx.scale(Math.sign(this.rotation - Math.PI), 1);
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'green';
      ctx.ellipse(0, 0, this.width, this.height, 0, 0, -Math.PI / 1.8, true);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    maxAge: 40,
    enemyArchetype: ENEMY_ARCHETYPES.FAST_RANGED_ARCHETYPE,
    tick() {
      this.width = 5 + this.age / 4;
      this.height = this.age * 5;
      if(this.newLeafCooldown === 0) {
        this.newLeafCooldown = randomBetween(this.minTimeBetweenLeaves, this.maxTimeBetweenLeaves);
        this.leaves.push(newLeaf());
        this.level.playSoundAt('newleaf', this);
      }
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.strokeStyle = 'green';
      drawStem(ctx, this.x, this.y, this.width, this.height);
      for(const leaf of this.leaves) {
        drawLeaf(ctx, this.x, this.y - (this.height * leaf.position), leaf.rotation, leaf.size);
      }
      drawFlower(ctx, this.x, this.y - this.height, this.height / 8);
      ctx.restore();
    }
  },
  {
    enemyArchetype: ENEMY_ARCHETYPES.SLOW_RANGED_ARCHETYPE,
    maxAge: Infinity,
    tick() {
      if(this.spawnEnemyCooldown <= 0) {
        this.queueEnemy(0, ENEMY_ARCHETYPES.SLOW_MELEE_ARCHETYPE);
        this.spawnEnemyCooldown = this.minTimeBetweenEnemySpawns;
      }
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.strokeStyle = 'brown';
      ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
      drawStem(ctx, this.x + Math.random() * 4 - 2, this.y + Math.random() * 4 - 2, this.width, this.height);
      for(const leaf of this.leaves) {
        drawLeaf(ctx, this.x, this.y - (this.height * leaf.position), leaf.rotation, leaf.size);
      }
      drawFlower(ctx, this.x, this.y - this.height, 4 + this.height / 16);
      ctx.restore();
    }
  }
];

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, size: number) {
  ctx.save();
  ctx.fillStyle = 'green';
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, -1 * size, size / 3, size, 0, 0, 2 * Math.PI, false);
  ctx.fill();
  ctx.restore();
}

function drawStem(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - height);
  ctx.stroke();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
}

function newLeaf(): Leaf {
  return {
    position: Math.random() * 0.9 + 0.05,
    rotation: ((Math.random() - 0.5) * Math.PI / 2 ) * 2,
    size: Math.random() * 8 + 16,
  }
}
