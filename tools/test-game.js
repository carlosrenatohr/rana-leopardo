'use strict';
/* ============================================================
 * Smoke test END-TO-END headless: arranca game.js con un entorno
 * DOM/Canvas/WebAudio simulado, carga el nivel 1, simula un
 * arrastre+disparo, corre la física y verifica victoria/derrota.
 * ============================================================ */
const path = require('path');
const ROOT = '/home/renato/Codee/rana-leopardo-game';

/* ---------------- Stubs del navegador ---------------- */

function makeChameleon() {
  const fn = function () {};
  return new Proxy(fn, {
    get: () => makeChameleon(),
    set: () => true,
    apply: () => makeChameleon()
  });
}

function makeEl(tag) {
  const el = {
    tagName: tag,
    style: {},
    children: [],
    hidden: false,
    className: '',
    id: '',
    innerHTML: '',
    textContent: '',
    disabled: false,
    listeners: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._s.has(c)) { this._s.delete(c); return false; }
          this._s.add(c); return true;
        }
        if (force) this._s.add(c); else this._s.delete(c);
        return !!force;
      }
    },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore(c) { this.children.unshift(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    setAttribute(k, v) { this[k] = String(v); },
    getAttribute(k) { return this[k]; },
    addEventListener(t, fn) { (this.listeners[t] || (this.listeners[t] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { const t = ev.type || ''; for (const fn of this.listeners[t] || []) fn(ev); return true; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }; },
    insertAdjacentHTML() {},
    querySelector(sel) { if (sel && sel[0] === '#') return elFor(sel.slice(1)); return makeEl('div'); },
    querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}
  };
  return el;
}

const elCache = new Map();
function elFor(id) {
  if (!elCache.has(id)) {
    const e = makeEl('div');
    e.id = id;
    elCache.set(id, e);
  }
  return elCache.get(id);
}

// Canvas con contexto 2D camaleónico
const canvas = makeEl('canvas');
canvas.id = 'game';
canvas.getContext = () => new Proxy({}, {
  get: (t, p) => {
    if (p === 'canvas') return canvas;
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
    return makeChameleon();
  },
  set: () => true
});
elCache.set('game', canvas);

// AudioContext mínimo
class FakeAudioParam {
  constructor() { this.value = 0; }
  setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} cancelScheduledValues() {}
}
class FakeNode {
  constructor() { this.gain = new FakeAudioParam(); this.frequency = new FakeAudioParam(); this.Q = new FakeAudioParam(); this.detune = new FakeAudioParam(); this.type = ''; this.buffer = null; this.loop = false; }
  connect() { return this; } disconnect() {} start() {} stop() {} resume() {} addColorStop() {}
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = new FakeNode(); }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createBuffer(ch, len, rate) { return { getChannelData: () => new Float32Array(len), length: len, sampleRate: rate, numberOfChannels: ch }; }
  decodeAudioData() { return Promise.resolve({}); }
}

