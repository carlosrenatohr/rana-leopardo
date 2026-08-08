/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/particles.js
 * ------------------------------------------------------------
 * Sistema de partículas (sin imágenes, todo vectorial):
 *   - polvo / dust        (salida de la resortera)
 *   - astillas / splinter (madera)
 *   - cristales / shard   (cristal roto)
 *   - burbujas / bubble   (splash y agua)
 *   - chispas / spark     (impactos)
 *   - confeti / confetti  (victoria)
 *   - anillos / ring      (ondas expansivas)
 *   - texto / text        (popups de puntuación)
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils, Color } = NS.Utils;

  const TYPES = {
    DUST: 'dust',
    SPLINTER: 'splinter',
    SHARD: 'shard',
    BUBBLE: 'bubble',
    SPARK: 'spark',
    CONFETTI: 'confetti',
    RING: 'ring',
    TEXT: 'text',
    HEART: 'heart'
  };

  class Particle {
    constructor(opts) {
      this.type = opts.type || TYPES.DUST;
      this.x = opts.x;
      this.y = opts.y;
      this.vx = opts.vx || 0;
      this.vy = opts.vy || 0;
      this.gravity = opts.gravity ?? 0;
      this.life = opts.life ?? 0.8;
      this.maxLife = this.life;
      this.size = opts.size ?? 4;
      this.color = opts.color || '#ffffff';
      this.rotation = opts.rotation ?? 0;
      this.vrot = opts.vrot ?? 0;
      this.drag = opts.drag ?? 0;
      this.text = opts.text || '';
      this.font = opts.font || '700 22px sans-serif';
      this.fadeIn = opts.fadeIn ?? 0;
      this.shape = opts.shape || 'circle'; // circle | rect | line
      this.stroke = opts.stroke || false;
    }

    update(dt) {
      this.life -= dt;
      this.vy += this.gravity * dt;
      if (this.drag > 0) {
        const d = Math.max(0, 1 - this.drag * dt);
        this.vx *= d;
        this.vy *= d;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rotation += this.vrot * dt;
    }

    get alpha() {
      const a = this.life / this.maxLife;
      if (this.fadeIn > 0) {
        const fade = MathUtils.clamp01((this.maxLife - this.life) / this.fadeIn);
        return Math.min(a, fade);
      }
      return a;
    }

    draw(ctx) {
      const a = this.alpha;
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;

      switch (this.type) {
        case TYPES.DUST:
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * (0.4 + 0.6 * a), 0, MathUtils.TAU);
          ctx.fill();
          break;

        case TYPES.SPLINTER:
        case TYPES.SHARD:
          ctx.fillStyle = this.color;
          ctx.translate(this.x, this.y);
          ctx.rotate(this.rotation);
          ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
          break;

        case TYPES.BUBBLE:
          ctx.strokeStyle = Color.alpha(this.color, a);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * (1 - a * 0.6), 0, MathUtils.TAU);
          ctx.stroke();
          break;

        case TYPES.SPARK:
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * a, 0, MathUtils.TAU);
          ctx.fill();
          break;

        case TYPES.CONFETTI:
          ctx.fillStyle = this.color;
          ctx.translate(this.x, this.y);
          ctx.rotate(this.rotation);
          ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
          break;

        case TYPES.RING:
          ctx.strokeStyle = Color.alpha(this.color, a * 0.7);
          ctx.lineWidth = 3 * a;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * (1 + (1 - a) * 2.4), 0, MathUtils.TAU);
          ctx.stroke();
          break;

        case TYPES.HEART:
          this._drawHeart(ctx);
          break;

        case TYPES.TEXT:
          ctx.fillStyle = Color.alpha(this.color, a);
          ctx.font = this.font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.text, this.x, this.y);
          break;
      }
      ctx.restore();
    }

    _drawHeart(ctx) {
      const s = this.size;
      ctx.fillStyle = this.color;
      ctx.translate(this.x, this.y);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, 0.35);
      ctx.bezierCurveTo(-0.5, -0.15, -0.3, -0.6, 0, -0.2);
      ctx.bezierCurveTo(0.3, -0.6, 0.5, -0.15, 0, 0.35);
      ctx.fill();
    }
  }

  /* ----------------------------------------------------------
   * Particles — contenedor y emisores
   * ---------------------------------------------------------- */
  class Particles {
    constructor() {
      this.items = [];
      this.maxItems = 900;
    }

    clear() {
      this.items.length = 0;
    }

    _push(particle) {
      if (this.items.length >= this.maxItems) this.items.shift();
      this.items.push(particle);
    }

    /** Emite varias partículas con parámetros comunes. */
    emit(opts, count = 1) {
      for (let i = 0; i < count; i++) {
        this._push(new Particle({
          x: opts.x + MathUtils.rand(-opts.spreadX || 0, opts.spreadX || 0),
          y: opts.y + MathUtils.rand(-opts.spreadY || 0, opts.spreadY || 0),
          vx: opts.vx != null ? opts.vx + MathUtils.rand(-opts.angleSpread || 0, opts.angleSpread || 0) : 0,
          vy: opts.vy != null ? opts.vy : 0,
          gravity: opts.gravity ?? 0,
          life: opts.life ?? 0.8,
          size: opts.size ?? 4,
          color: opts.color ?? '#ffffff',
          type: opts.type ?? TYPES.DUST,
          vrot: opts.vrot ?? MathUtils.rand(-6, 6),
          rotation: opts.rotation ?? MathUtils.rand(0, MathUtils.TAU),
          drag: opts.drag ?? 0,
          text: opts.text || '',
          font: opts.font,
          fadeIn: opts.fadeIn ?? 0,
          shape: opts.shape,
          stroke: opts.stroke
        }));
      }
    }

    /** Explosión radial de astillas de madera. */
    woodSplinters(x, y, power = 1) {
      const count = Math.floor(8 + power * 6);
      for (let i = 0; i < count; i++) {
        const a = MathUtils.rand(0, MathUtils.TAU);
        const sp = MathUtils.rand(120, 340) * power;
        this.emit({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 120,
          gravity: 1500,
          life: MathUtils.rand(0.5, 1),
          size: MathUtils.rand(5, 10),
          color: MathUtils.choice(['#e0a866', '#cf8f4e', '#b5763a']),
          type: TYPES.SPLINTER,
          vrot: MathUtils.rand(-10, 10),
          drag: 0.4
        });
      }
    }

    /** Fragmentos de cristal. */
    glassShards(x, y, power = 1) {
      const count = Math.floor(10 + power * 6);
      for (let i = 0; i < count; i++) {
        const a = MathUtils.rand(0, MathUtils.TAU);
        const sp = MathUtils.rand(100, 380) * power;
        this.emit({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 100,
          gravity: 1300,
          life: MathUtils.rand(0.4, 0.9),
          size: MathUtils.rand(4, 9),
          color: MathUtils.choice(['#cfefff', '#a9ddf5', '#e8f8ff', '#8fd0ee']),
          type: TYPES.SHARD,
          vrot: MathUtils.rand(-14, 14),
          drag: 0.2
        });
      }
    }

    /** Chispas de piedra. */
    stoneChips(x, y, power = 1) {
      const count = Math.floor(6 + power * 5);
      for (let i = 0; i < count; i++) {
        const a = MathUtils.rand(0, MathUtils.TAU);
        const sp = MathUtils.rand(80, 240) * power;
        this.emit({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 60,
          gravity: 1600,
          life: MathUtils.rand(0.3, 0.7),
          size: MathUtils.rand(2, 5),
          color: MathUtils.choice(['#b9bec4', '#d8dcdd', '#8f959b']),
          type: TYPES.SPARK,
          drag: 0.5
        });
      }
    }

    /** Polvo suave (salida de la resortera, caídas). */
    dust(x, y, amount = 8) {
      for (let i = 0; i < amount; i++) {
        this.emit({
          x, y,
          vx: MathUtils.rand(-60, 60),
          vy: MathUtils.rand(-40, 10),
          gravity: -60,
          life: MathUtils.rand(0.4, 0.9),
          size: MathUtils.rand(3, 7),
          color: 'rgba(255,244,214,0.9)',
          type: TYPES.DUST,
          drag: 1.2
        });
      }
    }

    /** Salpicadura de agua (rana cae al mar). */
    splash(x, y, power = 1) {
      for (let i = 0; i < 10; i++) {
        this.emit({
          x, y,
          vx: MathUtils.rand(-160, 160),
          vy: MathUtils.rand(-260, -40) * power,
          gravity: 1400,
          life: MathUtils.rand(0.4, 0.8),
          size: MathUtils.rand(3, 8),
          color: 'rgba(150,214,244,0.95)',
          type: TYPES.DUST,
          drag: 0.2
        });
      }
      for (let i = 0; i < 6; i++) {
        this.emit({
          x, y,
          vx: MathUtils.rand(-120, 120),
          vy: MathUtils.rand(-60, 30),
          gravity: -300,
          life: MathUtils.rand(0.7, 1.2),
          size: MathUtils.rand(5, 10),
          color: 'rgba(190,230,250,0.9)',
          type: TYPES.BUBBLE,
          drag: 0.8
        });
      }
      this.emit({ x, y, size: 26, color: '#bfe9f7', type: TYPES.RING, life: 0.5 });
    }

    /** Burbujas ascendentes (pez globo derrotado, agua). */
    bubble(x, y, power = 1) {
      for (let i = 0; i < 8; i++) {
        this.emit({
          x, y,
          vx: MathUtils.rand(-50, 50),
          vy: MathUtils.rand(-160, -60) * power,
          gravity: -180,
          life: MathUtils.rand(0.6, 1.2),
          size: MathUtils.rand(4, 10),
          color: 'rgba(190,230,250,0.95)',
          type: TYPES.BUBBLE,
          drag: 0.5
        });
      }
    }

    /** Anillo de impacto. */
    impactRing(x, y, color = '#ffffff', size = 18) {
      this.emit({ x, y, size, color, type: TYPES.RING, life: 0.35 });
    }

    /** Confeti de victoria. */
    confetti(x, y, count = 40) {
      const colors = ['#ffd166', '#ff8c94', '#9ad0ec', '#b8e994', '#f9a8d4', '#cdb4db'];
      for (let i = 0; i < count; i++) {
        const a = MathUtils.rand(0, MathUtils.TAU);
        const sp = MathUtils.rand(120, 420);
        this.emit({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 200,
          gravity: 1100,
          life: MathUtils.rand(0.8, 1.6),
          size: MathUtils.rand(5, 10),
          color: MathUtils.choice(colors),
          type: TYPES.CONFETTI,
          vrot: MathUtils.rand(-12, 12),
          drag: 0.15,
          fadeIn: 0.15
        });
      }
    }

    /** Popup de puntuación flotante. */
    scorePopup(x, y, text, color = '#ffffff', size = 22) {
      this.emit({
        x, y,
        vx: 0,
        vy: -70,
        gravity: -40,
        life: 1.1,
        size,
        color,
        type: TYPES.TEXT,
        text,
        font: `800 ${size}px 'Quicksand', 'Segoe UI', sans-serif`,
        fadeIn: 0.1
      });
    }

    /** Corazón decorativo (bonus de rana restante). */
    heart(x, y) {
      this.emit({
        x, y,
        vx: MathUtils.rand(-20, 20),
        vy: -90,
        gravity: 500,
        life: 1.4,
        size: 0.6,
        color: '#ff8c94',
        type: TYPES.HEART,
        fadeIn: 0.1
      });
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.update(dt);
        if (p.life <= 0) this.items.splice(i, 1);
      }
    }

    draw(ctx) {
      for (const p of this.items) p.draw(ctx);
    }
  }

  NS.Particles = { Particles, TYPES, Particle };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
