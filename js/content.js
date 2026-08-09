/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/content.js
 * ------------------------------------------------------------
 * CONTENIDO / TEXTOS del juego, extraídos de docs/cornisland.md.
 * Toda la redacción vive aquí (una sola fuente), para que los
 * overlays, el modal de información y la curiosidad por nivel
 * lean el mismo texto sin duplicarlo en la UI.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});

  const CONTENT = {
    /* ---------- Pantalla de inicio ---------- */
    menu: {
      subtitle: 'Una aventura en Corn Island',
      tagline: 'Inspirado en la naturaleza del Caribe nicaragüense.',
      play: '▶ Jugar',
      infoButton: 'ℹ️ Sobre el juego',
      hint: 'Arrastra a Nati en la resortera y suéltala 🐸',
      footer: 'Desarrollado por'
    },

    /* ---------- Introducción ---------- */
    intro: {
      title: '🌴 Bienvenido a Corn Island',
      text: [
        'Bienvenido a una pequeña aventura inspirada en uno de los lugares más hermosos del Caribe nicaragüense.',
        'Explora playas, arrecifes, manglares y ayuda a nuestro pequeño héroe durante su recorrido por la isla.'
      ]
    },

    /* ---------- Protagonista ---------- */
    hero: {
      title: '🐸 ¿Quién es nuestro protagonista?',
      name: 'Conoce a Nati',
      text: [
        'Nati es una pequeña rana leopardo muy curiosa.',
        'Le encanta explorar lagunas, humedales y rincones naturales de Corn Island mientras ayuda a proteger a los pequeños habitantes de la isla.',
        'Aunque esta historia es ficticia, muchas ranas reales desempeñan un papel muy importante en el equilibrio de la naturaleza.'
      ]
    },

    /* ---------- Historia del juego ---------- */
    story: {
      title: '🎯 Historia del juego',
      text: [
        'Una mañana, Nati descubre que varios pequeños habitantes de Corn Island han quedado atrapados entre viejas estructuras abandonadas y obstáculos que impiden su paso.',
        'Con ayuda de su resortera y mucha valentía, deberá liberar el camino mientras recorre distintos paisajes inspirados en la isla.',
        'Cada nivel representa un nuevo rincón de Corn Island y una oportunidad para conocer un poco más sobre su naturaleza.'
      ]
    },

    /* ---------- Objetivo (❤️) ---------- */
    objective: {
      title: '❤️ Objetivo',
      text: 'Que los niños y sus familias se diviertan mientras descubren un poco más sobre la naturaleza de Corn Island y comprendan que pequeñas acciones también ayudan a cuidar el lugar donde viven muchas especies.'
    },

    /* ---------- Filosofía del juego ---------- */
    philosophy: {
      title: '💡 Filosofía',
      text: [
        'Este juego no busca enseñar mediante largos textos.',
        'La idea es que el jugador descubra pequeñas curiosidades mientras avanza, de forma natural y entretenida.',
        'Cada mensaje debe poder leerse en menos de 10 segundos y aportar algo nuevo.'
      ]
    },

    /* ---------- Banco de curiosidades (Corn Island, Caribe, ranas) ----------
     * Se muestra uno distinto al iniciar cada nivel (barajado, sin repetir
     * el último visto). Se irá alimentando con más mensajes. */
    facts: [
      { title: '🌴 Descubriendo Corn Island', text: 'Corn Island es un pequeño paraíso del Caribe nicaragüense. Sus playas de arena blanca, aguas cristalinas y arrecifes de coral albergan una gran diversidad de vida.' },
      { title: '🐸 Las ranas son importantes', text: 'Las ranas ayudan a mantener el equilibrio natural alimentándose de insectos. Además, su presencia suele indicar que el agua y el ambiente están saludables.' },
      { title: '🌊 Los arrecifes', text: 'Los arrecifes de coral ayudan a proteger las costas del oleaje y sirven de hogar para cientos de especies marinas. Son uno de los ecosistemas más valiosos del Caribe.' },
      { title: '🌿 Los humedales', text: 'Los humedales son fundamentales para muchas especies. Las ranas necesitan agua limpia para reproducirse y sobrevivir.' },
      { title: '🌴 Los manglares', text: 'Los manglares funcionan como viveros naturales para peces, aves y muchas otras especies. También ayudan a proteger las costas durante tormentas.' },
      { title: '🦀 Todos forman parte', text: 'Cangrejos, aves, peces, ranas y plantas forman parte del mismo ecosistema. Cada especie cumple una función importante.' },
      { title: '🏝️ Little Corn Island', text: 'Corn Island tiene una hermana pequeña: Little Corn Island. Sin carreteras, se recorre a pie, en bicicleta o en lancha, rodeada de playas y arrecifes.' },
      { title: '🐠 Un mar de vida', text: 'Las aguas de Corn Island son famosas por su claridad y por albergar tortugas, rayas, delfines y cientos de peces de colores entre los corales.' },
      { title: '🤿 Buceo y snorkel', text: 'Corn Island es uno de los mejores destinos del Caribe centroamericano para bucear. Sus arrecifes dejan ver un mundo submarino lleno de vida.' },
      { title: '🦎 ¿Por qué leopardo?', text: 'La rana leopardo recibe su nombre por las manchas oscuras que decoran su piel, muy parecidas a las del felino. ¡Cada patrón es único!' },
      { title: '🐸 Nati en el agua', text: 'Las ranas leopardo viven cerca del agua y se lanzan en grandes saltos al sentirse en peligro. Por eso a Nati le encanta saltar tan lejos.' },
      { title: '☕ El corazón del Caribe', text: 'Nicaragua tiene una larga costa caribeña con islas, arrecifes y selvas tropicales. Corn Island es una de sus joyas más preciadas.' },
      { title: '🌅 Una isla tranquila', text: 'En Corn Island la vida es tranquila: pesca, paseos en lancha, hamacas y atardeceres sobre el mar Caribe. Un lugar perfecto para la naturaleza.' },
      { title: '🌴 Cocoteros por doquier', text: 'Corn Island también es conocida como la isla de los cocos: miles de palmeras cubren sus playas y los cocos forman parte de la vida diaria.' }
    ],

    /* ---------- Mensajes de victoria ---------- */
    victory: {
      title: '¡Excelente trabajo!',
      line: 'Nati ha logrado liberar otro rincón de Corn Island.',
      perfectTitle: '¡Increíble!',
      perfectLine: 'Has protegido cada rincón de este nivel.'
    },

    /* ---------- Pantalla de derrota ---------- */
    defeat: {
      title: '¡Oh no!',
      line: 'Todavía quedan algunos amigos esperando ayuda.',
      tip: 'Inténtalo nuevamente: Nati nunca se rinde.'
    },

    /* ---------- Final del juego ---------- */
    final: {
      title: '💚 Gracias por jugar',
      text: [
        'Has acompañado a Nati en una aventura inspirada en la belleza natural de Corn Island.',
        'Aunque esta historia es ficticia, muchas especies reales dependen de ecosistemas saludables para sobrevivir.',
        'Esperamos que esta pequeña aventura también inspire a conocer, valorar y proteger la naturaleza.'
      ],
      natureHeading: '🌎 Cuidemos la naturaleza',
      natureText: [
        'Cada árbol, cada manglar, cada arrecife y cada humedal forman parte de un mismo hogar.',
        'Cuando protegemos la naturaleza, también protegemos nuestro futuro.',
        'No tirar basura. Reducir el uso de plásticos. Respetar la flora y la fauna.',
        'Cada pequeño gesto puede marcar una gran diferencia.'
      ],
      frogsHeading: '🐸 Sobre las ranas',
      frogsText: [
        'Las ranas son excelentes indicadores de la salud de un ecosistema.',
        'Cuando ellas prosperan, normalmente significa que el agua y el ambiente también están sanos.'
      ],
      islandHeading: '🌴 Sobre Corn Island',
      islandText: [
        'Corn Island está ubicada en el mar Caribe de Nicaragua.',
        'Es conocida por sus playas, arrecifes de coral, aguas cristalinas y una gran diversidad de vida silvestre.',
        'Es un lugar especial que merece ser conocido y protegido.'
      ]
    }
  };

  NS.Content = CONTENT;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);