const localStorage = {
  _d: {},
  getItem(k) { return this._d[k] !== undefined ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

let rafCb = null;
global.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
global.cancelAnimationFrame = () => {};
global.setInterval = () => 0; // desactiva la música (evita colgar el proceso)

global.window = {
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
  listeners: {},
  addEventListener(t, fn) { (this.listeners[t] || (this.listeners[t] = [])).push(fn); },
  removeEventListener() {},
  dispatchEvent(ev) { for (const fn of this.listeners[ev.type] || []) fn(ev); },
  AudioContext: FakeAudioContext,
  webkitAudioContext: undefined
};
global.document = {
  readyState: 'complete',
  body: makeEl('body'),
  listeners: {},
  addEventListener(t, fn) { (this.listeners[t] || (this.listeners[t] = [])).push(fn); },
  getElementById: (id) => elFor(id),
  createElement: (tag) => makeEl(tag),
  createElementNS: () => makeEl('svg'),
  querySelector: () => makeEl('div'),
  querySelectorAll: () => []
};
global.localStorage = localStorage;
global.performance = { now: () => Date.now() };
global.window.performance = global.performance;

/* ---------------- Cargar el juego (mismo orden que index.html) ---------------- */
const files = ['utils', 'collision', 'physics', 'camera', 'particles', 'lighting', 'scene',
  'entities', 'renderer', 'audio', 'level-loader', 'input', 'ui', 'engine', 'game'];
for (const f of files) {
  try {
    require(path.join(ROOT, 'js', f + '.js'));
  } catch (e) {
    console.error('FALLO al cargar js/' + f + '.js:', e.message);
    process.exit(1);
  }
}

const NS = global.window.FrogGame;
const engine = NS.EngineInstance;
if (!engine) {
  console.error('FALLO: game.js no arrancó el Engine');
  process.exit(1);
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  (' + extra + ')' : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  (' + extra + ')' : '')); }
}
function frame(t) {
  const cb = rafCb;
  rafCb = null;
  if (cb) cb(t);
}
function runFrames(n, dt = 16.7) {
  let t = engine._lastTime;
  for (let i = 0; i < n; i++) { t += dt; frame(t); }
}
function dispatchPointer(type, x, y, pointerId = 1) {
  // pointerdown/pointermove están en el canvas; pointerup en la ventana
  const target = (type === 'pointerup' || type === 'pointercancel') ? global.window : canvas;
  target.dispatchEvent({ type, clientX: x, clientY: y, pointerId });
}
function allFinite() {
  const bad = [];
  for (const e of engine.entities) {
    if (!isFinite(e.position.x) || !isFinite(e.position.y) || !isFinite(e.angle) || !isFinite(e.velocity.x)) bad.push(e.entityType);
  }
  if (engine.activeFrog && (!isFinite(engine.activeFrog.position.x) || !isFinite(engine.activeFrog.position.y))) bad.push('frog');
  return bad;
}

