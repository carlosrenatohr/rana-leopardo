# 📜 Reglas del proyecto — Rana Leopardo (Corn Island Adventure)

Convenciones que todo cambio en este repo debe respetar. Léelas antes de tocar código.

## Stack (fijo, sin dependencias)

- **HTML5 + CSS3 + JavaScript ES2023 + Canvas 2D API**. WebAudio para sonido.
- **Prohibido** añadir frameworks, librerías o CDNs (Phaser, Matter.js, Pixi…).
- El juego debe funcionar abriendo `index.html` directamente (`file://`) y también
  servido estáticamente.
- Node.js solo se usa para los **tests de validación** (`tools/`), nunca en runtime.

## Commits

- **Conventional Commits**, mensaje en **inglés**: `feat:`, `fix:`, `refactor:`,
  `chore:`, `docs:`, `test:`, con scope opcional (`fix(physics): …`).
- Subject ≤ ~70 caracteres. Body de 1–2 oraciones máximo, solo si el *porqué* no
  se entiende del subject. Sin hard-wraps en el body.
- **Sin trailers**: nada de `Co-Authored-By` ni firmas.
- No commitear artefactos: el ZIP y similares están en `.gitignore`.

## Arquitectura

- Cada archivo es un **IIFE** que publica en el namespace único
  `window.FrogGame` (compatible con Node para tests). **Nada de variables globales.**
- Módulos separados por responsabilidad en `js/`: `utils`, `collision`, `physics`,
  `camera`, `particles`, `lighting`, `scene`, `entities`, `renderer`, `audio`,
  `level-loader`, `input`, `ui`, `engine`, `game`.
- Clases, código comentado en español (los commits van en inglés, el código en español).
- El orden de carga en `index.html` importa (utils → … → engine → game).

## ⚠️ Trampas conocidas (no volver a caer)

- **`Vec2` es inmutable por convención**: `add/sub/scale/normalize/rotate`
  devuelven vectores NUEVOS; solo `copy/set` mutan. Un encadenamiento tipo
  `pos.copy(a).sub(b)` muta `pos` y descarta el resultado — bug real que ya
  mordió en la trayectoria de la resortera.
- **CSS**: el atributo `hidden` es anulado por cualquier `display` propio
  (`.overlay`, `.menu`, `.hud`). La regla global `[hidden] { display: none !important; }`
  en `style.css` es **obligatoria**; no borrarla.
- **Cámara**: al reiniciar un nivel hay que usar `Camera.reset()`, que también
  limpia `targetX/targetY` (el `update()` interpola hacia ellos cada frame).
- **Niveles**: la fuente canónica es `levels/*.json`, pero `js/level-loader.js`
  mantiene un **espejo embebido** para `file://`. Cualquier cambio en un nivel
  debe replicarse en el espejo (lo verifica `tools/check-levels.js`).

## Cómo extender el juego

- **Nuevo nivel**: crear `levels/levelN.json` (y espejo en `level-loader.js`).
  El formato está documentado en el README.
- **Nueva entidad**: crear la clase en `js/entities.js` (dibujo vectorial propio)
  y registrarla en `EntityFactory`.
- **Nuevo sonido**: añadir un sintetizador en `js/audio.js` (todo se genera con
  WebAudio; no hay archivos de audio).

## Validación obligatoria antes de commitear

```bash
node --check js/*.js tools/*.js        # sintaxis
node tools/check-levels.js             # niveles JSON + espejos sincronizados
node tools/test-physics.js             # motor físico
node tools/test-camera.js              # cámara responsive
node tools/test-game.js                # smoke test end-to-end (33 checks)
```

Todo debe quedar en verde. El smoke test valida el flujo completo
(menú → nivel → disparo → victoria/derrota) con el DOM simulado.
