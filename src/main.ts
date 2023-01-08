import {PRESSED_KEYS} from './keyboard.js';
import {Level} from './level.js';
import {Camera} from './camera.js';
import {Editor} from './editor.js';
import {Game} from './game.js';

Editor.active = true;
document.body.classList.add('editing');

async function init() {
  const game = await Game.load('./levels.json');
  const editor = new Editor(game);

  const camera = new Camera();
  document.body.appendChild(camera.canvas);
  document.body.appendChild(editor.toolbar);
  camera.canvas.addEventListener('blur', () => {
    if(!Editor.active) game.paused = true;
  });

  requestAnimationFrame(tick);

  let then = 0;
  function tick(now: number) {
    if(then) {
      const dt = (now - then) / 1000;
      game.tick(dt);
      camera.clear();
      if(Editor.active) camera.drawGrid();
      game.draw(camera);
    }
    then = now;
    requestAnimationFrame(tick);
    doHotkeys();
    PRESSED_KEYS.clear();

    if(game.paused) {
      camera.ctx.save();
      camera.ctx.textAlign = 'center';
      camera.ctx.textBaseline = 'middle';
      camera.ctx.font = '72pt sans';
      camera.ctx.fillText('Paused', camera.width / 2, camera.height / 2);
      camera.ctx.restore();
    }
  }

  function doHotkeys() {
    if(PRESSED_KEYS.has('Backquote')) {
      Editor.active = !Editor.active
      document.body.classList.toggle('editing', Editor.active);
    }

    if(PRESSED_KEYS.has('KeyP')) game.paused = !game.paused;
  }

  camera.canvas.addEventListener('mousedown', evt => {
    if(Editor.active) editor.mousedown(evt);
  });
  camera.canvas.addEventListener('mouseup', evt => {
    if(Editor.active) {
      editor.mouseup(evt);
    } else {
      game.paused = false;
    }
  });
  camera.canvas.addEventListener('mousemove', evt => {
    if(Editor.active) editor.mousemove(evt);
  });
  camera.canvas.addEventListener('contextmenu', evt => {
    if(Editor.active) evt.preventDefault();
  });
}

addEventListener('load', init);

export interface Entity {
  draw?(camera: Camera): void;
  tick?(dt: number): void;
  level: Level;
}
