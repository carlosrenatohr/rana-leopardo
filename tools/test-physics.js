#!/usr/bin/env node
/* ============================================================
 * tools/test-physics.js
 * ------------------------------------------------------------
 * Test headless del motor físico (sin navegador):
 *   - Manifolds: círculo-círculo, círculo-polígono, polígono-polígono
 *   - Caída + rebote + reposo (sleeping)
 *   - Pila de 3 bloques estable
 *   - Lanzamiento balístico + impacto reportado
 *
 * Uso: node tools/test-physics.js
 * ============================================================ */
'use strict';

const path = require('path');
const ROOT = path.join(__dirname, '..');
const requireInOrder = (names) => {
  for (const n of names) require(path.join(ROOT, 'js', n + '.js'));
  return globalThis.FrogGame;
};

const { Vec2 } = requireInOrder(['utils', 'collision', 'physics']).Utils;
const { CircleShape, PolygonShape, collide } = requireInOrder([]).Collision;
const { Body, World, PHYSICS } = requireInOrder([]).Physics;

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log('  ✓ ' + label);
  else { failures++; console.error('  ✗ ' + label); }
};

const eps = 1e-4;

/* ---------- AYUDA: cuerpos ---------- */
function makeBody(shape, opts = {}) {
  const b = new Body(Object.assign({ position: new Vec2(), shape }, opts));
  b.shape.body = b;
  return b;
}

console.log('\n== 1. Manifold círculo-círculo ==');
{
  const A = makeBody(new CircleShape(10), { position: new Vec2(0, 0) });
  const B = makeBody(new CircleShape(10), { position: new Vec2(15, 0) });
  const m = collide(A.shape, B.shape);
  ok(m && Math.abs(m.depth - 5) < eps, `penetración 5 (got ${m && m.depth})`);
  ok(m && Math.abs(m.normal.x - 1) < eps && Math.abs(m.normal.y) < eps, `normal A→B (1,0) (got ${m && m.normal.x},${m && m.normal.y})`);
  const sep = makeBody(new CircleShape(10), { position: new Vec2(0, 0) });
  const sepB = makeBody(new CircleShape(10), { position: new Vec2(25, 0) });
  ok(collide(sep.shape, sepB.shape) === null, 'separados → null');
}

console.log('\n== 2. Manifold círculo-polígono ==');
{
  // Rect 20x20 en (0,0); círculo a la derecha penetrando 2px
  const P = makeBody(PolygonShape.rect(20, 20), { position: new Vec2(0, 0) });
  const C = makeBody(new CircleShape(10), { position: new Vec2(18, 0) });
  const m = collide(C.shape, P.shape); // C es A, P es B
  ok(m, 'hay colisión círculo→polígono');
  ok(m && m.normal.x < -0.99, `normal apunta al polígono (-1,0) (got ${m && m.normal.x})`);
  ok(m && Math.abs(m.depth - 2) < eps, `penetración 2 (got ${m && m.depth})`);

  // Simetría: P es A, C es B → normal invertida
  const m2 = collide(P.shape, C.shape);
  ok(m2 && m2.normal.x > 0.99, `normal polígono→círculo (+1,0) (got ${m2 && m2.normal.x})`);

  // Círculo arriba del rect: normal de A(círculo)→B(rect) apunta hacia ABAJO
  const C2 = makeBody(new CircleShape(10), { position: new Vec2(0, -18) });
  const m3 = collide(C2.shape, P.shape);
  ok(m3 && m3.normal.y > 0.99, `normal apunta al rect (0,+1) (got ${m3 && m3.normal.y})`);
}

console.log('\n== 3. Manifold polígono-polígono (SAT + clipping) ==');
{
  // Dos rect 20x20, solapados 5px
  const A = makeBody(PolygonShape.rect(20, 20), { position: new Vec2(0, 0) });
  const B = makeBody(PolygonShape.rect(20, 20), { position: new Vec2(15, 0) });
  const m = collide(A.shape, B.shape);
  ok(m, 'hay colisión rect-rect');
  ok(m && m.normal.x > 0.99, `normal A→B (1,0) (got ${m && m.normal.x})`);
  ok(m && Math.abs(m.depth - 5) < 0.1, `penetración ~5 (got ${m && m.depth})`);
  ok(m && m.contacts.length >= 1, 'al menos 1 punto de contacto');

  // Rect girado 30° apoyado sobre un rect plano (caso de clipping)
  const R = makeBody(PolygonShape.rect(20, 60), { position: new Vec2(0, 25) });
  R.angle = Math.PI / 6;
  const G = makeBody(PolygonShape.rect(200, 20), { position: new Vec2(0, 60) });
  const mg = collide(R.shape, G.shape);
  ok(mg, 'rect girado toca el suelo');

  // Separados
  const A2 = makeBody(PolygonShape.rect(20, 20), { position: new Vec2(0, 0) });
  const B2 = makeBody(PolygonShape.rect(20, 20), { position: new Vec2(40, 0) });
  ok(collide(A2.shape, B2.shape) === null, 'rect separados → null');
}