console.log('\n== A. Arranque + menú ==');
check('engine creado', !!engine);
check('estado MENU', engine.state === 'MENU');
check('escena de menú construida', !!engine.scene);
// Regresión CSS: si falta la regla [hidden], los overlays (victoria,
// derrota, HUD) se ven desde el arranque porque .overlay/.menu/.hud
// definen display:flex, que anula el atributo hidden del navegador.
const cssText = require('fs').readFileSync(path.join(ROOT, 'style.css'), 'utf8');
check('CSS: regla [hidden] presente', /\[hidden\]\s*{[^}]*display\s*:\s*none\s*!important/.test(cssText));
runFrames(30);
check('sin NaN tras 30 frames de menú', allFinite().length === 0, allFinite().join(',') || 'ok');  console.log('\n== A2. Botón Jugar (regresión ui.startLevel) ==');
  (async () => {
  engine.showMenu();
  runFrames(2);
  document.getElementById('btn-play').dispatchEvent({ type: 'click' });
  await new Promise((r) => setTimeout(r, 80));
  check('botón Jugar inicia el nivel 1', engine.state === 'PLAYING' && engine.levelIndex === 1 && engine.frogQueue === 4,
    'estado=' + engine.state + ' nivel=' + engine.levelIndex);

  console.log('\n== A3. Cámara vuelve al inicio al reiniciar ==');
  engine.camera.x = 1335;
  engine.camera.y = 300;
  engine.camera.targetX = 1335;
  engine.camera.targetY = 300;
  await engine.restartLevel();
  runFrames(90);
  check('cámara reiniciada en el origen',
    Math.abs(engine.camera.x) < 20 && Math.abs(engine.camera.targetX) < 20 && Math.abs(engine.camera.y) < 20,
    'x=' + engine.camera.x.toFixed(0) + ' tx=' + engine.camera.targetX.toFixed(0) + ' y=' + engine.camera.y.toFixed(0));

  console.log('\n== B. Cargar nivel 1 ==');
  await engine.startLevel(1);
  check('estado PLAYING', engine.state === 'PLAYING');
  check('nivel 1 cargado', engine.levelIndex === 1 && !!engine.levelData);
  check('HUD visible', engine.ui.hud && engine.ui.hud.hidden === false);
  check('HUD muestra objetivo de estrellas', /900/.test(document.getElementById('hud-goal').textContent),
    document.getElementById('hud-goal').textContent);
  check('4 ranas en cola', engine.frogQueue === 4);
  check('rana en la resortera', !!engine.heldFrog);
  check('2 enemigos', engine.enemyCount === 2);
  check('5 objetos creados', engine.entities.length === 5, engine.entities.map(e => e.entityType).join(','));
  runFrames(20);

  console.log('\n== C. Arrastrar y lanzar ==');
  dispatchPointer('pointerdown', 400, 300);           // agarra cerca de la rana
  dispatchPointer('pointermove', 10, 590);           // estira hacia abajo-izquierda
  console.log('  debug: dragging=' + engine.dragging + ' pull=(' + engine.pull.x.toFixed(1) + ',' + engine.pull.y.toFixed(1) + ') traj=' + engine.trajectory.length + ' frog=(' + (engine.heldFrog ? engine.heldFrog.position.x.toFixed(0) : '?') + ',' + (engine.heldFrog ? engine.heldFrog.position.y.toFixed(0) : '?') + ')');
  check('arrastrando', engine.dragging === true);
  check('trayectoria calculada', Array.isArray(engine.trajectory) && engine.trajectory.length > 5, engine.trajectory.length + ' pts');
  const traj0 = engine.trajectory.length;
  dispatchPointer('pointerup', 10, 590);             // soltar → lanzar
  check('rana lanzada', engine.activeFrog !== null && engine.heldFrog === null);
  check('cola reducida a 3', engine.frogQueue === 3);
  const v0 = engine.activeFrog ? engine.activeFrog.velocity.length().toFixed(0) : '?';
  check('velocidad inicial sensible', engine.activeFrog && engine.activeFrog.velocity.length() > 500, v0 + ' px/s');

  console.log('\n== C2. Estela de vuelo registrada ==');
  for (let i = 0; i < 10; i++) runFrames(5);
  check('estela de vuelo acumula posiciones', engine.trail.length > 3, engine.trail.length + ' pts');

  console.log('\n== D. Simular 8s de física (impacto en la torre) ==');
  for (let i = 0; i < 8; i++) {
    runFrames(60);
    const f = engine.activeFrog;
    if (f) {
      console.log(`  t=${i + 1}s frog x=${f.position.x.toFixed(0)} y=${f.position.y.toFixed(0)} v=${f.velocity.length().toFixed(0)} w=${f.angularVelocity.toFixed(1)} sleep=${f.sleeping} timer=${engine.frogSettledTimer.toFixed(2)}`);
    } else {
      console.log(`  t=${i + 1}s frog consumida (activeFrog=null)`);
      break;
    }
  }
  runFrames(120);
  const bad = allFinite();
  check('sin NaN en toda la simulación', bad.length === 0, bad.join(',') || 'ok');
  check('rana consumida o en vuelo', engine.activeFrog === null || engine.frogSettledTimer > 0);
  const destroyed = 5 - engine.entities.length;
  const scored = engine.score > 0;
  console.log('  info: trayectoria_preview=' + traj0 + ' objetos restantes=' + engine.entities.length + ' puntos=' + engine.score + ' estado=' + engine.state);

  console.log('\n== E. Victoria forzada (matar enemigos) ==');
  await engine.restartLevel();
  const crabs = engine.entities.filter((e) => e.isEnemy);
  for (const c of crabs) engine._entityDied(c, c.position);
  check('estado WON', engine.state === 'WON');
  check('puntos incluyen bonus nivel', engine.score >= 500);
  check('progreso desbloquea nivel 2', engine.progress.unlocked === 2);
  check('mejor puntuación guardada', (engine.progress.best[1] || 0) >= 1, engine.progress.best[1]);
  check('récord de puntuación guardado', engine.progress.scores[1] === engine.score, engine.progress.scores[1]);
  await new Promise((r) => setTimeout(r, 900));
  check('overlay de victoria visible', engine.ui.overlay.hidden === false);
  check('victoria muestra récord del nivel', /récord/i.test(document.getElementById('overlay-record').textContent),
    document.getElementById('overlay-record').textContent);

  console.log('\n== F. Derrota forzada ==');
  await engine.restartLevel();
  engine.frogQueue = 0;
  const frog = new NS.Entities.Frog();
  frog.position.set(300, 400);
  engine.world.addBody(frog);
  engine.activeFrog = frog;
  engine._consumeFrog('rest');
  check('estado LOST', engine.state === 'LOST');
  check('overlay de derrota visible', engine.ui.overlay.hidden === false);
  check('derrota informa de cangris restantes', /cangri/.test(document.getElementById('overlay-info').textContent),
    document.getElementById('overlay-info').textContent);

  console.log('\n== G. Cambio de nivel y menú ==');
  await engine.startLevel(2);
  check('nivel 2 cargado', engine.levelIndex === 2 && engine.state === 'PLAYING');
  check('nivel 2: 7 objetos', engine.entities.length === 7, engine.entities.map(e => e.entityType).join(','));

  // Regresión: dibujar el cristal no debe romper (_drawHitFlash en la base)
  const crystal = engine.entities.find((e) => e.entityType === 'crystal-block');
  check('bloque cristal existe', !!crystal);
  let drawOk = true;
  try {
    runFrames(10); // renderiza todos los objetos del nivel 2 (incluido cristal)
  } catch (e) {
    drawOk = false;
  }
  check('cristal se dibuja sin crash', drawOk);

  // Regresión: morir un pez globo usa partículas.bubble (que ahora existe)
  const puff = engine.entities.find((e) => e.entityType === 'pufferfish');
  check('pez globo existe', !!puff);
  let puffOk = true;
  try {
    engine._entityDied(puff, puff.position);
  } catch (e) {
    puffOk = false;
  }
  check('pez globo muere sin crash (bubble)', puffOk);
  check('burbujas emitidas al morir', engine.particles.items.some((p) => p.type === 'bubble'));

  engine.showMenu();
  check('vuelta al menú', engine.state === 'MENU');
  // El selector de niveles muestra el récord por nivel (persistido).
  // Nota: el stub del DOM no limpia `children` al reasignar innerHTML,
  // así que buscamos el récord en cualquier tarjeta (en el navegador real
  // la rejilla se reconstruye desde cero).
  const selectEl = document.getElementById('level-select');
  const cards = (selectEl && selectEl.children) || [];
  const hasRecord = cards.some((c) => /2500/.test(c.innerHTML || ''));
  check('selector muestra récord del nivel 1', hasRecord,
    cards.map((c) => (c.innerHTML || '').match(/🏆 \d+/)).filter(Boolean).join(' | ') || 'sin 🏆');
  check('getBestScore(1) devuelve el récord', engine.getBestScore(1) === 2500, engine.getBestScore(1));
  // El nombre del nivel se oculta solo (clase .hide tras el timer)
  await engine.startLevel(1);
  const nameEl = document.getElementById('hud-levelname');
  check('nombre de nivel visible al entrar', nameEl && !nameEl.classList.contains('hide'));
  // Mostrar que el temporizador de 3 s añade la clase .hide de verdad
  const preHide = nameEl.classList.contains('hide');
  await new Promise((r) => setTimeout(r, 3200));
  check('nombre de nivel se oculta solo a los ~3 s', !preHide && nameEl.classList.contains('hide'),
    'hide=' + nameEl.classList.contains('hide'));

  console.log('\n========================================');
  console.log(`RESULTADO: ${pass} ✓  ${fail} ✗`);
  console.log('========================================');
  // Cerrar intervalos de música pendientes (si el stub dejó alguno)
  try { clearInterval(engine.audio._musicTimer); } catch (e) {}
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('EXCEPCIÓN en smoke test:', e);
  process.exit(1);
});
