# 🐸 Rana Leopardo — Aventura en Corn Island

Un juego completo inspirado en **Angry Birds**, desarrollado **desde cero**
con **HTML5 + CSS3 + JavaScript (ES2023) + Canvas API**.

**Sin frameworks. Sin dependencias. Sin CDN. Sin imágenes externas.**
Todo se dibuja con vectores y Canvas. Funciona abriendo `index.html`.

---

## ▶️ Cómo jugar

1. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox, Safari).
   - También puedes servir la carpeta: `python -m http.server` y visitar `http://localhost:8000`.
2. En el menú, pulsa **Jugar** o elige un nivel.
3. **Arrastra** a la rana hacia atrás en la resortera para apuntar
   (verás la trayectoria prevista), **suéltala** para lanzarla.
4. Destruye los bloques y elimina a **TODOS los cangris** — así se
   llaman cariñosamente los enemigos (🦀 cangrejos, 🐡 peces globo y
   🥥 cocos).
5. **Se gana eliminando a todos los cangris.** El puntaje no decide la
   victoria: solo determina las **1-3 estrellas** según los umbrales del
   nivel (se ven en el HUD, p.ej. `★ 1200 ★★ 1800 ★★★ 2400`).
   Si te quedas sin ranas y quedan cangris… ¡a reintentar! (la pantalla
   de derrota indica cuántos quedaban en pie).

### Controles

| Acción                    | Táctil / Ratón          | Teclado   |
|---------------------------|-------------------------|-----------|
| Apuntar / lanzar          | Arrastrar y soltar      | —         |
| Reiniciar nivel           | Botón ↻                 | `R`       |
| Menú principal            | Botón                   | `M`       |
| Cancelar tiro             | Suelta sin estirar      | `Esc`     |

---

## 📁 Estructura del proyecto

```
rana-leopardo/
├── index.html              ← ¡Ábrelo y juega!
├── style.css               ← Tema pastel Caribe (HUD, menús, overlays)
├── README.md
├── assets/
│   ├── audio/              ← Arquitectura de audio (síntesis WebAudio)
│   └── svg/                ← Vectores SVG (rana, resortera)
├── levels/
│   ├── level1.json … level6.json   ← Niveles en JSON (fuente canónica)
└── js/
    ├── utils.js            ← Vec2, helpers matemáticos, colores, eventos
    ├── collision.js        ← Fase estrecha: AABB, SAT, manifolds por clipping
    ├── physics.js          ← Motor físico: cuerpos, broad phase, solver de impulsos
    ├── camera.js           ← Cámara 2D (follow, lookahead, shake, zoom)
    ├── particles.js        ← Partículas (polvo, astillas, cristal, burbujas…)
    ├── lighting.js         ← Iluminación (sol, viñeta, sombras, destellos)
    ├── scene.js            ← Escenario (mar, olas, arena, palmeras, nubes…)
    ├── entities.js         ← Entidades (rana, bloques, enemigos + fábrica)
    ├── renderer.js         ← Pipeline de render (cámara + DPR)
    ├── audio.js            ← Síntesis de sonidos y música ambiental
    ├── level-loader.js     ← Carga de levels/*.json (con fallback file://)
    ├── input.js            ← Entrada unificada (ratón/táctil/teclado)
    ├── ui.js               ← HUD, menús y overlays (DOM)
    ├── engine.js           ← Motor del juego (loop, estados, puntuación)
    └── game.js             ← Bootstrap
```

## 🧠 Arquitectura

- **Sin variables globales**: cada archivo es un IIFE que publica en el
  namespace único `window.FrogGame` (compatible también con Node para tests).
- **Separación de responsabilidades**: física, render, cámara, partículas,
  iluminación, escenario, entidades, UI y audio están en módulos propios.
- **Bucle determinista**: `requestAnimationFrame` + acumulador con
  timestep físico fijo de `1/60 s`.
- **Escalable**: añadir un nivel nuevo es solo crear `levels/level7.json`;
  añadir una entidad es crear una clase y registrarla en `EntityFactory`.

## ⚙️ Motor físico propio (`js/physics.js` + `js/collision.js`)

Implementado desde cero, sin librerías:

| Sistema                    | Detalle                                                        |
|----------------------------|----------------------------------------------------------------|
| Cuerpos rígidos            | `Body`: masa, inercia, centro de masa (`comOffset`), fricción, restitución |
| Broad phase                | Rejilla espacial hash (AABB)                                   |
| Narrow phase               | Círculo-círculo, círculo-polígono, polígono-polígono con **SAT** |
| Manifolds                  | 1-2 puntos de contacto por clipping de cara incidente           |
| Solver                     | Impulsos normales + **angulares** (torque) con iteraciones      |
| Fricción                   | Impulso tangencial con tope de Coulomb                          |
| Restitución                | Solo en impactos fuertes (evita rebotes infinitos)              |
| Corrección posicional      | Baumgarte con slop                                              |
| Sleeping                   | Cuerpos en reposo dejan de simularse (rendimiento + estabilidad) |
| Integración                | Symplectic Euler (semi-implícita)                               |
| Gravedad / amortiguación   | Por cuerpo (damping lineal y angular)                           |

