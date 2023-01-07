import {PRESSED_KEYS} from './keyboard.js';
import {Level} from './level.js';
import {Camera} from './camera.js';
import {Editor} from './editor.js';
import {Game} from './game.js';

async function init() {
  const game = await Game.load('./levels.json');
  const editor = new Editor(game);

  const camera = new Camera();
  document.body.appendChild(camera.canvas);
  document.body.appendChild(editor.toolbar);

  requestAnimationFrame(tick);

  let then = 0;
  function tick(now: number) {
    if(then) {
      const dt = (now - then) / 1000;
      if(!Editor.active) game.tick(dt);
      camera.clear();
      if(Editor.active) camera.drawGrid();
      game.draw(camera);
    }
    then = now;
    requestAnimationFrame(tick);
    doHotkeys();
    PRESSED_KEYS.clear();
  }

  function doHotkeys() {
    if(PRESSED_KEYS.has('`')) {
      Editor.active = !Editor.active
      document.body.classList.toggle('editing', Editor.active);
    }
  }

  camera.canvas.addEventListener('mousedown', evt => editor.mousedown(evt));
  camera.canvas.addEventListener('mouseup', evt => editor.mouseup(evt));
  camera.canvas.addEventListener('mousemove', evt => editor.mousemove(evt));
  camera.canvas.addEventListener('contextmenu', evt => {
    if(Editor.active) evt.preventDefault();
  });
}

addEventListener('load', init);

export interface Entity {
  draw?(camera: Camera): void;
  tick?(dt: number): void;
  level?: Level;
}
