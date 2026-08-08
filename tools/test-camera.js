/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * tools/test-camera.js
 * ------------------------------------------------------------
 * Verifica la cámara RESPONSIVE:
 *   - Horizontal: escala "cover" (comportamiento clásico intacto).
 *   - Vertical: zoom-out a ~640 px de mundo visibles en horizontal.
 *   - El seguimiento y el clamp usan el viewport REAL (no el ancho
 *     de diseño 1280), para que la cámara siga a la rana en vertical.
 *
 * Uso:  node tools/test-camera.js
 * ============================================================ */
'use strict';

require('../js/utils.js');
require('../js/camera.js');

const { Camera } = globalThis.FrogGame.Camera;

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✓ ' + msg);
  } else {
    failed++;
    console.error('  ✗ ' + msg);
  }
}

function approx(a, b, tol, msg) {
  ok(Math.abs(a - b) <= tol, `${msg} (${a.toFixed(2)} ≈ ${b.toFixed(2)} ±${tol})`);
}

console.log('— Horizontal (cover clásico) —');

let cam = new Camera(1280, 720);
cam.resize(1280, 720);
approx(cam.scale, 1, 0.001, '1280×720 → escala 1');
approx(cam.visibleW, 1280, 0.5, '1280×720 → ancho visible 1280');
approx(cam.visibleH, 720, 0.5, '1280×720 → alto visible 720');

cam = new Camera(1280, 720);
cam.resize(1920, 1080);
approx(cam.scale, 1.5, 0.001, '1920×1080 → escala 1.5');
approx(cam.visibleW, 1280, 0.5, '1920×1080 → ancho visible 1280');

cam = new Camera(1280, 720);
cam.resize(800, 600);
approx(cam.scale, 0.8333, 0.001, '800×600 → escala max(0.625, 0.833)');
approx(cam.visibleW, 960, 0.5, '800×600 → ancho visible 960');

console.log('— Vertical (zoom-out responsive) —');

cam = new Camera(1280, 720);
cam.resize(390, 844);
approx(cam.scale, 390 / 640, 0.001, '390×844 → escala = ancho/640');
approx(cam.visibleW, 640, 0.5, '390×844 → ancho visible 640');
approx(cam.visibleH, 844 / cam.scale, 0.5, '390×844 → alto visible = alto/escala');

cam = new Camera(1280, 720);
cam.resize(800, 1280);
approx(cam.visibleW, 640, 0.5, 'tablet vertical → ancho visible 640');
ok(cam.visibleH < 1280 + 1, 'tablet vertical → se ve el alto real');

cam = new Camera(1280, 720);
cam.resize(200, 1000);
ok(cam.visibleH <= 3200 + 0.5, 'ventana ultra estrecha → límite de zoom-out');

console.log('— Centro y culling —');

cam = new Camera(1280, 720);
cam.resize(390, 844);
cam.x = 0;
cam.y = 0;
approx(cam.center.x, 320, 0.5, 'centro.x = visibleW/2');
ok(cam.isVisible({ x: 600, y: 500 }), 'punto dentro del viewport visible');
ok(!cam.isVisible({ x: 900, y: 500 }), 'punto fuera del viewport no visible');

console.log('— Seguimiento en vertical (regresión del clamp) —');

// ANTES del fix: el clamp usaba viewW = 1280/0.609 ≈ 2102, así que
// maxX = 2400 − 2102 = 298 y la cámara NO seguía a la rana en vertical.
cam = new Camera(1280, 720);
cam.resize(390, 844);
cam.setBounds(0, 2400, 0, 720);
const dummy = { getWorldCenter: () => ({ x: 1500, y: 600 }), velocity: { x: 0, y: 0 } };
cam.follow(dummy);
for (let i = 0; i < 120; i++) cam.update(1 / 60);
approx(cam.x, 1335, 12, 'la cámara sigue a la rana (x≈1335, no 298)');
ok(cam.x > 1000, 'seguimiento real en vertical: cámara desplazada a la derecha');

// Cámara parada en el menú: x e y deben quedar clavadas en 0 en vertical
cam = new Camera(1280, 720);
cam.resize(390, 844);
cam.setBounds(0, 2400, 0, 720);
for (let i = 0; i < 30; i++) cam.update(1 / 60);
approx(cam.x, 0, 0.5, 'sin objetivo → x permanece 0');
approx(cam.y, 0, 0.5, 'sin objetivo → y permanece 0');

console.log('========================================');
console.log(`RESULTADO: ${passed} ✓  ${failed} ✗`);
console.log('========================================');
process.exit(failed === 0 ? 0 : 1);