## 🗺️ Sistema de niveles

Los niveles viven en `levels/*.json`. El motor los **lee automáticamente**
con `fetch`; si abres el juego con `file://` (donde los navegadores
bloquean `fetch`), se usa una **copia espejo embebida** en
`js/level-loader.js` (se mantiene sincronizada; hay un test que lo
verifica en `tools/check-levels.js`).

Formato de un nivel:

```jsonc
{
  "name": "Primera Ola",          // Nombre mostrado
  "subtitle": "Aprende a lanzar", // Subtítulo (opcional)
  "width": 2400,                  // Ancho del mundo
  "frogs": 3,                     // Ranas disponibles
  "slingshot": { "x": 220, "y": 620 },
  "stars": [1200, 1800, 2400],    // Umbrales de puntuación para 1-3 ★
  "sunX": 1050, "sunY": 120,      // Posición del sol
  "seed": 7,                      // Semilla para motas de arena
  "decorations": [                // Palmeras, flores, rocas
    { "type": "palm", "x": 880, "y": 624, "scale": 1.05 }
  ],
  "objects": [                    // Cuerpos físicos
    { "type": "wood-block", "x": 1150, "y": 595, "w": 60, "h": 50, "angle": 0 },
    { "type": "crab", "x": 1210, "y": 598 }
  ]
}
```

### Tipos de objeto

| Tipo              | Descripción                        | HP   | Puntos |
|-------------------|------------------------------------|------|--------|
| `frog`            | Protagonista (no se coloca en JSON) | —    | —      |
| `wood-block`      | Madera (se rompe fácil)            | 60   | 50     |
| `crystal-block`   | Cristal (frágil, brilla)           | 35   | 30     |
| `bamboo-block`    | Bambú (ligero y resistente)        | 90   | 40     |
| `stone-block`     | Piedra (muy resistente)            | 200  | 80     |
| `crab`            | Cangrejo enemigo                   | 100  | 500    |
| `pufferfish`      | Pez globo (se infla cerca de ti)   | 80   | 600    |
| `coco`            | Coco enemigo (rueda y aplasta)     | 140  | 450    |

**Coordenadas**: el suelo está en `y = 620` y el mundo mide `720` de alto.
Centra los círculos a `620 - radio` y los bloques a `620 - alto/2`.

## 🎨 Escenario (Corn Island)

- Cielo degradado pastel, **sol** con resplandor y **nubes** a la deriva.
- **Mar con olas animadas**, espuma de marea e isla en el horizonte.
- **Arena** con motas, franja húmeda y conchas.
- **Palmeras** que se mecen con el viento, **flores** y **rocas**.
- **Sombras** suaves bajo los cuerpos, viñeta y destellos de luz.
- Partículas: polvo, astillas, cristales, burbujas, confeti, popups de puntos.

## 📱 Cámara responsive (horizontal y vertical)

El juego funciona en **ambas orientaciones** sin romper nada:

- **Horizontal** (ancho ≥ alto): se cubre la pantalla con el diseño de
  referencia 1280×720 — el comportamiento clásico, intacto.
- **Vertical** (ancho < alto): la cámara hace *zoom-out* hasta mostrar
  ~640 px de mundo en horizontal (en vez de un recorte estrecho de
  ~330 px), y el fondo de arena se extiende en profundidad para llenar
  la pantalla. La cámara sigue a la rana con el viewport real, así que
  el vuelo se aprecia igual que en horizontal.

El aviso de rotación es **no bloqueante**: una pastilla discreta que se
auto-oculta a los pocos segundos y jamás intercepta clics/tap. Puedes
jugar en vertical aunque no gires el dispositivo.

## 🐸 Animaciones

- **Rana**: parpadea, respira, gira en el aire, rebota, mira hacia donde va.
- **Palmeras**: frondas al viento · **Mar**: olas · **Nubes**: deriva.
- **Enemigos**: cangrejos mueven pinzas, pez globo se infla, coco rueda.

## 🔊 Audio

Todo sintetizado con WebAudio (ver `assets/audio/README.md`):
golpes, roturas, splash, disparo, victoria, derrota y **música ambiental**
generativa (acordes suaves + olas). El audio se desbloquea en el primer
gesto del usuario y tiene botones de silencio/música.

## 🧪 Tests y validación

```bash
# Comprobar sintaxis de todos los módulos
node --check js/*.js

# Comprobar que los JSON de niveles son válidos
node tools/check-levels.js

# Comprobar la cámara responsive (horizontal y vertical)
node tools/test-camera.js

# Prueba del motor físico (colisiones, impulsos, pilas, reposo)
node tools/test-physics.js

# Smoke test end-to-end del juego completo (menú → nivel →
# arrastre → lanzamiento → victoria/derrota) con DOM simulado
node tools/test-game.js
```

`tools/check-levels.js` también verifica que las copias embebidas del
loader coinciden con los JSON canónicos, y `tools/test-game.js` arranca
el juego real (mismo orden de carga que `index.html`) con un entorno
navegador simulado para detectar errores en caliente.

---

Hecho con 💛 y mucha física casera. ¡Buen lanzamiento, rana!
