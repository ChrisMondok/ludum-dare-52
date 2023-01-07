import {serialize} from './serialization.js';
import {PRESSED_KEYS} from './keyboard.js';
import {Player} from './player.js';
import {Terrain} from './terrain.js';
import {Game} from './game.js';
import {GRID_SIZE} from './constants.js';

function init() {
  const game = new Game();
  (window as any).game = game;
  document.body.appendChild(game.canvas);
  game.add(new Player());
  const ground = new Terrain();
  ground.x = GRID_SIZE * 4;
  ground.y = GRID_SIZE * 10;
  ground.width = GRID_SIZE * 16;
  ground.height = GRID_SIZE * 2;
  game.add(ground);

  requestAnimationFrame(tick);

  let then = 0;
  function tick(now: number) {
    if(then) {
      const dt = (now - then) / 1000;
      game.tick(dt);
      game.draw();
    }
    then = now;
    requestAnimationFrame(tick);
    PRESSED_KEYS.clear();
  }

  (window as any).save = function() {
    console.log(JSON.parse(serialize(game)));
  }
}


addEventListener('load', init);

export interface Entity {
  draw?(ctx: CanvasRenderingContext2D): void;
  tick?(dt: number): void;
  game?: Game;
}