console.log('\n== 4. Simulación: caída + rebote + reposo ==');
{
  const w = new World({ gravity: new Vec2(0, 1400) });
  const ground = makeBody(PolygonShape.rect(600, 40), { position: new Vec2(300, 640), isStatic: true, friction: 0.6, restitution: 0.02 });
  w.addBody(ground);
  const ball = makeBody(new CircleShape(30), { position: new Vec2(300, 300), restitution: 0.35, friction: 0.3, mass: 3 });
  w.addBody(ball);

  let impacts = 0;
  let firstContactY = null;
  let minYAfterContact = Infinity;
  w.onImpact = (a, b, speed) => {
    if (a === ball || b === ball) {
      impacts++;
      if (firstContactY === null) firstContactY = ball.position.y;
    }
  };

  for (let i = 0; i < 60 * 8; i++) {
    w.fixedStep();
    if (firstContactY !== null) minYAfterContact = Math.min(minYAfterContact, ball.position.y);
  }
  ok(!Number.isNaN(ball.position.x) && !Number.isNaN(ball.position.y), 'sin NaN');
  ok(firstContactY !== null && minYAfterContact < firstContactY - 15,
    `rebotó tras el primer contacto (pico ${minYAfterContact.toFixed(1)} vs contacto ${firstContactY && firstContactY.toFixed(1)})`);
  ok(Math.abs(ball.position.y - 590) < 1.5, `reposa sobre el suelo y=590 (got ${ball.position.y.toFixed(2)})`);
  ok(ball.sleeping, 'duerme al reposar');
  ok(impacts > 0, `impactos reportados (${impacts})`);
  ok(Math.abs(ball.velocity.length()) < 1, `velocidad ~0 (got ${ball.velocity.length().toFixed(3)})`);
}

console.log('\n== 5. Simulación: pila de 3 bloques estable ==');
{
  const w = new World({ gravity: new Vec2(0, 1400) });
  const ground = makeBody(PolygonShape.rect(800, 40), { position: new Vec2(400, 640), isStatic: true, friction: 0.6 });
  w.addBody(ground);
  const ys = [600, 560, 520];
  const blocks = ys.map((y, i) => {
    const b = makeBody(PolygonShape.rect(60, 40), {
      position: new Vec2(400, y),
      friction: 0.5,
      restitution: 0.05,
      mass: 2.5,
      linearDamping: 0.05,
      angularDamping: 0.1
    });
    w.addBody(b);
    return b;
  });

  for (let i = 0; i < 60 * 10; i++) w.fixedStep();

  blocks.forEach((b, i) => {
    ok(!Number.isNaN(b.position.x) && !Number.isNaN(b.position.y), `bloque ${i} sin NaN`);
    ok(Math.abs(b.position.y - ys[i]) < 5, `bloque ${i} mantiene altura y≈${ys[i]} (got ${b.position.y.toFixed(2)})`);
    ok(Math.abs(b.angle) < 0.08, `bloque ${i} casi nivelado (got ${b.angle.toFixed(4)})`);
  });
  ok(blocks.every((b) => b.sleeping), 'todos los bloques duermen');
}

console.log('\n== 6. Simulación: lanzamiento balístico ==');
{
  const w = new World({ gravity: new Vec2(0, 1400) });
  const ground = makeBody(PolygonShape.rect(3000, 40), { position: new Vec2(1200, 640), isStatic: true, friction: 0.6 });
  w.addBody(ground);
  const frog = makeBody(new CircleShape(30), { position: new Vec2(220, 524), restitution: 0.35, friction: 0.3, mass: 3 });
  w.addBody(frog);
  frog.velocity.set(950, -620);
  frog.angularVelocity = -15;

  let maxX = 0;
  let maxY = 0;
  let impactSpeed = 0;
  w.onImpact = (a, b, speed) => { if (a === frog || b === frog) impactSpeed = Math.max(impactSpeed, speed); };

  for (let i = 0; i < 60 * 4; i++) {
    w.fixedStep();
    maxX = Math.max(maxX, frog.position.x);
    maxY = Math.min(maxY, frog.position.y);
  }
  ok(maxX > 700, `avanza en x (max ${maxX.toFixed(0)})`);
  ok(maxY < 500, `sube en el aire (min y ${maxY.toFixed(0)})`);
  ok(frog.position.y < 700 && frog.position.y > 400, `acaba en el rango del mundo (y=${frog.position.y.toFixed(0)})`);
  ok(impactSpeed > 500, `impacto fuerte detectado (${impactSpeed.toFixed(0)} px/s)`);
  ok(!Number.isNaN(frog.angle), 'ángulo finito');
}

console.log('\n== 7. Simulación: torre con coco encima (nivel 3) ==');
{
  const w = new World({ gravity: new Vec2(0, 1400) });
  const ground = makeBody(PolygonShape.rect(3000, 40), { position: new Vec2(1500, 640), isStatic: true, friction: 0.6 });
  w.addBody(ground);
  const ys = [590, 530, 470];
  const tower = ys.map((y) => {
    const b = makeBody(PolygonShape.rect(60, 60), { position: new Vec2(1150, y), friction: 0.45, mass: 2.2, restitution: 0.1 });
    w.addBody(b);
    return b;
  });
  const coco = makeBody(new CircleShape(26), { position: new Vec2(1150, 414), friction: 0.7, mass: 5, restitution: 0.3 });
  w.addBody(coco);

  for (let i = 0; i < 60 * 8; i++) w.fixedStep();

  ok(tower.every((b) => !Number.isNaN(b.position.y) && b.position.y > 400 && b.position.y < 700), 'torre en el mundo (sin NaN ni fugas)');
  ok(tower.every((b) => Math.abs(b.angle) < 0.25), 'torre sin vuelcos excesivos');
  ok(Math.abs(tower[0].position.y - 590) < 12, `base estable y≈590 (got ${tower[0].position.y.toFixed(1)})`);
  console.log('  (alturas finales: ' + tower.map((b) => b.position.y.toFixed(0)).join(', ') + '; coco y=' + coco.position.y.toFixed(0) + ')');
}

console.log('\n' + (failures === 0 ? '✅ Física OK.' : `❌ ${failures} fallo(s).`));
process.exit(failures === 0 ? 0 : 1);
