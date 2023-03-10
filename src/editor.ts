import {Level} from './level.js';
import {GRID_SIZE} from './constants.js';
import {SpawnPoint} from './player.js';
import {Entity} from './main.js';
import {Enemy, ENEMY_ARCHETYPES} from './enemy.js';
import {Terrain} from './terrain.js';
import {serialize, deserialize} from './serialization.js';
import {Point, touches, isShape} from './math.js';
import {Game} from './game.js';
import {Seed} from './seed.js';

export class Editor {
  static active = false;
  private readonly newButton = makeButton('new', () => this.newLevel());
  private readonly saveButton = makeButton('save', () => this.save());
  private readonly saveAsButton = makeButton('save as', () => this.saveAs());
  private readonly revertButton = makeButton('revert', () => this.revert());
  private readonly loadButton = makeButton('load', () => this.load());
  private readonly toolSelect = makeSelect(['move', 'inspect', 'terrain', 'player', 'seed', 'enemy']);

  private fileHandle?: FileSystemFileHandle;

  private activeThing: Entity|null= null;

  constructor(private readonly game: Game) {
    const toolbar = document.getElementById('toolbar')!;
    toolbar.appendChild(this.newButton);
    toolbar.appendChild(this.saveButton);
    toolbar.appendChild(this.saveAsButton);
    toolbar.appendChild(this.loadButton);
    toolbar.appendChild(this.revertButton);
    toolbar.appendChild(this.toolSelect);
    this.updateEnabledness();
  }

  mousedown(evt: MouseEvent) {
    if(!Editor.active) return;
    const mode = this.toolSelect.value;
    switch(mode) { 
      default:
        console.log(`tool ${mode} not implemented`);
        return;
      case 'inspect':
        console.log(this.findThingUnderCursor(evt));
        break;
      case 'move':
        this.activeThing = this.findThingUnderCursor(evt);
        break;
      case 'player':
        this.activeThing = this.findOrCreateSpawnPoint();
        break;
      case 'terrain':
        if(evt.button === 0) {
          this.activeThing = this.createTerrain(this.getClickedPointOnGrid(evt));
        } else if(evt.button === 2) {
          this.deleteTerrainAt(this.getClickedPoint(evt));
        }
        break;
      case 'enemy':
        this.activeThing = this.createEnemy(this.getClickedPoint(evt));
        break;
      case 'seed':
        this.activeThing = new Seed();
        this.game.level.add(this.activeThing);
        break;
    }
    evt.preventDefault();
    this.mousemove(evt);
  }

  private findThingUnderCursor(evt: MouseEvent) {
    const point = this.getClickedPoint(evt);
    return this.game.level.entities.find(e => {
      if(!isShape(e)) return false;
      return touches(e, point);
    }) ?? null;
  }

  private findOrCreateSpawnPoint(): SpawnPoint {
    const level = this.game.level;
    let spawnPoint = level.getEntitiesOfType(SpawnPoint)[0];
    if(!spawnPoint) {
      spawnPoint = new SpawnPoint();
      level.add(spawnPoint);
    }
    return spawnPoint;
  }

  private createTerrain(point: Point) {
    const terrain = new Terrain();
    terrain.x = point.x;
    terrain.y = point.y;
    this.game.level.add(terrain);
    return terrain;
  }

  private deleteTerrainAt(point: Point) {
    const level = this.game.level;
    const terrains = [...level.getEntitiesOfType(Terrain)];
    for(const terrain of terrains) {
      if(touches(terrain, point)) level.remove(terrain);
    }
  }

  private createEnemy(at: Point) {
    const enemy = new Enemy(ENEMY_ARCHETYPES.SLOW_MELEE_ARCHETYPE);
    enemy.x = at.x;
    enemy.y = at.y;
    this.game.level.add(enemy);
    return enemy;
  }

  mouseup(_evt: MouseEvent) {
    this.activeThing = null;
  }

  mousemove(evt: MouseEvent) {
    if(!this.activeThing) return;
    if(this.activeThing instanceof Terrain) {
      const clickedCell = this.getClickedPointOnGrid(evt);
      this.activeThing.width = Math.max(clickedCell.x - this.activeThing.x + GRID_SIZE, GRID_SIZE);
      this.activeThing.height = Math.max(clickedCell.y - this.activeThing.y + GRID_SIZE, GRID_SIZE);
    } else {
      if(!isShape(this.activeThing)) return;
      const clickedPoint = this.getClickedPoint(evt);
      this.activeThing.x = clickedPoint.x;
      this.activeThing.y = clickedPoint.y;
    }
  }

  private getClickedPointOnGrid(evt: MouseEvent): Point {
    const {x, y} = this.getClickedPoint(evt);
    return {
      x: Math.floor(x / GRID_SIZE) * GRID_SIZE,
      y: Math.floor(y / GRID_SIZE) * GRID_SIZE,
    };
  }

  private getClickedPoint(evt: MouseEvent): Point {
    return { x: evt.offsetX, y: evt.offsetY };
  }

  private newLevel() {
    const newLevel = new Level();
    this.game.levels.unshift(newLevel);
    this.game.level = newLevel;
  }

  private async load() {
    const handles = await window.showOpenFilePicker?.(fileOptions);
    try {
      this.fileHandle = handles?.[0];
      this.revert();
    } catch (e) {
      this.fileHandle = undefined;
    } finally {
      this.updateEnabledness();
    }
  }

  private async revert() {
    if(!this.fileHandle) return;
    const file = await this.fileHandle.getFile();
    const json = await file.text();
    const levels = deserialize(json);
    this.game.levels.length = 0;
    this.game.levels.push(...levels);
    this.game.level = this.game.levels[0];
  }

  private async saveAs() {
    try {
      this.fileHandle = await window.showSaveFilePicker?.(fileOptions);
      this.save();
    }
    catch (e) {
      this.fileHandle = undefined;
    } finally {
      this.updateEnabledness();
    }
  }

  private async save() {
    if(!this.fileHandle) return;

    const json = serialize(this.game.levels);
    const stream = await this.fileHandle.createWritable();
    await stream.write(json);
    await stream.close();
  }

  private updateEnabledness() {
    this.saveButton.disabled = !this.fileHandle;
    this.revertButton.disabled = !this.fileHandle;
  }
}

function makeButton(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', action);
  button.classList.add('editor');
  return button;
}

function makeSelect(options: string[]) {
  const select = document.createElement('select');
  for(const value of options) {
    const option = document.createElement('option');
    option.textContent = value;
    select.appendChild(option);
  }
  select.classList.add('editor');
  return select;
}

declare global {
  interface Window {
    showOpenFilePicker?(options?: any): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(options?: any): Promise<FileSystemFileHandle>;
    showDirectoryPicker?(options?: any): Promise<FileSystemFileHandle[]>;
  }

  interface FileSystemFileHandle {
    createWritable(options?: any): Promise<any>;
  }
}

const fileOptions = {
  suggestedName: 'level.json',
  types: [{
    description: 'JSON file',
    accept: {'text/json': ['.json']}
  }],
};
