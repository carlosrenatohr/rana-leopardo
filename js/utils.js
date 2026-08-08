/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/utils.js
 * ------------------------------------------------------------
 * Utilidades base del juego: matemáticas vectoriales, helpers
 * numéricos, colores y un pequeño emitter de eventos.
 *
 * Sin dependencias. Todo se expone bajo el namespace global
 * único `FrogGame` (compatible también con Node para tests).
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});

  /* ----------------------------------------------------------
   * Vec2 — vector 2D inmutable por convención (los métodos
   * mutables devuelven `this` para encadenar).
   * ---------------------------------------------------------- */
  class Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    clone() {
      return new Vec2(this.x, this.y);
    }

    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }

    copy(v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    }

    add(v) {
      return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v) {
      return new Vec2(this.x - v.x, this.y - v.y);
    }

    scale(s) {
      return new Vec2(this.x * s, this.y * s);
    }

    addScaled(v, s) {
      return new Vec2(this.x + v.x * s, this.y + v.y * s);
    }

    dot(v) {
      return this.x * v.x + this.y * v.y;
    }

    /** Producto cruz escalar (z del 3D cross). */
    cross(v) {
      return this.x * v.y - this.y * v.x;
    }

    length() {
      return Math.hypot(this.x, this.y);
    }

    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }

    distance(v) {
      return Math.hypot(this.x - v.x, this.y - v.y);
    }

    distanceSq(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      return dx * dx + dy * dy;
    }

    normalize() {
      const len = this.length();
      return len > 1e-9 ? new Vec2(this.x / len, this.y / len) : new Vec2(0, 0);
    }

    /** Rota 90° en sentido horario: (x,y) -> (-y,x)... realmente antihorario? Se usa para normales. */
    perp() {
      return new Vec2(-this.y, this.x);
    }

    rotate(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
    }

    angle() {
      return Math.atan2(this.y, this.x);
    }

    static fromAngle(angle, len = 1) {
      return new Vec2(Math.cos(angle) * len, Math.sin(angle) * len);
    }

    static lerp(a, b, t) {
      return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }

    static zero() {
      return new Vec2(0, 0);
    }
  }

  /* ----------------------------------------------------------
   * MathUtils — helpers numéricos
   * ---------------------------------------------------------- */
  const MathUtils = {
    TAU: Math.PI * 2,

    clamp(v, min, max) {
      return v < min ? min : v > max ? max : v;
    },

    clamp01(v) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    invLerp(a, b, v) {
      return a === b ? 0 : (v - a) / (b - a);
    },

    /** Interpolación con suavizado sinusoidal. */
    smooth(a, b, t) {
      const u = t * t * (3 - 2 * t);
      return a + (b - a) * u;
    },

    /** Facilidad de salida: retrocede un poco al inicio. */
    easeOutBack(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    },

    easeInCubic(t) {
      return t * t * t;
    },

    easeOutElastic(t) {
      if (t === 0 || t === 1) return t;
      const c4 = (MathUtils.TAU) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    rand(min, max) {
      return min + Math.random() * (max - min);
    },

    randInt(min, max) {
      return Math.floor(MathUtils.rand(min, max + 1));
    },

    randSign() {
      return Math.random() < 0.5 ? -1 : 1;
    },

    choice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },

    /** Ángulo normalizado a [-PI, PI]. */
    normalizeAngle(a) {
      while (a > Math.PI) a -= MathUtils.TAU;
      while (a < -Math.PI) a += MathUtils.TAU;
      return a;
    },

    degrees(rad) {
      return (rad * 180) / Math.PI;
    },

    radians(deg) {
      return (deg * Math.PI) / 180;
    },

    /** Distancia de un punto a un segmento (para partículas/colliders helpers). */
    pointSegmentDistance(p, a, b) {
      const ab = b.sub(a);
      const t = MathUtils.clamp(p.sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
      return p.distance(a.add(ab.scale(t)));
    },

    /** Tabla de mezcla de colores en formato rgba(). */
    mixColor(c1, c2, t) {
      const r = Math.round(MathUtils.lerp(c1[0], c2[0], t));
      const g = Math.round(MathUtils.lerp(c1[1], c2[1], t));
      const b = Math.round(MathUtils.lerp(c1[2], c2[2], t));
      return `rgb(${r},${g},${b})`;
    }
  };

  /* ----------------------------------------------------------
   * Color — utilidades para manipular colores.
   * ---------------------------------------------------------- */
  class Color {
    /** 'rgb(r,g,b)' | '#rrggbb' | [r,g,b] -> [r,g,b] 0..255 */
    static parse(input) {
      if (Array.isArray(input)) return input.slice(0, 3);
      if (input[0] === '#') {
        const hex = input.slice(1);
        const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
        return [
          parseInt(full.slice(0, 2), 16),
          parseInt(full.slice(2, 4), 16),
          parseInt(full.slice(4, 6), 16)
        ];
      }
      const m = input.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
    }

    static toRgba(input, alpha) {
      const [r, g, b] = Color.parse(input);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    /** Mezcla dos colores (t 0..1). */
    static mix(inputA, inputB, t) {
      const a = Color.parse(inputA);
      const b = Color.parse(inputB);
      return [
        Math.round(MathUtils.lerp(a[0], b[0], t)),
        Math.round(MathUtils.lerp(a[1], b[1], t)),
        Math.round(MathUtils.lerp(a[2], b[2], t))
      ];
    }

    /** Oscurece o aclara un color (amt negativo = más oscuro). */
    static shade(input, amt) {
      const [r, g, b] = Color.parse(input);
      const f = (v) => MathUtils.clamp(Math.round(v + amt), 0, 255);
      return `rgb(${f(r)},${f(g)},${f(b)})`;
    }

    static alpha(input, a) {
      return Color.toRgba(input, a);
    }
  }

  /* ----------------------------------------------------------
   * EventEmitter — suscripción/emisión de eventos tipados.
   * ---------------------------------------------------------- */
  class EventEmitter {
    constructor() {
      this._listeners = new Map();
    }

    on(event, fn) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(fn);
      return this;
    }

    off(event, fn) {
      const list = this._listeners.get(event);
      if (!list) return this;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
      return this;
    }

    once(event, fn) {
      const wrapper = (...args) => {
        this.off(event, wrapper);
        fn(...args);
      };
      return this.on(event, wrapper);
    }

    emit(event, ...args) {
      const list = this._listeners.get(event);
      if (!list) return this;
      for (const fn of list.slice()) fn(...args);
      return this;
    }

    clear() {
      this._listeners.clear();
    }
  }

  /* ----------------------------------------------------------
   * Id — generador simple de ids únicos.
   * ---------------------------------------------------------- */
  class Id {
    constructor(prefix = 'id') {
      this._n = 0;
      this._prefix = prefix;
    }
    next() {
      this._n += 1;
      return `${this._prefix}_${this._n}`;
    }
  }

  // Exportar al namespace y a CommonJS (para tests en Node).
  NS.Utils = { Vec2, MathUtils, Color, EventEmitter, Id };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
