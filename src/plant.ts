import {Rectangle} from './math.js';
import {Entity} from './main.js';
import {persistent} from './serialization.js';
import {Camera} from './camera.js';
import {Level} from './level.js';
import {Enemy} from './enemy.js';
import {Spawner} from './spawner.js';

export class Plant implements Entity, Rectangle {
  @persistent() x = 0;
  @persistent() y = 0;
  @persistent() age = 0;

  @persistent()
  readonly handedness = Math.random() > 0.5 ? 1 : -1;

  @persistent()
  readonly leaves: Leaf[] = [];

  width = 8;
  height = 16;

  @persistent() level!: Level;

  readonly xOrigin = 'center';
  readonly yOrigin = 'bottom';

  stage: PlantStage = plantStages[0];
  private readonly stages = [...plantStages];

  tick(dt: number) {
    this.age += dt;
    if(this.age > this.stages[0].maxAge) this.stages.shift();
    this.stage = this.stages[0];
    this.stage.tick.call(this);
  }

  draw(camera: Camera) {
    this.stage.draw.call(this, camera);
    for(const leaf of this.leaves) {
      drawLeaf(camera.ctx, this.x, this.y - (this.height * leaf.position), leaf.rotation, leaf.size);
    }
  }

  harvest() {
    const enemy = new Enemy();
    enemy.x = this.x;
    enemy.y = this.y;
    const spawner = new Spawner(enemy, 2);
    this.level.add(spawner);
    this.level.remove(this);
  }

  toString() {
    return `plant at ${this.x}, ${this.y}, with age ${this.age}`;
  }
}

interface PlantStage {
  maxAge: number;
  tick(this: Plant): void;
  draw(this: Plant, camera: Camera): void;
}

interface Leaf {
  position: number; // from 0 (base) to 1 (tip)
  rotation: number;
  size: number;
}

const plantStages: PlantStage[] = [
  {
    maxAge: 5,
    tick() {
      this.width = 2 + 3 * (this.age / 5);
      this.height = 8 + 16 * (this.age / this.stage.maxAge);
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.beginPath();
      ctx.translate(this.x, this.y);
      ctx.scale(this.handedness, 1);
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'green';
      ctx.ellipse(0, 0, this.width, this.height, 0, 0, -Math.PI / 1.8, true);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    maxAge: 20,
    tick() {
      this.width = 8;
      this.height = 16 + this.age * 5;
      while(this.leaves.length < (this.age / 4)) {
        this.leaves.push(newLeaf());
      }
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y - this.height);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    maxAge: 60,
    tick() {
      this.width = 12;
      this.height = 16 + this.age * 10;
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y - this.height);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    maxAge: Infinity,
    tick() {
      this.width = 20;
      this.height = 16 + this.age * 10;
    },
    draw({ctx}: Camera) {
      ctx.save();
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y - this.height);
      ctx.stroke();
      ctx.restore();
    }
  },
];

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, size: number) {
  ctx.save();
  ctx.fillStyle = 'green';
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, -1 * size, size / 3, size, 0, 0, 2 * Math.PI, false);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function newLeaf(): Leaf {
  return {
    position: Math.random() * 0.9 + 0.05,
    rotation: ((Math.random() - 0.5) * Math.PI / 2 ) * 2,
    size: Math.random() * 8 + 16,
  }
}
