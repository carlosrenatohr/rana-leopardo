/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/renderer.js
 * ------------------------------------------------------------
 * RENDERER — orquesta el pipeline de dibujo:
 *
 *   1. Cielo + sol + nubes            (scene)
 *   2. Mar + arena + decoración fondo (scene)
 *   3. Sombras bajo los cuerpos       (lighting)
 *   4. Resortera (parte trasera)      (scene)
 *   5. Entidades (cuerpos físicos)
 *   6. Resortera (goma delantera)     (scene)
 *   7. Decoración de frente + puntos de trayectoria
 *   8. Partículas
 *   9. Post-efectos (resplandor, viñeta, destellos) — lighting
 *
 * Respeto a devicePixelRatio para nitidez en pantallas retina.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});

  class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Camera} camera
     */
    constructor(canvas, camera) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.camera = camera;
      this.dpr = 1;
      this.cssW = 0;
      this.cssH = 0;
    }

    /** Ajusta el tamaño del canvas (físico y CSS) al viewport. */
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cssW = window.innerWidth;
      this.cssH = window.innerHeight;
      this.canvas.width = Math.floor(this.cssW * this.dpr);
      this.canvas.height = Math.floor(this.cssH * this.dpr);
      this.canvas.style.width = this.cssW + 'px';
      this.canvas.style.height = this.cssH + 'px';
      this.camera.resize(this.cssW, this.cssH);
    }

    /**
     * Dibuja un frame completo.
     * @param {object} world Vista del mundo:
     *   scene, entities, particles, lighting, heldFrog, trajectory, waterLine
     */
    draw(world) {
      const { ctx, camera } = this;
      const { scene, entities, particles, lighting } = world;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      // ---- Espacio de mundo (transformado por la cámara) ----
      const s = camera.apply(ctx, this.dpr);
      void s;

      // Cielo, nubes, mar, arena y decoración de fondo
      scene.drawSky(ctx);
      scene.drawClouds(ctx);
      scene.drawSea(ctx);
      scene.drawSand(ctx);
      scene.drawBackgroundDecor(ctx);

      // Sombras bajo los cuerpos
      lighting.drawShadows(ctx, camera, entities, 1 / 60);

      // Resortera (trasera) + goma trasera
      scene.drawSlingshotBack(ctx, world.holdPosition || null);

      // Entidades físicas
      for (const entity of entities) {
        if (!entity.active || entity.dead) continue;
        if (!camera.isVisible(entity.getWorldCenter())) continue;
        entity.draw(ctx, camera);
      }

      // Rana sujetada (si la hay) — dibujada entre goma trasera y delantera
      if (world.heldFrog) {
        world.heldFrog.draw(ctx, camera);
      }

      // Goma delantera + detalle de horquilla
      scene.drawSlingshotFront(ctx, world.holdPosition || null);
      scene.drawSlingshotForkDetail(ctx);

      // Puntos de trayectoria (preview)
      this._drawTrajectory(ctx, world.trajectory);

      // Decoración de frente (flores, rocas)
      scene.drawForegroundDecor(ctx);

      // Partículas (espacio de mundo)
      particles.draw(ctx);

      // ---- Espacio de pantalla (post-efectos) ----
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      lighting.draw(ctx, camera, this.cssW, this.cssH, scene.time);
      lighting.drawWaterGlints(ctx, camera, this.cssW, this.cssH, scene.time);
    }

    /** Puntos de la trayectoria prevista mientras se apunta. */
    _drawTrajectory(ctx, trajectory) {
      if (!trajectory || trajectory.length === 0) return;
      ctx.save();
      for (let i = 0; i < trajectory.length; i++) {
        const p = trajectory[i];
        const fade = 1 - i / trajectory.length;
        ctx.globalAlpha = 0.75 * fade;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(120,200,160,0.85)';
        const r = 3.2 * fade + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  NS.Renderer = { Renderer };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
