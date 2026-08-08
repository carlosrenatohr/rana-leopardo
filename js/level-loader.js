/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/level-loader.js
 * ------------------------------------------------------------
 * CARGA DE NIVELES.
 *
 * 1) Intenta `fetch('levels/levelN.json')` (funciona al servir
 *    el proyecto con cualquier servidor estático o Python).
 * 2) Si fetch falla (p. ej. abriendo index.html directo con
 *    file://, donde los navegadores bloquean fetch por CORS),
 *    usa una copia EMBEBIDA de los mismos niveles.
 *
 * Los niveles de `levels/*.json` son la fuente canónica; la
 * copia embebida se mantiene sincronizada (un test en
 * `tools/check-levels.js` verifica la igualdad).
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});

  /* ----------------------------------------------------------
   * Copias espejo de levels/levelN.json (fallback file://)
   * ---------------------------------------------------------- */
  const EMBEDDED = [
    {
      "name": "Primera Ola",
      "subtitle": "Aprende a lanzar a la rana",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [900, 1400, 2000],
      "sunX": 1050,
      "sunY": 120,
      "seed": 7,
      "decorations": [
        { "type": "palm", "x": 120, "y": 624, "scale": 1.0 },
        { "type": "palm", "x": 880, "y": 624, "scale": 1.05 },
        { "type": "palm", "x": 1580, "y": 624, "scale": 1.2 },
        { "type": "flower", "x": 690, "y": 662, "scale": 1.0 },
        { "type": "flower", "x": 1460, "y": 656, "scale": 1.2 },
        { "type": "rock", "x": 330, "y": 648, "scale": 1.0 },
        { "type": "rock", "x": 1920, "y": 650, "scale": 1.3 }
      ],
      "objects": [
        { "type": "wood-block", "x": 1150, "y": 595, "w": 60, "h": 50, "angle": 0 },
        { "type": "wood-block", "x": 1240, "y": 595, "w": 60, "h": 50, "angle": 0 },
        { "type": "wood-block", "x": 1195, "y": 545, "w": 140, "h": 40, "angle": 0 },
        { "type": "crab", "x": 1210, "y": 598 },
        { "type": "crab", "x": 1300, "y": 598 }
      ]
    },
    {
      "name": "Arrecife de Cristal",
      "subtitle": "El cristal es frágil... ¡aprovecha!",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [1100, 1700, 2400],
      "sunX": 900,
      "sunY": 140,
      "seed": 11,
      "decorations": [
        { "type": "palm", "x": 140, "y": 624, "scale": 0.9 },
        { "type": "palm", "x": 960, "y": 624, "scale": 1.1 },
        { "type": "palm", "x": 1650, "y": 624, "scale": 1.0 },
        { "type": "flower", "x": 620, "y": 660, "scale": 1.1 },
        { "type": "flower", "x": 780, "y": 668, "scale": 0.9 },
        { "type": "flower", "x": 1500, "y": 654, "scale": 1.2 },
        { "type": "rock", "x": 360, "y": 646, "scale": 1.1 },
        { "type": "rock", "x": 2000, "y": 652, "scale": 1.4 }
      ],
      "objects": [
        { "type": "crystal-block", "x": 1150, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "crystal-block", "x": 1240, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "crystal-block", "x": 1195, "y": 545, "w": 140, "h": 40, "angle": 0 },
        { "type": "pufferfish", "x": 1210, "y": 596 },
        { "type": "coco", "x": 1195, "y": 499 },
        { "type": "wood-block", "x": 1380, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1425, "y": 598 }
      ]
    },
    {
      "name": "Torre de Bambú",
      "subtitle": "Una torre alta necesita un buen golpe",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [1300, 2000, 2800],
      "sunX": 1120,
      "sunY": 110,
      "seed": 23,
      "decorations": [
        { "type": "palm", "x": 100, "y": 624, "scale": 1.1 },
        { "type": "palm", "x": 900, "y": 624, "scale": 0.95 },
        { "type": "palm", "x": 1750, "y": 624, "scale": 1.25 },
        { "type": "flower", "x": 540, "y": 664, "scale": 1.0 },
        { "type": "flower", "x": 760, "y": 658, "scale": 1.3 },
        { "type": "flower", "x": 1550, "y": 666, "scale": 0.9 },
        { "type": "rock", "x": 300, "y": 650, "scale": 0.9 },
        { "type": "rock", "x": 2100, "y": 648, "scale": 1.5 }
      ],
      "objects": [
        { "type": "bamboo-block", "x": 1150, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "bamboo-block", "x": 1150, "y": 530, "w": 60, "h": 60, "angle": 0 },
        { "type": "bamboo-block", "x": 1150, "y": 470, "w": 60, "h": 60, "angle": 0 },
        { "type": "coco", "x": 1150, "y": 414 },
        { "type": "crab", "x": 1120, "y": 598 },
        { "type": "wood-block", "x": 1040, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1280, "y": 598 },
        { "type": "crystal-block", "x": 1330, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "pufferfish", "x": 1370, "y": 596 }
      ]
    },
    {
      "name": "Fortaleza de Piedra",
      "subtitle": "La piedra aguanta... ¿y el cristal?",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [1100, 1700, 2400],
      "sunX": 1000,
      "sunY": 150,
      "seed": 31,
      "decorations": [
        { "type": "palm", "x": 160, "y": 624, "scale": 1.0 },
        { "type": "palm", "x": 820, "y": 624, "scale": 1.2 },
        { "type": "palm", "x": 1700, "y": 624, "scale": 1.05 },
        { "type": "flower", "x": 640, "y": 660, "scale": 1.2 },
        { "type": "flower", "x": 1480, "y": 656, "scale": 1.0 },
        { "type": "rock", "x": 350, "y": 646, "scale": 1.2 },
        { "type": "rock", "x": 2050, "y": 650, "scale": 1.2 }
      ],
      "objects": [
        { "type": "stone-block", "x": 1150, "y": 590, "w": 70, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1230, "y": 590, "w": 70, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1190, "y": 530, "w": 150, "h": 50, "angle": 0 },
        { "type": "crystal-block", "x": 1190, "y": 480, "w": 40, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1190, "y": 598 },
        { "type": "crab", "x": 1310, "y": 598 },
        { "type": "wood-block", "x": 1400, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "coco", "x": 1460, "y": 594 }
      ]
    },
    {
      "name": "La Caída del Coco",
      "subtitle": "Coco arriba... ¡y mucho que defender!",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [1400, 2200, 3000],
      "sunX": 980,
      "sunY": 130,
      "seed": 41,
      "decorations": [
        { "type": "palm", "x": 120, "y": 624, "scale": 1.2 },
        { "type": "palm", "x": 840, "y": 624, "scale": 1.0 },
        { "type": "palm", "x": 1820, "y": 624, "scale": 1.3 },
        { "type": "flower", "x": 500, "y": 662, "scale": 1.1 },
        { "type": "flower", "x": 730, "y": 668, "scale": 0.9 },
        { "type": "flower", "x": 1600, "y": 656, "scale": 1.2 },
        { "type": "rock", "x": 330, "y": 648, "scale": 1.0 },
        { "type": "rock", "x": 2150, "y": 646, "scale": 1.6 }
      ],
      "objects": [
        { "type": "bamboo-block", "x": 1020, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "bamboo-block", "x": 1020, "y": 545, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1020, "y": 598 },
        { "type": "stone-block", "x": 1140, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1220, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "wood-block", "x": 1180, "y": 530, "w": 140, "h": 40, "angle": 0 },
        { "type": "coco", "x": 1180, "y": 484 },
        { "type": "pufferfish", "x": 1180, "y": 596 },
        { "type": "wood-block", "x": 1360, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "wood-block", "x": 1360, "y": 545, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1360, "y": 598 }
      ]
    },
    {
      "name": "Castillo de la Isla",
      "subtitle": "El gran final en Corn Island",
      "width": 2400,
      "frogs": 4,
      "slingshot": { "x": 220, "y": 620 },
      "stars": [1700, 2600, 3600],
      "sunX": 1100,
      "sunY": 120,
      "seed": 53,
      "decorations": [
        { "type": "palm", "x": 100, "y": 624, "scale": 1.15 },
        { "type": "palm", "x": 780, "y": 624, "scale": 1.0 },
        { "type": "palm", "x": 1880, "y": 624, "scale": 1.35 },
        { "type": "flower", "x": 560, "y": 660, "scale": 1.2 },
        { "type": "flower", "x": 720, "y": 666, "scale": 0.9 },
        { "type": "flower", "x": 1640, "y": 656, "scale": 1.1 },
        { "type": "rock", "x": 320, "y": 648, "scale": 1.2 },
        { "type": "rock", "x": 2200, "y": 646, "scale": 1.4 }
      ],
      "objects": [
        { "type": "bamboo-block", "x": 980, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1010, "y": 598 },
        { "type": "stone-block", "x": 1090, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1170, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1250, "y": 590, "w": 60, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1170, "y": 530, "w": 180, "h": 50, "angle": 0 },
        { "type": "stone-block", "x": 1090, "y": 500, "w": 60, "h": 60, "angle": 0 },
        { "type": "stone-block", "x": 1250, "y": 500, "w": 60, "h": 60, "angle": 0 },
        { "type": "wood-block", "x": 1170, "y": 500, "w": 180, "h": 40, "angle": 0 },
        { "type": "coco", "x": 1170, "y": 454 },
        { "type": "crab", "x": 1110, "y": 598 },
        { "type": "crab", "x": 1230, "y": 598 },
        { "type": "pufferfish", "x": 1500, "y": 596 },
        { "type": "wood-block", "x": 1390, "y": 595, "w": 50, "h": 50, "angle": 0 },
        { "type": "wood-block", "x": 1390, "y": 545, "w": 50, "h": 50, "angle": 0 },
        { "type": "crab", "x": 1450, "y": 598 }
      ]
    }
  ];

  class LevelLoader {
    static get LEVEL_COUNT() {
      return EMBEDDED.length;
    }

    static getLevelCount() {
      return EMBEDDED.length;
    }

    static getLevelNames() {
      return EMBEDDED.map((l) => l.name);
    }

    /**
     * Carga un nivel por índice (1-based).
     * @returns {Promise<object>} nivel parseado
     */
    static async load(index) {
      if (index < 1 || index > EMBEDDED.length) {
        throw new Error(`Nivel fuera de rango: ${index}`);
      }
      try {
        const res = await fetch(`levels/level${index}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && data.objects) return data;
        throw new Error('JSON inválido');
      } catch (e) {
        // file:// o sin servidor → usar copia embebida
        return JSON.parse(JSON.stringify(EMBEDDED[index - 1]));
      }
    }
  }

  NS.LevelLoader = { LevelLoader, EMBEDDED };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
