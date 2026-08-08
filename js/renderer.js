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
      const { scene, entities, particles, lighting, trail } = world;

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

      // Halo de la rana en vuelo: la hace resaltar sobre arena/mar
      this._drawFrogHalo(ctx, world.activeFrog);

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

      // Estela de vuelo de la rana (detrás de la trayectoria prevista)
      this._drawTrail(ctx, trail);

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

    /**
     * Puntos de la trayectoria prevista mientras se apunta.
     * Visibles: puntos con borde oscuro (contraste sobre arena y mar)
     * y una rana fantasma en el punto de caída previsto.
     */
    _drawTrajectory(ctx, trajectory) {
      if (!trajectory || trajectory.length === 0) return;
      ctx.save();
      ctx.lineJoin = 'round';
      for (let i = 0; i < trajectory.length; i++) {
        const p = trajectory[i];
        const t = i / trajectory.length;
        const fade = 1 - t;
        const r = 5.5 * fade + 1.8;
        ctx.globalAlpha = 0.95 * fade;
        // Borde oscuro (contorno) para que se vea sobre cualquier fondo
        ctx.strokeStyle = 'rgba(50,90,60,0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        // Relleno pastel alternando blanco/verde
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#ffd166';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r - 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rana fantasma en el punto de aterrizaje previsto
      const end = trajectory[trajectory.length - 1];
      if (end) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#8fd05f';
        ctx.beginPath();
        ctx.arc(end.x, end.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#4c8c38';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Ojitos de la rana fantasma
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(end.x - 4.5, end.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(end.x + 4.5, end.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#26261f';
        ctx.beginPath();
        ctx.arc(end.x - 4.5, end.y - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(end.x + 4.5, end.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /**
     * Halo pulsante alrededor de la rana en vuelo: hace visible la bolita
     * sobre arena/mar aunque la estela se funda con el fondo. Se dibuja
     * debajo de la entidad para no tapar sus detalles.
     */
    _drawFrogHalo(ctx, frog) {
      if (!frog || !frog.getWorldCenter) return;
      const p = frog.getWorldCenter();
      const pulse = 0.5 + 0.5 * Math.sin(frog.time * 9);
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.14 * pulse;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#8fd05f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /**
     * Estela de vuelo: puntos que la rana dejó atrás mientras vuela,
     * se desvanecen de más viejos (transparentes) a más nuevos.
     */
    _drawTrail(ctx, trail) {
      if (!trail || trail.length < 2) return;
      ctx.save();
      const n = trail.length;
      for (let i = 0; i < n; i++) {
        const p = trail[i];
        const t = i / n;
        const fade = t * t; // los más recientes destacan
        ctx.globalAlpha = 0.65 * fade;
        ctx.fillStyle = i % 2 === 0 ? '#8fd05f' : '#ffffff';
        const r = 3 + 4 * fade;
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
