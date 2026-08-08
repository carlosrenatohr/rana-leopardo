/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/scene.js
 * ------------------------------------------------------------
 * ESCENARIO — Isla de Maíz (Corn Island), Caribe pastel.
 *
 * Capas (orden de dibujo):
 *   1. Cielo (degradado) + sol
 *   2. Nubes (a la deriva)
 *   3. Mar con olas animadas + isla en el horizonte
 *   4. Arena con espuma de marea
 *   5. Decoración de fondo (palmeras, rocas lejanas)
 *   6. Decoración de frente (flores, conchas, rocas cercanas)
 *
 * También dibuja la resortera (con goma elástica en dos capas:
 * parte trasera antes del personaje, delantera después).
 *
 * Todas las palmeras, flores y nubes se generan de forma
 * procedimental (vectores) — sin imágenes externas.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils, Color } = NS.Utils;

  /* Líneas de referencia del mundo (ver README "coordenadas") */
  const LAYOUT = {
    HORIZON: 430, // línea del horizonte (mar)
    WATERLINE: 622, // línea de la marea (borde de la arena)
    GROUND_Y: 620, // plano físico del suelo
    SAND_TOP: 608, // tope visual de la arena
    WORLD_H: 720
  };

  /* ----------------------------------------------------------
   * Cloud — nube individual
   * ---------------------------------------------------------- */
  class Cloud {
    constructor(x, y, scale, speed, alpha, color) {
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.speed = speed;
      this.alpha = alpha;
      this.color = color;
      this.phase = MathUtils.rand(0, MathUtils.TAU);
    }

    draw(ctx, time) {
      const wob = Math.sin(time * 0.25 + this.phase) * 3;
      const x = this.x;
      const y = this.y + wob;
      const s = this.scale;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      // Nube de 4 lóbulos
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, MathUtils.TAU);
      ctx.arc(x + 30 * s, y - 12 * s, 20 * s, 0, MathUtils.TAU);
      ctx.arc(x + 58 * s, y, 24 * s, 0, MathUtils.TAU);
      ctx.arc(x + 28 * s, y + 8 * s, 22 * s, 0, MathUtils.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
   * Palm — palmera procedimental con viento
   * ---------------------------------------------------------- */
  class Palm {
    constructor(x, baseY, scale = 1, phase = 0) {
      this.x = x;
      this.baseY = baseY;
      this.scale = scale;
      this.phase = phase;
      this.hasCoconuts = Math.random() < 0.6;
    }

    draw(ctx, time) {
      const s = this.scale;
      const sway = Math.sin(time * 0.8 + this.phase) * 0.05;
      const trunkH = 170 * s;
      const lean = 10 * s;

      ctx.save();
      ctx.translate(this.x, this.baseY);

      // Tronco (curva) con anillos
      ctx.strokeStyle = '#c08d55';
      ctx.lineWidth = 13 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-lean * 0.4, 0);
      ctx.quadraticCurveTo(lean, -trunkH * 0.55, sway * 60 + lean * 0.6, -trunkH);
      ctx.stroke();

      // Anillos del tronco
      ctx.strokeStyle = 'rgba(150,100,55,0.5)';
      ctx.lineWidth = 2.5 * s;
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        const yy = -trunkH * t * t;
        const xx = MathUtils.lerp(-lean * 0.4, sway * 60 + lean * 0.6, t);
        ctx.beginPath();
        ctx.moveTo(xx - 9 * s, yy);
        ctx.quadraticCurveTo(xx, yy - 4 * s, xx + 9 * s, yy);
        ctx.stroke();
      }

      // Copa
      ctx.translate(sway * 60 + lean * 0.6, -trunkH);
      ctx.rotate(sway * 2.2);

      // Coco
      if (this.hasCoconuts) {
        ctx.fillStyle = '#a5713f';
        ctx.beginPath();
        ctx.arc(0, 2 * s, 9 * s, 0, MathUtils.TAU);
        ctx.arc(10 * s, 4 * s, 8 * s, 0, MathUtils.TAU);
        ctx.arc(-9 * s, 5 * s, 8 * s, 0, MathUtils.TAU);
        ctx.fill();
      }

      // Hojas (frondas) con hojuelas
      const greens = ['#7cc47f', '#63b46a', '#8fd08c', '#5aa85f'];
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.25 + (i / 6) * Math.PI * 0.5 + Math.sin(time * 0.9 + this.phase + i) * 0.04;
        const len = (74 + Math.sin(i * 2.1) * 10) * s;
        ctx.save();
        ctx.rotate(a);
        ctx.strokeStyle = greens[i % greens.length];
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.45, -len * 0.4, len, -len * 0.12);
        ctx.stroke();
        // Hojuelas a lo largo
        ctx.lineWidth = 3 * s;
        for (let f = 0; f < 4; f++) {
          const t = 0.25 + f * 0.2;
          const px = len * t * t;
          const py = -len * 0.4 * Math.sin(t * Math.PI) * 1.2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px + 10 * s, py - 5 * s, px + 18 * s, py - 2 * s);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
   * Flower — flor pastel
   * ---------------------------------------------------------- */
  class Flower {
    constructor(x, y, scale = 1, color, phase = 0) {
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.color = color || MathUtils.choice(['#ff8c94', '#ffd166', '#f9a8d4', '#cdb4db', '#fff0c2']);
      this.phase = phase;
    }

    draw(ctx, time) {
      const s = this.scale;
      const bob = Math.sin(time * 1.2 + this.phase) * 1.5;
      ctx.save();
      ctx.translate(this.x, this.y + bob);
      // Tallo
      ctx.strokeStyle = '#7cb56a';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, 6 * s);
      ctx.lineTo(0, 16 * s);
      ctx.stroke();
      // Hoja del tallo
      ctx.fillStyle = '#8fca7c';
      ctx.beginPath();
      ctx.ellipse(4 * s, 12 * s, 4 * s, 2 * s, 0.5, 0, MathUtils.TAU);
      ctx.fill();
      // Pétalos
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * MathUtils.TAU + time * 0.2;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 5 * s, Math.sin(a) * 5 * s, 4 * s, 3 * s, a, 0, MathUtils.TAU);
        ctx.fill();
      }
      // Centro
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 3 * s, 0, MathUtils.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
   * Rock — roca redondeada
   * ---------------------------------------------------------- */
  class Rock {
    constructor(x, y, scale = 1, color) {
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.color = color || MathUtils.choice(['#d8cdc0', '#cfc3c4', '#e0d5c8']);
      this.seed = MathUtils.rand(0, 100);
    }

    draw(ctx) {
      const s = this.scale;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = this.color;
      ctx.strokeStyle = Color.shade(this.color, -22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20 * s, 4 * s);
      ctx.quadraticCurveTo(-22 * s, -8 * s, -10 * s, -12 * s);
      ctx.quadraticCurveTo(-2 * s, -18 * s, 8 * s, -10 * s);
      ctx.quadraticCurveTo(20 * s, -8 * s, 18 * s, 4 * s);
      ctx.quadraticCurveTo(6 * s, 10 * s, -20 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      // Sombras internas
      ctx.fillStyle = 'rgba(120,100,90,0.15)';
      ctx.beginPath();
      ctx.ellipse(2 * s, 2 * s, 10 * s, 5 * s, 0.2, 0, MathUtils.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ----------------------------------------------------------
   * Scene — contenedor del escenario
   * ---------------------------------------------------------- */
  class Scene {
    constructor(levelData, worldW) {
      this.levelData = levelData;
      this.worldW = worldW;
      this.time = 0;

      // Paleta por nivel (con valores por defecto pastel Caribe)
      const palette = Object.assign({
        skyTop: '#ffdbe9',
        skyBottom: '#dff0ff',
        seaDeep: '#7fd0ee',
        seaShallow: '#b9e6f6',
        sandLight: '#fff6dd',
        sandDark: '#ffd9a6',
        sun: '#ffe9a8'
      }, levelData.palette || {});

      this.palette = palette;
      this.sunPosition = new Vec2(levelData.sunX ?? 1050, levelData.sunY ?? 120);

      // Nubes
      this.clouds = [];
      const cloudColors = ['#ffffff', '#fff6fb', '#fdf0fa'];
      for (let i = 0; i < 6; i++) {
        this.clouds.push(new Cloud(
          MathUtils.rand(0, worldW + 400),
          MathUtils.rand(40, 300),
          MathUtils.rand(0.7, 1.6),
          MathUtils.rand(4, 12),
          MathUtils.rand(0.45, 0.85),
          cloudColors[i % cloudColors.length]
        ));
      }

      // Palmeras de fondo
      this.palms = [];
      for (const d of levelData.decorations || []) {
        if (d.type === 'palm') {
          this.palms.push(new Palm(d.x, d.y ?? LAYOUT.GROUND_Y + 4, d.scale ?? 1, MathUtils.rand(0, MathUtils.TAU)));
        }
      }
      // Palmeras por defecto si no hay
      if (this.palms.length === 0) {
        this.palms.push(new Palm(160, LAYOUT.GROUND_Y + 4, 1.05, 0.3));
        this.palms.push(new Palm(worldW - 140, LAYOUT.GROUND_Y + 4, 1.2, 2.1));
      }

      // Flores y rocas de frente
      this.flowers = [];
      this.rocks = [];
      for (const d of levelData.decorations || []) {
        if (d.type === 'flower') this.flowers.push(new Flower(d.x, d.y, d.scale ?? 1, d.color));
        if (d.type === 'rock') this.rocks.push(new Rock(d.x, d.y, d.scale ?? 1, d.color));
      }

      // Motas de arena (semilla fija → siempre iguales)
      this.sandSpecks = [];
      let seed = levelData.seed || 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 90; i++) {
        this.sandSpecks.push({
          x: rnd() * worldW,
          y: LAYOUT.SAND_TOP + 12 + rnd() * (LAYOUT.WORLD_H - LAYOUT.SAND_TOP - 20),
          r: 1 + rnd() * 2.4,
          a: 0.08 + rnd() * 0.14
        });
      }

      // Motas en profundidad: rellenan la arena que se ve al jugar en
      // vertical (o en pantallas muy anchas), donde el viewport muestra
      // hasta ~3200 px de mundo por debajo de la playa.
      this.deepSpecks = [];
      for (let i = 0; i < 80; i++) {
        this.deepSpecks.push({
          x: rnd() * worldW,
          y: LAYOUT.SAND_TOP + 60 + rnd() * 2000,
          r: 1.4 + rnd() * 2.8,
          a: 0.06 + rnd() * 0.12
        });
      }

      // Resortera
      const sling = levelData.slingshot || { x: 220, y: LAYOUT.GROUND_Y };
      this.slingshot = {
        x: sling.x,
        y: sling.y,
        anchorL: new Vec2(sling.x - 20, sling.y - 118),
        anchorR: new Vec2(sling.x + 20, sling.y - 118),
        restPoint: new Vec2(sling.x + 30, sling.y - 96)
      };

      this.islandPhase = MathUtils.rand(0, MathUtils.TAU);
    }

    update(dt) {
      this.time += dt;
      // Deriva de nubes
      for (const c of this.clouds) {
        c.x += c.speed * dt;
        if (c.x > this.worldW + 250) c.x = -250;
      }
    }

    /* ---------- Cielo ---------- */
    drawSky(ctx) {
      const g = ctx.createLinearGradient(0, -300, 0, LAYOUT.HORIZON + 60);
      g.addColorStop(0, this.palette.skyTop);
      g.addColorStop(1, this.palette.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(-300, -300, this.worldW + 600, LAYOUT.HORIZON + 360);

      // Sol
      const sx = this.sunPosition.x;
      const sy = this.sunPosition.y;
      const pulse = 1 + Math.sin(this.time * 0.8) * 0.02;
      ctx.fillStyle = this.palette.sun;
      ctx.beginPath();
      ctx.arc(sx, sy, 46 * pulse, 0, MathUtils.TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(sx - 12, sy - 12, 10, 0, MathUtils.TAU);
      ctx.fill();
    }

    drawClouds(ctx) {
      for (const c of this.clouds) c.draw(ctx, this.time);
    }

    /* ---------- Mar ---------- */
    drawSea(ctx) {
      const t = this.time;
      // Cuerpo de agua
      const g = ctx.createLinearGradient(0, LAYOUT.HORIZON, 0, LAYOUT.WORLD_H + 60);
      g.addColorStop(0, this.palette.seaShallow);
      g.addColorStop(1, this.palette.seaDeep);
      ctx.fillStyle = g;
      ctx.fillRect(-300, LAYOUT.HORIZON, this.worldW + 600, LAYOUT.WORLD_H + 60 - LAYOUT.HORIZON);

      // Isla lejana (silueta Corn Island)
      const ix = this.worldW * 0.58;
      ctx.fillStyle = 'rgba(160,200,160,0.5)';
      ctx.beginPath();
      ctx.ellipse(ix, LAYOUT.HORIZON + 6, 130, 34, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,180,140,0.55)';
      ctx.beginPath();
      ctx.ellipse(ix + 20, LAYOUT.HORIZON + 4, 60, 20, 0, Math.PI, 0);
      ctx.fill();

      // Olas: bandas sinusoidales con amplitud creciente hacia el frente
      for (let layer = 0; layer < 3; layer++) {
        const yBase = LAYOUT.HORIZON + 30 + layer * 52;
        const amp = 5 + layer * 4;
        const speed = 1.1 + layer * 0.5;
        ctx.strokeStyle = Color.alpha('#ffffff', 0.28 - layer * 0.06);
        ctx.lineWidth = 2.2 - layer * 0.4;
        ctx.beginPath();
        for (let x = -20; x <= this.worldW + 20; x += 14) {
          const y = yBase + Math.sin(x * 0.012 + t * speed + layer * 2.2) * amp
            + Math.sin(x * 0.03 - t * 0.8) * amp * 0.3;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Espuma de la marea (línea de rompiente)
      const foamY = LAYOUT.WATERLINE + Math.sin(t * 0.9) * 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      for (let x = -30; x <= this.worldW + 30; x += 10) {
        const y = foamY + Math.sin(x * 0.02 + t * 1.6) * 5 + Math.sin(x * 0.05 - t * 2.2) * 2;
        if (x === -30) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    /* ---------- Arena ---------- */
    drawSand(ctx) {
      const g = ctx.createLinearGradient(0, LAYOUT.SAND_TOP - 8, 0, LAYOUT.WORLD_H + 40);
      g.addColorStop(0, this.palette.sandLight);
      g.addColorStop(1, this.palette.sandDark);
      // El relleno se extiende hasta ~3200 px de profundidad para llenar
      // la pantalla en orientación vertical (ver Camera.resize).
      ctx.fillStyle = g;
      ctx.fillRect(-300, LAYOUT.SAND_TOP, this.worldW + 600, 3200);

      // Motas de arena (banda de juego + profundidad)
      ctx.fillStyle = 'rgba(150,110,60,0.5)';
      for (const s of this.sandSpecks) {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, MathUtils.TAU);
        ctx.fill();
      }
      for (const s of this.deepSpecks) {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, MathUtils.TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Franja de arena húmeda cerca del agua
      const wetY = LAYOUT.WATERLINE + Math.sin(this.time * 0.9) * 4;
      const wetG = ctx.createLinearGradient(0, wetY - 6, 0, wetY + 34);
      wetG.addColorStop(0, 'rgba(196,164,120,0)');
      wetG.addColorStop(0.35, 'rgba(196,164,120,0.45)');
      wetG.addColorStop(1, 'rgba(196,164,120,0)');
      ctx.fillStyle = wetG;
      ctx.fillRect(-300, wetY - 8, this.worldW + 600, 44);
    }

    /* ---------- Decoración ---------- */
    drawBackgroundDecor(ctx) {
      for (const p of this.palms) p.draw(ctx, this.time);
    }

    drawForegroundDecor(ctx) {
      for (const f of this.flowers) f.draw(ctx, this.time);
      for (const r of this.rocks) r.draw(ctx);
    }

    /* ---------- Resortera ---------- */
    /**
     * Dibuja la parte trasera (poste + goma trasera).
     * @param {Vec2|null} hold Posición de la rana sujetada (o null = reposo)
     */
    drawSlingshotBack(ctx, hold) {
      const s = this.slingshot;
      ctx.save();

      // Poste
      ctx.fillStyle = '#a5713f';
      ctx.strokeStyle = '#8a5a2c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 22, s.y + 2);
      ctx.lineTo(s.x - 8, s.y - 128);
      ctx.lineTo(s.x + 8, s.y - 128);
      ctx.lineTo(s.x + 22, s.y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Goma trasera (anchor izquierdo → rana)
      const frog = hold || s.restPoint;
      ctx.strokeStyle = '#7a4a2b';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.anchorL.x, s.anchorL.y);
      ctx.quadraticCurveTo(
        (s.anchorL.x + frog.x) / 2 - 6,
        (s.anchorL.y + frog.y) / 2 + 4,
        frog.x, frog.y + 8
      );
      ctx.stroke();

      ctx.restore();
    }

    /** Dibuja la parte delantera (goma delantera sobre la rana). */
    drawSlingshotFront(ctx, hold) {
      const s = this.slingshot;
      const frog = hold || s.restPoint;
      ctx.save();
      ctx.strokeStyle = '#7a4a2b';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.anchorR.x, s.anchorR.y);
      ctx.quadraticCurveTo(
        (s.anchorR.x + frog.x) / 2 + 6,
        (s.anchorR.y + frog.y) / 2 + 4,
        frog.x, frog.y + 8
      );
      ctx.stroke();
      ctx.restore();
    }

    /** Trazo del hueco de la horquilla (detalle). */
    drawSlingshotForkDetail(ctx) {
      const s = this.slingshot;
      ctx.save();
      ctx.strokeStyle = '#8a5a2c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 10, s.y - 120);
      ctx.quadraticCurveTo(s.x, s.y - 110, s.x + 10, s.y - 120);
      ctx.stroke();
      ctx.restore();
    }
  }

  NS.Scene = { Scene, LAYOUT };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
