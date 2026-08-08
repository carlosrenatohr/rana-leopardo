#!/usr/bin/env node
/* ============================================================
 * tools/check-levels.js
 * ------------------------------------------------------------
 * Validación de niveles:
 *   1. Cada levels/levelN.json es JSON válido.
 *   2. Las copias espejo embebidas en js/level-loader.js
 *      coinciden EXACTAMENTE con los JSON canónicos.
 *   3. Las entidades tienen los campos necesarios.
 *
 * Uso: node tools/check-levels.js
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Carga el loader (establece globalThis.FrogGame) — en orden de dependencias
require(path.join(ROOT, 'js', 'utils.js'));
const { LevelLoader } = require(path.join(ROOT, 'js', 'level-loader.js'));
const EMBEDDED = LevelLoader.EMBEDDED;

const TYPES = new Set([
  'wood-block', 'crystal-block', 'bamboo-block', 'stone-block',
  'crab', 'pufferfish', 'coco', 'frog'
]);

let failures = 0;

function fail(msg) {
  failures++;
  console.error('  ✗ ' + msg);
}

console.log('Verificando niveles...\n');

for (let i = 1; i <= EMBEDDED.length; i++) {
  const file = path.join(ROOT, 'levels', `level${i}.json`);
  console.log(`Nivel ${i}: ${path.relative(ROOT, file)}`);

  // 1) JSON válido
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`JSON inválido: ${e.message}`);
    continue;
  }

  // Campos requeridos
  for (const field of ['name', 'width', 'frogs', 'slingshot', 'stars', 'objects']) {
    if (!(field in data)) fail(`falta el campo "${field}"`);
  }
  if (!Array.isArray(data.objects)) fail('"objects" debe ser un array');
  if (!Array.isArray(data.stars) || data.stars.length !== 3) fail('"stars" debe tener 3 umbrales');

  // Entidades
  for (const obj of data.objects || []) {
    if (!TYPES.has(obj.type)) fail(`tipo de objeto desconocido: "${obj.type}"`);
    if (typeof obj.x !== 'number' || typeof obj.y !== 'number') fail(`objeto sin coordenadas: ${JSON.stringify(obj)}`);
    if (obj.type.includes('block') && (typeof obj.w !== 'number' || typeof obj.h !== 'number')) {
      fail(`bloque sin dimensiones: ${JSON.stringify(obj)}`);
    }
    // Dentro del mundo
    if (obj.x < 0 || obj.x > data.width) fail(`objeto ${obj.type} fuera del mundo (x=${obj.x})`);
  }

  // 2) Espejo embebido sincronizado
  const mirror = EMBEDDED[i - 1];
  const a = JSON.stringify(data, null, 0);
  const b = JSON.stringify(mirror, null, 0);
  if (a !== b) {
    fail('la copia embebida en js/level-loader.js NO coincide con el JSON (¡edita ambos!)');
  } else {
    console.log('  ✓ JSON válido, espejo embebido sincronizado (' + data.objects.length + ' objetos)');
  }
}

console.log('\n' + (failures === 0 ? '✅ Todos los niveles OK.' : `❌ ${failures} error(es) detectado(s).`));
process.exit(failures === 0 ? 0 : 1);
