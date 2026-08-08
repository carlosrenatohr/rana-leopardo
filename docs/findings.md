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

## 14. Crash al morir un pez globo: `particles.bubble is not a function`

- **Síntoma**: al destruir un pez globo (nivel 2 en adelante) el juego
  petaba en `Engine._entityDied` con `TypeError` en bucle (cada frame
  lanzaba de nuevo la excepción desde `requestAnimationFrame`).
- **Causa**: el motor llamaba `this.particles.bubble(x, y, 1)`, pero
  `Particles` solo tenía el tipo `BUBBLE` y el método `splash()`; no
  existía un emisor `bubble()` público.
- **Arreglo**: añadir `Particles.bubble(x, y, power)` (burbujas ascendentes
  con gravedad negativa) + regresión en el smoke test (mata un pez globo
  real en el nivel 2 y verifica que no lance y que emita burbujas).

## 15. Crash al dibujar cristal: `_drawHitFlash is not a function`

- **Síntoma**: al entrar a cualquier nivel con bloques de cristal, bambú o
  piedra, el render petaba con `TypeError` (la pantalla quedaba negra).
- **Causa**: `_drawHitFlash` estaba definido **solo en `WoodBlock`**, pero
  `CrystalBlock`, `BambooBlock` y `StoneBlock` también lo llamaban.
- **Arreglo**: subir `_drawHitFlash` a la clase base `Block` (todos los
  bloques la heredan) + regresión en el smoke test que renderiza el nivel 2
  entero y verifica que no lance.

## 16. La trayectoria de apuntado era invisible

- **Síntoma**: al estirar la resortera no se veía por dónde iba a volar la
  rana; solo se oía el impacto al chocar.
- **Causa**: los puntos del preview tenían radio 1–4 px con alfa decreciente
  y sin contraste sobre arena/mar → imperceptibles en pantalla pequeña.
- **Arreglo**: puntos grandes con borde oscuro (contraste sobre cualquier
  fondo), relleno blanco/amarillo pastel y una **rana fantasma** en el punto
  de aterrizaje previsto. Además se añadió una **estela de vuelo** (posición
  reciente de la rana cada ~0.03 s) para seguir el disparo en el aire.

## 17. La ★★★ era matemáticamente imposible

- **Síntoma**: "parece imposible lograr 3 estrellas" — y lo era: los
  umbrales se fijaron cuando había 2–3 ranas y sin recalcular tras subir a 4
  y añadir el bonus de ranas sin usar.
- **Causa**: en casi todos los niveles el umbral de 3★ superaba el puntaje
  máximo alcanzable (destrucción total + 500 de victoria + bonus de ranas).
- **Arreglo**: recalibrar `stars` en los 6 niveles (JSON + espejos embebidos,
  sincronía verificada por `tools/check-levels.js`) a valores alcanzables con
  buen juego: p. ej. nivel 1 [900, 1400, 2000] en vez de [1200, 1800, 2400].

## 18. El best score no persistía

- **Síntoma**: el progreso guardaba estrellas y niveles desbloqueados, pero
  no el puntaje récord de cada nivel.
- **Causa**: `progress.best` solo almacenaba estrellas por nivel.
- **Arreglo**: `progress.scores[nivel]` con el mejor puntaje (solo sube),
  mostrado en el HUD (chip 🏆) y en la pantalla de victoria ("Récord del
  nivel" / "¡Nuevo récord!"). Persistido en `localStorage` bajo la misma
  clave `rana-progress`.

## 19. Los commits tenían el email incorrecto

- **Síntoma**: todos los commits llevaban `carlos@growthoptix.com` en vez
  del email real.
- **Causa**: `git config user.email` quedó con un valor viejo al inicializar
  el repo.
- **Arreglo**: `git filter-branch --env-filter` reescribió autor y committer
  de los 24 commits a `carlosrenatohr@gmail.com` (sin remoto, sin colisiones);
  se purgaron `refs/original` y el reflog.
