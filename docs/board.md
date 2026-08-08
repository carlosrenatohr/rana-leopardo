# 📋 Tablero — backlog, tecnologías y estrategias de arte

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| **HTML5 + CSS3** | Esqueleto, HUD/menús/overlays (DOM), tema pastel responsive |
| **JavaScript ES2023** | Todo el juego (clases, `?.`, `??`, template literals, etc.) |
| **Canvas 2D API** | Render del mundo: escenario, entidades, partículas, iluminación |
| **WebAudio API** | Sonidos y música ambiental **sintetizados** (sin archivos) |
| **Pointer Events** | Ratón + táctil unificados (con `touch-action: none`) |
| **requestAnimationFrame** | Bucle con timestep físico fijo (1/60 s) |
| **localStorage** | Progreso (niveles desbloqueados y mejores estrellas) |
| **Node.js** (solo dev) | Tests de validación headless (`tools/`) |

**Cero dependencias, cero CDN.** Todo es dibujo vectorial/procedural.

## Pendientes (por prioridad)

### Alta
- [ ] **Equilibrar umbrales de estrellas** con las 4 ranas actuales (el bonus
      por ranas sin usar subió a 1000; la ★★★ del nivel 1 ≈ juego perfecto).
- [ ] **Mostrar cangris restantes en el HUD** durante la partida (hoy solo
      salen en la pantalla de derrota).
- [ ] **Nivel 7**: escenario nuevo (arrecife/trampa), 3★ más exigente.

### Media
- [ ] **Power-ups**: rana explosiva, coco rebotador, rana de bambú (atravesar).
- [ ] **Tabla de récords local** (top 5 por nivel en `localStorage`).
- [ ] **Paleta y decoraciones por tema** ya soportadas por nivel (`palette` +
      `decorations`) — explotarlas más en niveles futuros.
- [ ] **Variedad de música ambiental** (tempo/acordes según el nivel).
- [ ] **PWA**: `manifest.json` + service worker offline (sin librerías).

### Baja / pulido
- [ ] **Object pooling** de partículas (hoy se crean y destruyen por frame).
- [ ] **Accesibilidad**: `prefers-reduced-motion`, contraste AA, aria-labels
      completos en botones.
- [ ] **Rebote de cámara** al volver a la resortera (ahora es instantáneo).
- [ ] **Editor de niveles** en el navegador (JSON a partir de clics).
- [ ] Traducción EN/ES del juego.

## Estrategias para darle color y vida

### Paleta pastel Caribe
- Gradientes suaves por capas: cielo rosa→azul, mar celeste→turquesa profundo,
  arena crema→dorada. Colores desaturados, sin negro puro (bordes en tonos
  oscuros de la propia base vía `Color.shade`).
- Cada nivel puede definir su paleta (`palette` en el JSON) sin tocar código.

### Todo procedural (sin imágenes)
- Palmeras generadas por código (tronco curvo con anillos, 7 frondas con
  hojuelas, cocos aleatorios), nubes de 4 lóbulos, flores de 5 pétalos, rocas
  con sombra interna, motas de arena con semilla determinista por nivel.

### Movimiento y animación
- **Mar**: 3 capas de olas sinusoidales con velocidad/fase distintas + línea de
  espuma de marea que respira.
- **Viento**: palmeras oscilan (sway) con fases aleatorias; nubes derivan y se
  reciclan; flores se mecen.
- **Rana**: parpadea, respira (escala sutil), gira en el aire, rebota, mira
  hacia donde vuela.
- **Enemigos**: pinzas de cangrejo que se abren/cierran, pez globo que se
  infla cuando la rana se acerca, coco que rueda.

### Partículas
- Polvo, astillas de madera, fragmentos de cristal (translúcidos), chispas de
  piedra, burbujas, confeti, corazones de rana sobrante y popups de puntos que
  flotan y se desvanecen.

### Iluminación
- **Sombras suaves** proyectadas bajo los cuerpos según su altura, **viñeta**
  suave, **destellos** sobre el agua y sol con pulso de brillo. Vibración de
  cámara (shake) en impactos fuertes.

### Audio que acompaña
- Golpes por material (madera/cristal/piedra), roturas, splash, disparo,
  victoria/derrota y **música ambiental generativa** (acordes suaves + olas).
  Se desbloquea en el primer gesto y tiene botones de silencio.

### Micro-interacciones de UI
- Estrellas con animación *pop*, tarjetas de nivel con hover/scale, botones
  con elevación, toast no intrusivo y aviso de rotación no bloqueante.
