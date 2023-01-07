import {GRID_SIZE} from './constants.js';
import {Player} from './player.js';
import {Terrain} from './terrain.js';
import {serialize, deserialize} from './serialization.js';
import {Point} from './math.js';
import {Game} from './game.js';

export class Editor {
  readonly toolbar: HTMLElement;
  active = false;
  private readonly saveButton = makeButton('save', () => this.save());
  private readonly saveAsButton = makeButton('save as', () => this.saveAs());
  private readonly loadButton = makeButton('load', () => this.load());
  private readonly toolSelect = makeSelect(['none', 'terrain', 'player']);

  private fileHandle?: FileSystemFileHandle;

  private activeThing: Player|Terrain|null = null;

  constructor(private readonly game: Game) {
    this.toolbar = document.createElement('div');
    this.toolbar.classList.add('editor', 'toolbar')
    this.toolbar.appendChild(this.saveButton);
    this.toolbar.appendChild(this.saveAsButton);
    this.toolbar.appendChild(this.loadButton);
    this.toolbar.appendChild(this.toolSelect);
    this.updateEnabledness();
  }

  mousedown(evt: MouseEvent) {
    if(!this.active) return;
    const mode = this.toolSelect.value;
    switch(mode) { 
      case 'player':
        this.activeThing = this.findOrCreatePlayer();
        this.mousemove(evt);
        break;
      case 'terrain':
        this.activeThing = this.createTerrain(this.getClickedPointOnGrid(evt));
        break;
      default:
        console.log(`tool ${mode} not implemented`);
        break;
    }
  }

  private findOrCreatePlayer() {
    const [level] = this.game.levels;
    let player = level.entities.find(e => e instanceof Player) as Player|undefined;
    if(!player) {
      player = new Player();
      level.add(player);
    }
    return player;
  }

  private createTerrain(point: Point) {
    const terrain = new Terrain();
    terrain.x = point.x;
    terrain.y = point.y;
    this.game.levels[0].add(terrain);
    return terrain;
  }

  mouseup(_evt: MouseEvent) {
    this.activeThing = null;
  }

  mousemove(evt: MouseEvent) {
    if(!this.activeThing) return;
    if(this.activeThing instanceof Player) {
      const clickedPoint = this.getClickedPoint(evt);
      this.activeThing.x = clickedPoint.x;
      this.activeThing.y = clickedPoint.y;
    } else if(this.activeThing instanceof Terrain) {
      const clickedCell = this.getClickedPointOnGrid(evt);
      this.activeThing.width = clickedCell.x - this.activeThing.x;
      this.activeThing.height = clickedCell.y - this.activeThing.y;
    }
  }

  private getClickedPointOnGrid(evt: MouseEvent): Point {
    const {x, y} = this.getClickedPoint(evt);
    return {
      x: Math.ceil(x / GRID_SIZE) * GRID_SIZE,
      y: Math.ceil(y / GRID_SIZE) * GRID_SIZE,
    };
  }

  private getClickedPoint(evt: MouseEvent): Point {
    return { x: evt.offsetX, y: evt.offsetY };
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
      this.game.levels = levels;
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
