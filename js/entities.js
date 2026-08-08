/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/entities.js
 * ------------------------------------------------------------
 * ENTIDADES — cada objeto del juego es una clase independiente:
 *
 *   - Frog          (rana leopardo, protagonista)
 *   - WoodBlock     (bloque de madera)
 *   - CrystalBlock  (bloque de cristal)
 *   - BambooBlock   (bloque de bambú)
 *   - StoneBlock    (bloque de piedra)
 *   - Crab          (cangrejo enemigo)
 *   - Pufferfish    (pez globo enemigo)
 *   - Coco          (coco enemigo rodante)
 *
 * Todas heredan de `Body` (física) y añaden vida (HP), puntos,
 * material, daño y dibujado vectorial (sin imágenes externas).
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils, Color } = NS.Utils;
  const { Body } = NS.Physics;
  const { CircleShape, PolygonShape } = NS.Collision;

  /* ----------------------------------------------------------
   * MATERIALES — propiedades físicas y de juego
   * ---------------------------------------------------------- */
  const MATERIALS = {
    wood: { hp: 60, score: 50, friction: 0.5, restitution: 0.08, density: 1.1, color: '#d9a066' },
    crystal: { hp: 35, score: 30, friction: 0.12, restitution: 0.22, density: 0.9, color: '#b5e6f8' },
    bamboo: { hp: 90, score: 40, friction: 0.45, restitution: 0.1, density: 0.7, color: '#b9d98e' },
    stone: { hp: 200, score: 80, friction: 0.75, restitution: 0.03, density: 2.2, color: '#c9cdd2' }
  };

  /** Helper: rectángulo redondeado (con fallback manual). */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ==========================================================
   * Entity — clase base de entidades con vida
   * ========================================================== */
  class Entity extends Body {
    constructor(opts = {}) {
      super(opts);
      this.entityType = opts.entityType || 'entity';
      this.maxHp = opts.hp ?? 100;
      this.hp = this.maxHp;
      this.scoreValue = opts.score ?? 0;
      this.dead = false;
      this.hitFlash = 0;
      this.time = MathUtils.rand(0, 10);
      this.spawnTime = 0;
    }

    update(dt) {
      this.time += dt;
      this.spawnTime += dt;
      if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
    }

    /** Aplica daño. Devuelve true si murió en este golpe. */
    damage(amount, point = null) {
      if (this.dead) return false;
      this.hp -= amount;
      this.hitFlash = 1;
      if (this.hp <= 0) {
        this.dead = true;
        this.hp = 0;
        return true;
      }
      return false;
    }

    get healthRatio() {
      return this.hp / this.maxHp;
    }

    get isEnemy() {
      return this.tags.has('enemy');
    }
  }

  /* ==========================================================
   * Frog — RANA LEOPARDO (protagonista adorable)
   * ========================================================== */
  class Frog extends Entity {
    static RADIUS = 30;

    constructor(opts = {}) {
      super(Object.assign({
        entityType: 'frog',
        shape: new CircleShape(Frog.RADIUS),
        mass: 3,
        restitution: 0.35,
        friction: 0.3,
        hp: Infinity,
        tags: ['frog', 'player'],
        linearDamping: 0.08,
        angularDamping: 0.5
      }, opts));
      this.scoreValue = 0;
      this.blinkTimer = MathUtils.rand(1.5, 4);
      this.blinkPhase = 0; // 0 = abierto, >0 parpadeando
      this.facing = 1; // dirección a la que miran los ojos
      this.held = false;
    }

    /** Pequeña sacudida feliz al colocar en la resortera. */
    update(dt) {
      super.update(dt);
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = MathUtils.rand(2, 5);
        this.blinkPhase = 0.22; // duración del parpadeo
      }
      if (this.blinkPhase > 0) this.blinkPhase = Math.max(0, this.blinkPhase - dt);
    }

    draw(ctx, camera, time) {
      const R = Frog.RADIUS;
      const c = this.getWorldCenter();
      const breathing = 1 + Math.sin(this.time * 3.2) * 0.035;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle);

      // Sombra interior sutil
      ctx.scale(1, breathing);

      // Cuerpo — degradado verde rana
      const bodyG = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.2, 0, 0, R);
      bodyG.addColorStop(0, '#b8e88f');
      bodyG.addColorStop(1, '#6fbf4f');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.92, 0, 0, MathUtils.TAU);
      ctx.fill();

      // Vientre claro
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath();
      ctx.ellipse(0, R * 0.32, R * 0.62, R * 0.5, 0, 0, MathUtils.TAU);
      ctx.fill();

      // Manchas de rana leopardo
      const spots = [
        [-12, -14, 5, 3.4], [6, -16, 4.5, 3], [16, -6, 4, 2.8],
        [-18, 2, 4.2, 3], [0, -8, 5, 3.2], [-4, 6, 3.6, 2.6], [12, 8, 3.4, 2.4]
      ];
      ctx.fillStyle = 'rgba(30,80,40,0.55)';
      for (const [sx, sy, sw, sh] of spots) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, sw, sh, MathUtils.rand(-0.4, 0.4) + this.time * 0.001, 0, MathUtils.TAU);
        ctx.fill();
      }

      // Patas traseras
      ctx.fillStyle = '#8acf63';
      ctx.beginPath();
      ctx.ellipse(-R * 0.82, R * 0.55, 8, 5.5, -0.5, 0, MathUtils.TAU);
      ctx.ellipse(R * 0.82, R * 0.55, 8, 5.5, 0.5, 0, MathUtils.TAU);
      ctx.fill();

      // Mejillas sonrosadas
      ctx.fillStyle = 'rgba(255,150,150,0.5)';
      ctx.beginPath();
      ctx.arc(-15, 2, 3.6, 0, MathUtils.TAU);
      ctx.arc(15, 2, 3.6, 0, MathUtils.TAU);
      ctx.fill();

      // Sonrisa
      ctx.strokeStyle = 'rgba(40,80,40,0.8)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 3, 6.5, 0.25, Math.PI - 0.25);
      ctx.stroke();

      // Ojos (con parpadeo)
      const eyeY = -14;
      const lookX = this.facing * 2.4;
      const blink = this.blinkPhase > 0 ? Math.sin((this.blinkPhase / 0.22) * Math.PI) : 0;
      for (const ex of [-11, 11]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, 9, 0, MathUtils.TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,140,70,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Pupila
        ctx.fillStyle = '#26261f';
        ctx.beginPath();
        ctx.arc(ex + lookX, eyeY + 1, 4.6, 0, MathUtils.TAU);
        ctx.fill();
        // Brillo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + lookX - 1.5, eyeY - 1.2, 1.7, 0, MathUtils.TAU);
        ctx.fill();
        // Párpado (parpadeo)
        if (blink > 0) {
          ctx.fillStyle = '#9adf6e';
          ctx.beginPath();
          ctx.ellipse(ex, eyeY - 1, 9.5, 10 * blink, 0, 0, MathUtils.TAU);
          ctx.fill();
        }
      }

      // Flash de impacto
      if (this.hitFlash > 0) {
        ctx.globalAlpha = this.hitFlash * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * 0.92, 0, 0, MathUtils.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  /* ==========================================================
   * Block — clase base de bloques destructibles
   * ========================================================== */
  class Block extends Entity {
    constructor(opts = {}) {
      const mat = MATERIALS[opts.material];
      const w = opts.w ?? 60;
      const h = opts.h ?? 40;
      super(Object.assign({
        shape: PolygonShape.rect(w, h),
        mass: opts.mass ?? (mat.density * (w * h) / 300),
        restitution: mat.restitution,
        friction: mat.friction,
        hp: mat.hp,
        score: mat.score,
        tags: ['block', opts.material],
        linearDamping: 0.05,
        angularDamping: 0.1
      }, opts));
      this.w = w;
      this.h = h;
      this.material = opts.material;
      this.cracks = [];
      this._genCracks();
    }

    /** Genera grietas deterministas (semilla por id) para estados dañados. */
    _genCracks() {
      let seed = 0;
      for (let i = 0; i < this.id.length; i++) seed += this.id.charCodeAt(i) * (i + 3);
      const rnd = () => {
        seed = (seed * 16807 + 11) % 2147483647;
        return seed / 2147483647;
      };
      const count = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) {
        const pts = [];
        let x = (rnd() - 0.5) * this.w * 0.7;
        let y = (rnd() - 0.5) * this.h * 0.7;
        pts.push([x, y]);
        const steps = 2 + Math.floor(rnd() * 2);
        for (let s = 0; s < steps; s++) {
          x += (rnd() - 0.5) * this.w * 0.5;
          y += (rnd() - 0.5) * this.h * 0.5;
          pts.push([x, y]);
        }
        this.cracks.push(pts);
      }
    }

    _drawCracks(ctx, alpha) {
      ctx.strokeStyle = `rgba(40,30,20,${alpha})`;
      ctx.lineWidth = 1.8;
      for (const pts of this.cracks) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    }

    /**
     * Flash blanco al recibir un golpe. Vive en la clase base porque
     * TODOS los bloques lo usan (antes solo estaba en WoodBlock y
     * cristal/bambú/piedra rompían con "_drawHitFlash is not a function").
     */
    _drawHitFlash(ctx, w, h) {
      if (this.hitFlash > 0) {
        ctx.globalAlpha = this.hitFlash * 0.4;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, -w / 2, -h / 2, w, h, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Bloque de madera con vetas. */
  class WoodBlock extends Block {
    constructor(opts = {}) {
      super(Object.assign({ material: 'wood' }, opts));
      this.entityType = 'wood-block';
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const hpR = this.healthRatio;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle);
      const w = this.w;
      const h = this.h;

      // Cuerpo
      roundRect(ctx, -w / 2, -h / 2, w, h, 5);
      ctx.fillStyle = Color.mix('#e3b078', '#b07d47', 1 - hpR);
      ctx.fill();
      ctx.strokeStyle = '#96683a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vetas
      ctx.strokeStyle = 'rgba(140,95,50,0.5)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const yy = -h * 0.25 + i * h * 0.25;
        ctx.beginPath();
        ctx.moveTo(-w * 0.42, yy);
        ctx.quadraticCurveTo(0, yy - 4, w * 0.42, yy);
        ctx.stroke();
      }

      if (hpR < 0.5) this._drawCracks(ctx, 0.8);
      this._drawHitFlash(ctx, w, h);
      ctx.restore();
    }
  }

  /** Bloque de cristal translúcido. */
  class CrystalBlock extends Block {
    constructor(opts = {}) {
      super(Object.assign({ material: 'crystal' }, opts));
      this.entityType = 'crystal-block';
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const hpR = this.healthRatio;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle);
      const w = this.w;
      const h = this.h;

      roundRect(ctx, -w / 2, -h / 2, w, h, 5);
      ctx.fillStyle = `rgba(${180 + (1 - hpR) * 40},230,255,${0.55 + hpR * 0.3})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Reflejo diagonal
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.32);
      ctx.lineTo(w * 0.05, -h * 0.32);
      ctx.lineTo(w * 0.3, h * 0.32);
      ctx.lineTo(-w * 0.05, h * 0.32);
      ctx.stroke();

      if (hpR < 0.5) this._drawCracks(ctx, 0.5);
      this._drawHitFlash(ctx, w, h);
      ctx.restore();
    }
  }

  /** Bloque de bambú con nudos. */
  class BambooBlock extends Block {
    constructor(opts = {}) {
      super(Object.assign({ material: 'bamboo' }, opts));
      this.entityType = 'bamboo-block';
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const hpR = this.healthRatio;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle);
      const w = this.w;
      const h = this.h;

      roundRect(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fillStyle = Color.mix('#c8e29a', '#93b96a', 1 - hpR);
      ctx.fill();
      ctx.strokeStyle = '#7da256';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Nudos horizontales (segmentos de caña)
      ctx.strokeStyle = 'rgba(110,150,70,0.7)';
      ctx.lineWidth = 2.2;
      const seg = Math.max(1, Math.round(h / 24));
      for (let i = 1; i < seg; i++) {
        const yy = -h / 2 + (i / seg) * h;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, yy);
        ctx.lineTo(w / 2 - 3, yy);
        ctx.stroke();
      }
      // Línea central brillante
      ctx.strokeStyle = 'rgba(255,255,220,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 4);
      ctx.lineTo(0, h / 2 - 4);
      ctx.stroke();

      if (hpR < 0.5) this._drawCracks(ctx, 0.7);
      this._drawHitFlash(ctx, w, h);
      ctx.restore();
    }
  }

  /** Bloque de piedra robusto. */
  class StoneBlock extends Block {
    constructor(opts = {}) {
      super(Object.assign({ material: 'stone' }, opts));
      this.entityType = 'stone-block';
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const hpR = this.healthRatio;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(this.angle);
      const w = this.w;
      const h = this.h;

      roundRect(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fillStyle = Color.mix('#d3d7da', '#9aa0a6', 1 - hpR);
      ctx.fill();
      ctx.strokeStyle = '#878d93';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Textura de roca
      ctx.fillStyle = 'rgba(120,125,130,0.25)';
      for (let i = 0; i < 5; i++) {
        const px = -w * 0.3 + ((i * 37) % (w * 0.8));
        const py = -h * 0.3 + ((i * 53) % (h * 0.6));
        ctx.beginPath();
        ctx.ellipse(px, py, 3.4, 2.2, i, 0, MathUtils.TAU);
        ctx.fill();
      }

      if (hpR < 0.5) this._drawCracks(ctx, 0.6);
      this._drawHitFlash(ctx, w, h);
      ctx.restore();
    }
  }

  /* ==========================================================
   * Crab — CANGREJO ENEMIGO
   * ========================================================== */
  class Crab extends Entity {
    constructor(opts = {}) {
      super(Object.assign({
        entityType: 'crab',
        shape: new CircleShape(22),
        mass: 3,
        restitution: 0.3,
        friction: 0.55,
        hp: 100,
        score: 500,
        tags: ['enemy', 'crab'],
        linearDamping: 0.1,
        angularDamping: 0.3
      }, opts));
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const R = 22;
      const bob = Math.sin(this.time * 2.4) * 1.5;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(Math.sin(this.time * 1.8) * 0.05);

      // Patas
      ctx.strokeStyle = '#e56a6f';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ang = (i - 1) * 0.35 * side;
          ctx.beginPath();
          ctx.moveTo(side * R * 0.5, 6 + i * 5);
          ctx.lineTo(side * (R + 10) * 0.9, 10 + i * 6 + Math.sin(this.time * 3 + i) * 2);
          ctx.stroke();
        }
      }

      // Cuerpo
      const bodyG = ctx.createRadialGradient(-5, -6, 3, 0, 0, R);
      bodyG.addColorStop(0, '#ff9d9d');
      bodyG.addColorStop(1, '#f2707a');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.82, 0, 0, MathUtils.TAU);
      ctx.fill();
      ctx.strokeStyle = '#d95a63';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pinzas
      ctx.strokeStyle = '#f2707a';
      ctx.lineWidth = 4.5;
      const claw = Math.sin(this.time * 3.2) * 0.12;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * R * 0.8, -R * 0.25);
        ctx.rotate(side * (0.9 + claw));
        ctx.beginPath();
        ctx.arc(side * 7, -4, 5.5, 0, MathUtils.TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Ojos (tallos)
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#e56a6f';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(side * 7, -R * 0.5);
        ctx.lineTo(side * 9, -R * 0.95);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * 9, -R * 0.95, 3.8, 0, MathUtils.TAU);
        ctx.fill();
        ctx.fillStyle = '#20202a';
        ctx.beginPath();
        ctx.arc(side * 9 + 1, -R * 0.95 + 1, 1.9, 0, MathUtils.TAU);
        ctx.fill();
      }

      // Sonrisa pícara
      ctx.strokeStyle = '#a84048';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 4, 4.5, 0.3, Math.PI - 0.3);
      ctx.stroke();

      if (this.hitFlash > 0) {
        ctx.globalAlpha = this.hitFlash * 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * 0.82, 0, 0, MathUtils.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  /* ==========================================================
   * Pufferfish — PEZ GLOBO ENEMIGO (se infla cerca de la rana)
   * ========================================================== */
  class Pufferfish extends Entity {
    constructor(opts = {}) {
      super(Object.assign({
        entityType: 'pufferfish',
        shape: new CircleShape(24),
        mass: 2.5,
        restitution: 0.4,
        friction: 0.35,
        hp: 80,
        score: 600,
        tags: ['enemy', 'pufferfish'],
        linearDamping: 0.08,
        angularDamping: 0.25
      }, opts));
      this.inflate = 0; // 0..1
      this.nearFrog = false;
    }

    /** El motor llama con la posición de la rana para inflarse. */
    setFrogNear(near) {
      this.nearFrog = near;
    }

    update(dt) {
      super.update(dt);
      const target = this.nearFrog ? 1 : 0;
      this.inflate = MathUtils.lerp(this.inflate, target, Math.min(1, dt * 4));
      // Radio dinámico
      const r = 24 + this.inflate * 12;
      if (Math.abs(r - this.shape.radius) > 0.5) {
        this.shape.radius = r;
        this.updateMass();
        this.updateAABB();
      }
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const R = this.shape.radius;
      const bob = Math.sin(this.time * 2.2) * 2;
      ctx.save();
      ctx.translate(c.x, c.y + bob);

      // Espinas (cuando está inflado)
      if (this.inflate > 0.05) {
        ctx.strokeStyle = `rgba(255,250,220,${0.9 * this.inflate})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * MathUtils.TAU + this.time * 0.5;
          const inner = R * 0.92;
          const outer = R * (1.05 + 0.22 * this.inflate);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
          ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
          ctx.stroke();
        }
      }

      // Aletas laterales
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.ellipse(-R * 0.95, 2, 6, 4, 0.6, 0, MathUtils.TAU);
      ctx.ellipse(R * 0.95, 2, 6, 4, -0.6, 0, MathUtils.TAU);
      ctx.fill();

      // Cuerpo
      const bodyG = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
      bodyG.addColorStop(0, '#fff3b0');
      bodyG.addColorStop(1, '#ffd166');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, MathUtils.TAU);
      ctx.fill();
      ctx.strokeStyle = '#e0b14e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vientre claro
      ctx.fillStyle = 'rgba(255,250,235,0.85)';
      ctx.beginPath();
      ctx.ellipse(0, R * 0.4, R * 0.6, R * 0.45, 0, 0, MathUtils.TAU);
      ctx.fill();

      // Ojos
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(side * R * 0.42, -R * 0.25, 5.5, 0, MathUtils.TAU);
        ctx.fill();
        ctx.fillStyle = '#26261f';
        ctx.beginPath();
        ctx.arc(side * R * 0.42, -R * 0.25 + 1, 2.6, 0, MathUtils.TAU);
        ctx.fill();
      }

      // Boquita
      ctx.strokeStyle = '#c98a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, R * 0.05, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      if (this.hitFlash > 0) {
        ctx.globalAlpha = this.hitFlash * 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, MathUtils.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  /* ==========================================================
   * Coco — COCO ENEMIGO (pesado, rueda)
   * ========================================================== */
  class Coco extends Entity {
    constructor(opts = {}) {
      super(Object.assign({
        entityType: 'coco',
        shape: new CircleShape(26),
        mass: 5,
        restitution: 0.3,
        friction: 0.75,
        hp: 140,
        score: 450,
        tags: ['enemy', 'coco'],
        linearDamping: 0.06,
        angularDamping: 0.2
      }, opts));
    }

    draw(ctx) {
      const c = this.getWorldCenter();
      const R = 26;
      ctx.save();
      ctx.translate(c.x, c.y);

      // Hoja en la parte superior
      ctx.strokeStyle = '#7cb56a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.8);
      ctx.quadraticCurveTo(6, -R - 12, 14, -R - 10);
      ctx.quadraticCurveTo(6, -R - 4, -2, -R * 0.75);
      ctx.stroke();

      // Cuerpo
      const bodyG = ctx.createRadialGradient(-7, -7, 4, 0, 0, R);
      bodyG.addColorStop(0, '#c08a52');
      bodyG.addColorStop(1, '#96622f');
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, MathUtils.TAU);
      ctx.fill();
      ctx.strokeStyle = '#7a4c24';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Manchas oscuras
      ctx.fillStyle = 'rgba(110,70,30,0.5)';
      ctx.beginPath();
      ctx.ellipse(-9, -7, 4.5, 3, 0.4, 0, MathUtils.TAU);
      ctx.ellipse(8, 5, 4, 2.8, -0.3, 0, MathUtils.TAU);
      ctx.ellipse(-4, 10, 3.4, 2.4, 0.2, 0, MathUtils.TAU);
      ctx.fill();

      // Carita dormida
      ctx.strokeStyle = '#5d3a1a';
      ctx.lineWidth = 1.8;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * 8, -2, 2.6, 0, MathUtils.TAU);
        ctx.stroke();
        // Párpados felices (^ ^)
        ctx.beginPath();
        ctx.arc(side * 8, -4, 3.4, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0.3, Math.PI - 0.3);
      ctx.stroke();

      if (this.hitFlash > 0) {
        ctx.globalAlpha = this.hitFlash * 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, MathUtils.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
   * Fábrica de entidades
   * ---------------------------------------------------------- */
  const REGISTRY = {
    'frog': Frog,
    'wood-block': WoodBlock,
    'crystal-block': CrystalBlock,
    'bamboo-block': BambooBlock,
    'stone-block': StoneBlock,
    'crab': Crab,
    'pufferfish': Pufferfish,
    'coco': Coco
  };

  const EntityFactory = {
    REGISTRY,

    /** Crea una entidad a partir de una definición de nivel. */
    create(def) {
      const Cls = REGISTRY[def.type];
      if (!Cls) {
        console.warn(`[entities] Tipo de entidad desconocido: ${def.type}`);
        return null;
      }
      const opts = Object.assign({}, def);
      delete opts.type;
      return new Cls(opts);
    }
  };

  NS.Entities = {
    Entity,
    Frog,
    Block,
    WoodBlock,
    CrystalBlock,
    BambooBlock,
    StoneBlock,
    Crab,
    Pufferfish,
    Coco,
    MATERIALS,
    EntityFactory
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
