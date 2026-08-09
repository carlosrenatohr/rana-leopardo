'use strict';
/* ============================================================
 * Smoke test END-TO-END headless: arranca game.js con un entorno
 * DOM/Canvas/WebAudio simulado, carga el nivel 1, simula un
 * arrastre+disparo, corre la física y verifica victoria/derrota
 * (incluye los contenidos educativos de docs/cornisland.md).
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
  'entities', 'renderer', 'audio', 'level-loader', 'input', 'content', 'ui', 'engine', 'game'];
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
  // El flyover de cámara está activo al iniciar nivel (feature nuevo):
  // el jugador lo corta con la primera interacción (drag/tecla).
  check('flyover de cámara arranca al iniciar nivel', engine.previewT > 0, 'previewT=' + engine.previewT);
  engine._skipPreview();
  runFrames(90);
  check('cámara reiniciada en el origen (tras skip del flyover)',
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

  // Foco de cámara en vuelo: la cámara SÍGUE a la rana lanzada y la
  // mantiene a la vista (~35% del ancho del viewport) para ver la
  // trayectoria según ángulo/fuerza por delante. El stub reporta
  // 1280x720 → visibleW = 1280 y la rana vuela hacia la derecha.
  let frogInView = true;
  let frogScreenX = -1;
  for (let i = 0; i < 8 && engine.activeFrog; i++) {
    runFrames(5);
    const f = engine.activeFrog;
    const vw = engine.camera.visibleW;
    frogScreenX = (f.position.x - engine.camera.x) / vw;
    if (frogScreenX < 0 || frogScreenX > 0.9) frogInView = false;
  }
  check('cámara sigue a la rana lanzada (sigue al objetivo)', engine.camera.followBody === engine.activeFrog || engine.activeFrog === null);
  check('rana visible en el viewport durante el vuelo', frogInView,
    'frac=' + frogScreenX.toFixed(2) + ' cam.x=' + engine.camera.x.toFixed(0) + ' frog.x=' + (engine.activeFrog ? engine.activeFrog.position.x.toFixed(0) : 'consumida'));
  check('rana foco a ~35% del ancho del viewport', frogInView && Math.abs(frogScreenX - 0.35) < 0.25,
    'frac=' + frogScreenX.toFixed(2));

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
  // Los botones de acción del overlay usan iconos (⟲ reintentar, ⏭
  // siguiente), igual que los del HUD — no texto largo. El stub del DOM
  // no parsea innerHTML, así que se verifica el template en la fuente.
  const uiSrc2 = require('fs').readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  check('overlay: botón reintentar es icono (⟲)', new RegExp(
    'btn-overlay-restart[^>]*>\\s*⟲\\s*<\\/button>').test(uiSrc2));
  check('overlay: botón siguiente es icono (⏭)', new RegExp(
    'btn-overlay-next[^>]*>\\s*⏭\\s*<\\/button>').test(uiSrc2));

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

  console.log('\n== H. Contenido educativo (docs/cornisland.md) ==');
  // El modal "Sobre el juego" agrega la información esencial y el objetivo.
  engine.showMenu();
  document.getElementById('btn-info').dispatchEvent({ type: 'click' });
  check('modal de información se abre desde el menú',
    engine.ui.modal && engine.ui.modal.hidden === false);
  check('modal incluye el objetivo del juego', /Objetivo/.test(engine.ui.modalBody.innerHTML),
    'objetivo presente');
  document.getElementById('modal-close').dispatchEvent({ type: 'click' });
  check('modal se cierra', engine.ui.modal.hidden === true);

  // Footer con el desarrollador (el stub DOM no reconstruye el innerHTML de
  // los nodos anidados, así que se verifica el template de ui.js en la fuente).
  const uiSrc = require('fs').readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  check('footer del menú acredita a Nativerse', /menu-footer[\s\S]*Nativerse/.test(uiSrc) && /Nativerse/.test(NS.Content.menu.footer + ' Nativerse'));
  check('footer del menú incluye "Desarrollado por"', NS.Content.menu.footer === 'Desarrollado por');

  // La curiosidad NO se muestra en la victoria (solo al inicio y con 💡)
  engine.ui.showVictory({
    score: 1600,
    stars: 2,
    best: engine.progress.best,
    hasNext: true,
    level: 3,
    bestScore: 0,
    newRecord: false
  });
  const factEl = document.getElementById('overlay-fact');
  check('victoria no muestra la curiosidad (ocupa espacio)',
    factEl.hidden === true);

  // Último nivel: botón de final y modal con el cierre del juego
  engine.ui.showVictory({
    score: 4000,
    stars: 3,
    best: engine.progress.best,
    hasNext: false,
    level: 6,
    bestScore: 0,
    newRecord: false
  });
  const finalBtn = document.getElementById('btn-overlay-final');
  check('último nivel ofrece "Ver final"', finalBtn.hidden === false);
  finalBtn.dispatchEvent({ type: 'click' });
  check('modal final se abre', engine.ui.modal && engine.ui.modal.hidden === false);
  check('modal final incluye el agradecimiento', /Gracias por jugar/.test(document.getElementById('modal-title').textContent),
    document.getElementById('modal-title').textContent);
  check('modal final incluye "cuidemos la naturaleza"', /Cuidemos la naturaleza/.test(engine.ui.modalBody.innerHTML || ''));
  document.getElementById('modal-primary').dispatchEvent({ type: 'click' });
  check('cerrar el final vuelve al menú', engine.state === 'MENU');

  console.log('\n== I. HUD en partida: menú, curiosidad y recon ==');
  await engine.startLevel(1);
  // Botón de volver al menú principal dentro del nivel
  const menuBtn = document.getElementById('btn-hud-menu');
  check('botón de menú presente en el HUD', !!menuBtn);
  menuBtn.dispatchEvent({ type: 'click' });
  check('botón del HUD vuelve al menú', engine.state === 'MENU' && engine.ui.hud.hidden === true);

  // Curiosidad transitoria al entrar al nivel (viene del banco barajado)
  await engine.startLevel(2);
  const fact = document.getElementById('hud-fact');
  check('curiosidad visible al iniciar nivel', fact && fact.hidden === false);
  const bankTitles = NS.Content.facts.map((f) => f.title);
  check('curiosidad viene del banco de hechos',
    bankTitles.includes(document.getElementById('hud-fact-title').textContent),
    document.getElementById('hud-fact-title').textContent);
  // El siguiente fact del banco no repite el último mostrado
  const first = engine.ui._nextFact();
  const second = engine.ui._nextFact();
  check('la baraja no repite el fact inmediatamente anterior', first !== second);
  // Reabrir/cerrar con el botón 💡
  document.getElementById('btn-hud-fact').dispatchEvent({ type: 'click' });
  check('botón 💡 oculta la curiosidad', fact.classList.contains('hide'));
  document.getElementById('btn-hud-fact').dispatchEvent({ type: 'click' });
  check('botón 💡 re-muestra la curiosidad', !fact.classList.contains('hide') && !fact.hidden);

  // Mini-mapa de cangris (recon)
  const recon = document.getElementById('recon');
  check('recon visible al iniciar nivel', recon.hidden === false);
  check('recon contiene posiciones de enemigos', /[\u{1F980}\u{1F9A5}\u{1F965}]/u.test(engine.ui.reconTrack.innerHTML),
    engine.ui.reconTrack.innerHTML);
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  await new Promise((r) => setTimeout(r, 400)); // espera el toque único (350 ms)
  check('botón 🔍 (un toque) oculta el recon', recon.hidden === true);
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  await new Promise((r) => setTimeout(r, 400));
  check('botón 🔍 (un toque) re-muestra el recon', recon.hidden === false);

  // Doble toque en la lupita: toggle de ZOOM sobre los cangris (feature
  // nuevo): activa el zoom y lo desactiva de vuelta.
  check('zoom de cangris inactivo por defecto', engine.enemyZoom === false);
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  await new Promise((r) => setTimeout(r, 50));
  check('doble toque activa el zoom de cangris', engine.enemyZoom === true,
    'enemyZoom=' + engine.enemyZoom);
  check('vista de cangris con zoom > 1', engine.camera.targetZoom > 1,
    'zoom=' + engine.camera.targetZoom.toFixed(2));
  runFrames(30);
  check('cámara enfoca el centro de masa de los cangris vivos',
    engine.camera.targetX > engine.levelData.width / 4,
    'targetX=' + engine.camera.targetX.toFixed(0));
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  document.getElementById('btn-hud-recon').dispatchEvent({ type: 'click' });
  await new Promise((r) => setTimeout(r, 50));
  check('doble toque desactiva el zoom y vuelve a la resortera',
    engine.enemyZoom === false && engine.camera.targetZoom === 1,
    'enemyZoom=' + engine.enemyZoom + ' zoom=' + engine.camera.targetZoom);

  console.log('\n== I.b. Aviso de rotación (solo horizontal) ==');
  const rotateHint = document.getElementById('rotate-hint');
  // El stub reporta 1280x720 (horizontal) → la sugerencia debe verse
  check('aviso de girar visible en horizontal', rotateHint.classList.contains('show'));
  // Simular paso a vertical (height > width) → se oculta
  global.window.innerHeight = 900;
  global.window.innerWidth = 420;
  global.window.dispatchEvent({ type: 'resize' });
  check('aviso oculto en vertical', !rotateHint.classList.contains('show'));

  console.log('\n== J. Identidad visual y PWA ==');
  // El splash debe marcarse como 'done' al arrancar el motor.
  const splash = document.getElementById('splash');
  check('splash marcado como done al arrancar', splash.classList.contains('done'));

  const html = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('index.html enlaza el manifest', /rel="manifest"\s+href="site\.webmanifest"/.test(html));
  check('index.html tiene apple-touch-icon', /rel="apple-touch-icon"/.test(html));
  check('index.html tiene favicon SVG', /favicon\.svg/.test(html));
  check('index.html tiene metadatos Open Graph', /property="og:image"/.test(html));
  check('index.html registra el service worker', /js\/pwa\.js/.test(html));

  const manifest = JSON.parse(require('fs').readFileSync(path.join(ROOT, 'site.webmanifest'), 'utf8'));
  check('manifest es JSON válido', !!manifest.id && manifest.display === 'standalone');
  check('manifest incluye icono maskable', manifest.icons.some((i) => i.purpose === 'maskable'));
  check('manifest tiene shortcut "Jugar"', /start=level/.test(manifest.shortcuts[0].url));

  const sw = require('fs').readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  check('service worker existe y precachea la app shell', sw.includes('cache.addAll') && sw.includes('PRECACHE'));

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
