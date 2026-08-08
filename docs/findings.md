# 🔍 Hallazgos — bugs reales encontrados y resueltos

Bitácora de los problemas concretos que aparecieron durante el desarrollo.
Cada entrada explica el síntoma, la causa raíz y el arreglo. Todo quedó
cubierto por tests en `tools/`.

## 1. Vec2 inmutable → la trayectoria apuntaba hacia atrás

- **Síntoma**: el preview de la trayectoria mostraba la rana volando hacia el
  lado contrario al estirado.
- **Causa**: `Vec2` es inmutable por convención (`add/sub/scale` devuelven
  vectores nuevos). `this.pull.copy(anchor).sub(...)` mutaba `pull` al ancla y
  **descartaba** el resultado de la resta.
- **Arreglo**: usar `set()`/`copy()` (que mutan) y encadenar solo con las
  variantes que devuelven nuevo. Se auditaron todos los módulos: no quedan
  encadenamientos mutantes.

## 2. El solver de impulsos explotaba las pilas

- **Síntoma**: pilas de 3 bloques detonaban con velocidades de 9e9 px/s.
- **Causa 1**: el denominador del impulso usaba **masa inversa donde debía ir
  la inercia inversa** (término angular 400× mayor) → el impulso casi se
  anulaba y el solver realimentaba energía.
- **Causa 2**: `Body.updateMass()` recalculaba la masa desde la densidad,
  pisando las masas explícitas por entidad (un bloque 60×40 pesaba 2400).
- **Arreglo**: respetar masas explícitas, inercia desde el AABB del polígono y
  corregir los denominadores de fricción normal/angular.

## 3. Sin warm starting, las pilas colapsaban

- **Síntoma**: dos bloques estables, tres se desmoronaban.
- **Causa**: los impulsos de contacto no se persistían entre frames; el motor
  re-resolvía desde cero y la pila se "asentaba" mal.
- **Arreglo**: warm starting de los impulsos **normales** con guarda de
  similitud (el de fricción inyectaba kicks laterales con tangentes obsoletas).
- **Extra**: manifolds de 2 puntos generaban torque ruidoso en pilas → se usa
  un punto de contacto en el punto medio de la cara (autocorregible al inclinarse).

## 4. Los cuerpos no dormían (o se re-despertaban en bucle)

- **Síntoma**: tras posarse, la rana era "lanzada" por un ciclo de warm-start
  que crecía cada segundo; y los bloques dormían pero se re-despertaban.
- **Causa**: un cuerpo estático (el suelo) mantenía despiertos a los dinámicos
  en reposo, y la regla de despertar no distinguía impacto real de contacto en
  reposo.
- **Arreglo**: los estáticos no despiertan a dinámicos quietos; solo se despierta
  cuando el cuerpo tocante se mueve de verdad (umbral de velocidad).

## 5. Impactos no detectados: se medía la velocidad después del solver

- **Síntoma**: la rana rebotaba pero no sonaban/detectaban los impactos.
- **Causa**: el callback de impacto leía la velocidad relativa **tras** resolver
  el impulso (ya invertida).
- **Arreglo**: medir la velocidad de cierre **pre-solve** en el frame del impacto.

## 6. SAT y círculo-polígono: convenciones invertidas

- **Síntoma**: tests de colisión fallaban con normales en dirección opuesta y
  contactos en la cara equivocada.
- **Causa**: `findMaxSeparation` usaba min/max invertidos y la selección de
  arista incidente usaba normales interiores en vez de exteriores.
- **Arreglo**: corregir las convenciones; añadir el caso de esquina para
  círculo-polígono (punto más cercano sobre todas las aristas).

## 7. La rana rodaba eternamente

- **Síntoma**: tras aterrizar, la rana daba vueltas sin parar (nunca "dormía").
- **Causa**: el spin de lanzamiento (−24 rad/s) superaba el umbral de sleep y el
  damping angular era bajo.
- **Arreglo**: más damping angular y un umbral de "posado" que también cuenta
  velocidad lineal baja sostenida.

## 8. CSS: `[hidden]` anulado → "ventana de victoria" al entrar

- **Síntoma**: al abrir el juego aparecía la pantalla de victoria con 0 puntos
  y sin poder jugar.
- **Causa**: `.overlay/.menu/.hud` definen `display: flex`, que **gana** al
  `display: none` del atributo `hidden` (regla del navegador). El overlay se
  renderizaba siempre.
- **Arreglo**: regla global `[hidden] { display: none !important; }` + test de
  regresión en el smoke test (los tests con DOM simulado no detectan CSS).

## 9. TypeError al pulsar "Jugar"

- **Síntoma**: `Uncaught TypeError: this.engine.ui.startLevel is not a function`.
- **Causa**: el botón llamaba a `engine.ui.startLevel(1)`, pero `startLevel`
  vive en el **Engine**, no en la UI.
- **Arreglo**: `this.engine.startLevel(1)` + test que hace clic real en el botón.

## 10. La cámara "volvía" a la torre al reiniciar

- **Síntoma**: al reiniciar o perder, la cámara se deslizaba de nuevo hacia la
  torre en vez de quedarse en la resortera.
- **Causa**: `_setupLevel` ponía `camera.x = 0` pero no reseteaba
  `targetX/targetY`, y `update()` interpola hacia esos objetivos cada frame.
- **Arreglo**: `Camera.reset()` (limpia x, y, targets, follow, zoom, shake)
  usado en menú, reinicio y cambio de nivel.

## 11. El HUD contaba una rana de más

- **Síntoma**: al iniciar el nivel se mostraban 4 ranitas con solo 3 disponibles.
- **Causa**: `frogsLeft = frogQueue + (active?1:0) + (held?1:0)` — la rana
  sujetada ya está en `frogQueue` (se descuenta al lanzar).
- **Arreglo**: `frogsLeft = frogQueue + (activeFrog ? 1 : 0)`.

## 12. La cámara no seguía a la rana en vertical

- **Síntoma**: en orientación vertical la cámara no podía desplazarse más allá
  de x≈298, perdiendo de vista la rana en vuelo.
- **Causa**: el clamp/follow usaba el ancho de **diseño** (1280) en vez del
  **viewport real** (una ventana vertical muestra ~640 px de mundo).
- **Arreglo**: `Camera` guarda `visibleW/visibleH` reales (resize) y los usa en
  update/center/isVisible; zoom-out a 640 px de mundo en vertical con el fondo
  de arena extendido hasta 3200 px.

## 13. El ZIP incluía `.git/`

- **Síntoma**: el paquete entregable duplicaba el repo (64 archivos).
- **Causa**: `shutil.make_archive` empaquetaba el directorio completo.
- **Arreglo**: generar el ZIP con `zipfile` recorriendo el árbol y excluyendo
  `.git`; `.gitignore` excluye `*.zip` del repo.
