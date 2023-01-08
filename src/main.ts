import {PRESSED_KEYS} from './keyboard.js';
import {Level} from './level.js';
import {Camera} from './camera.js';
import {Editor} from './editor.js';
import {Game} from './game.js';
import {audioContext, setVolume} from './sounds.js';

async function init() {
  const game = await Game.load('./levels.json');
  const editor = new Editor(game);

  const camera = new Camera();
  document.getElementById('canvas-container')!.appendChild(camera.canvas);
  camera.canvas.addEventListener('blur', () => {
    if(!Editor.active) game.paused = true;
  });

  camera.canvas.focus();

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
    audioContext.resume().catch(e => {
      console.error(`Couldn't resume the audio context:\n${e}`);
    });
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

  const volumeControl = document.getElementById('volume-input') as HTMLInputElement;
  volumeControl.addEventListener('input', () => {
    setVolume(Number(volumeControl.value));
  });

  setVolume(Number(volumeControl.value));
}

addEventListener('load', init);

export interface Entity {
  draw?(camera: Camera): void;
  tick?(dt: number): void;
  level: Level;
}
