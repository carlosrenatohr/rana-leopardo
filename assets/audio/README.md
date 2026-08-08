# Audio — Rana Leopardo

El juego **no necesita archivos de audio**: todos los sonidos y la música
ambiental se **sintetizan en tiempo real** con la WebAudio API
(`js/audio.js`). Esto garantiza que el juego funcione abriendo
`index.html` directamente, sin descargas ni dependencias.

## Eventos disponibles

| Evento            | Descripción                                  |
|-------------------|----------------------------------------------|
| `click`           | Toque en botones de UI                        |
| `stretch`         | Estiramiento de la goma de la resortera       |
| `launch`          | Lanzamiento de la rana ("boing")              |
| `impact-wood`     | Golpe contra madera / bambú                   |
| `impact-glass`    | Golpe contra cristal                          |
| `impact-stone`    | Golpe contra piedra                           |
| `impact-frog`     | La rana golpea el suelo                       |
| `break-wood`      | Rotura de madera / bambú                      |
| `break-glass`     | Rotura de cristal                             |
| `break-stone`     | Rotura de piedra                              |
| `pop`             | Enemigo eliminado (cangrejo, globo, coco)     |
| `splash`          | La rana cae al agua                           |
| `star`            | Estrella conseguida                           |
| `win`             | Jingle de victoria                            |
| `lose`            | Jingle de derrota                             |

## Cómo usar tus propios sonidos (opcional)

1. Coloca archivos `.wav`/`.ogg` en esta carpeta, p. ej. `launch.wav`.
2. En `js/audio.js`, dentro del constructor:

   ```js
   // this.loadSample('launch', 'assets/audio/launch.wav');
   ```

3. Para reproducir un sample en lugar del sintetizado, cambia el caso
   correspondiente en `play()`:

   ```js
   case 'launch': {
     const buf = this._sampleBank.get('launch');
     if (buf) { /* crear AudioBufferSourceNode con buf */ }
     else { /* síntesis actual */ }
     break;
   }
   ```

El sistema está preparado para ambas vías; la síntesis es la que
mantiene el juego 100% autocontenido.
