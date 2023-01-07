import {Level} from './level.js';
import {GRID_SIZE} from './constants.js';
import {SpawnPoint} from './player.js';
import {Entity} from './main.js';
import {Terrain} from './terrain.js';
import {serialize, deserialize} from './serialization.js';
import {Point, contains, isShape} from './math.js';
import {Game} from './game.js';
import {Seed} from './seed.js';

export class Editor {
  readonly toolbar: HTMLElement;
  static active = false;
  private readonly newButton = makeButton('new', () => this.newLevel());
  private readonly saveButton = makeButton('save', () => this.save());
  private readonly saveAsButton = makeButton('save as', () => this.saveAs());
  private readonly loadButton = makeButton('load', () => this.load());
  private readonly toolSelect = makeSelect(['move', 'inspect', 'terrain', 'player', 'seed']);

  private fileHandle?: FileSystemFileHandle;

  private activeThing: Entity|null= null;

  constructor(private readonly game: Game) {
    this.toolbar = document.createElement('div');
    this.toolbar.classList.add('editor', 'toolbar')
    this.toolbar.appendChild(this.newButton);
    this.toolbar.appendChild(this.saveButton);
    this.toolbar.appendChild(this.saveAsButton);
    this.toolbar.appendChild(this.loadButton);
    this.toolbar.appendChild(this.toolSelect);
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
      case 'seed':
        this.activeThing = new Seed();
        this.game.currentLevel.add(this.activeThing);
        break;
    }
    evt.preventDefault();
    this.mousemove(evt);
  }

  private findThingUnderCursor(evt: MouseEvent) {
    const point = this.getClickedPoint(evt);
    return this.game.currentLevel.entities.find(e => {
      if(!isShape(e)) return false;
      return contains(e, point);
    }) ?? null;
  }

  private findOrCreateSpawnPoint(): SpawnPoint {
    const level = this.game.currentLevel;
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
    this.game.currentLevel.add(terrain);
    return terrain;
  }

  private deleteTerrainAt(point: Point) {
    const level = this.game.currentLevel;
    const terrains = [...level.getEntitiesOfType(Terrain)];
    for(const terrain of terrains) {
      if(contains(terrain, point)) level.remove(terrain);
    }
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
    this.game.levels.push(newLevel);
    this.game.currentLevel = newLevel;
  }

  private async load() {
    const handles = await window.showOpenFilePicker?.(fileOptions);
    try {
      this.fileHandle = handles?.[0];
      this.updateEnabledness();
      if(!this.fileHandle) return;
      const file = await this.fileHandle.getFile();
      const json = await file.text();
      const levels = deserialize(json);
      this.game.levels.length = 0;
      this.game.levels.push(...levels);
      this.game.currentLevel = this.game.levels[0];
    } finally {
      this.fileHandle = undefined;
      this.updateEnabledness();
    }
  }

  private async saveAs() {
    try {
      this.fileHandle = await window.showSaveFilePicker?.(fileOptions);
      this.save();
    } finally {
      this.fileHandle = undefined;
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
  }
}

function makeButton(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

function makeSelect(options: string[]) {
  const select = document.createElement('select');
  for(const value of options) {
    const option = document.createElement('option');
    option.textContent = value;
    select.appendChild(option);
  }
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
