/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/lighting.js
 * ------------------------------------------------------------
 * Iluminación y ambiente (toda vectorial, sin imágenes):
 *   - Resplandor del sol (glow radial)
 *   - Brillo cálido general (color grading suave)
 *   - Viñeta suave
 *   - Sombras suaves bajo los cuerpos
 *   - Destellos de luz sobre el mar
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils, Color } = NS.Utils;

  class Lighting {
    /**
     * @param {object} opts
     * @param {Vec2}   opts.sunPosition  Posición del sol (mundo)
     * @param {string} opts.sunColor     Color del resplandor
     */
    constructor(opts = {}) {
      this.sunPosition = opts.sunPosition || new Vec2(1050, 120);
      this.sunColor = opts.sunColor || '#ffe9a8';
      this.vignetteStrength = 0.28;
      this.warmTint = 0.06;
      this.showSunGlow = true;
    }

    /**
     * Sombras suaves bajo los cuerpos. Se dibuja ANTES de los
     * cuerpos para que queden debajo.
     */
    drawShadows(ctx, camera, bodies, dt) {
      for (const body of bodies) {
        if (!body.active) continue;
        const c = body.getWorldCenter();
        if (!camera.isVisible(c, 120)) continue;

        const w = body.aabb.width * 0.9;
        const h = body.aabb.height * 0.32;
        // La sombra se proyecta hacia abajo según la altura
        const g = ctx.createRadialGradient(c.x, c.y + h * 0.4, 0, c.x, c.y + h * 0.4, Math.max(w, 8));
        g.addColorStop(0, 'rgba(60,40,20,0.18)');
        g.addColorStop(1, 'rgba(60,40,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + h * 0.4, w / 2, h / 2, 0, 0, MathUtils.TAU);
        ctx.fill();
      }
    }

    /** Resplandor del sol + viñeta + tinte cálido (post-escena). */
    draw(ctx, camera, screenW, screenH, time) {
      const scale = camera.scale * camera.zoom;
      const sun = camera.worldToScreen(this.sunPosition);

      // Resplandor del sol
      if (this.showSunGlow) {
        const pulse = 1 + Math.sin(time * 0.7) * 0.04;
        const r = 340 * pulse * (scale / Math.max(camera.scale, 0.5));
        const g = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, r);
        g.addColorStop(0, 'rgba(255,236,170,0.55)');
        g.addColorStop(0.4, 'rgba(255,224,150,0.18)');
        g.addColorStop(1, 'rgba(255,224,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sun.x - r, sun.y - r, r * 2, r * 2);
      }

      // Tinte cálido (screen-space)
      ctx.fillStyle = `rgba(255,196,130,${this.warmTint})`;
      ctx.fillRect(0, 0, screenW, screenH);

      // Viñeta
      const v = ctx.createRadialGradient(
        screenW / 2, screenH / 2, Math.min(screenW, screenH) * 0.45,
        screenW / 2, screenH / 2, Math.max(screenW, screenH) * 0.75
      );
      v.addColorStop(0, 'rgba(30,20,60,0)');
      v.addColorStop(1, `rgba(30,20,60,${this.vignetteStrength})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, screenW, screenH);
    }

    /** Destellos brillantes sobre el mar (screen-space, sutiles). */
    drawWaterGlints(ctx, camera, screenW, screenH, time) {
      const glintCount = 14;
      for (let i = 0; i < glintCount; i++) {
        const px = ((i * 137.5 + time * 14 * (i % 3 + 1)) % (screenW + 200)) - 100;
        const py = screenH * 0.62 + Math.sin(time * 1.3 + i * 1.7) * 14;
        const tw = 1 + Math.sin(time * 2.1 + i) * 0.5;
        if (tw < 0.2) continue;
        ctx.strokeStyle = `rgba(255,255,240,${0.25 * tw})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 16 * tw, py + 3);
        ctx.stroke();
      }
    }
  }

  NS.Lighting = { Lighting };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
