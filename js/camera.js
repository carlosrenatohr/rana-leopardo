/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/camera.js
 * ------------------------------------------------------------
 * Cámara 2D: sigue al objetivo con suavizado y anticipación,
 * soporta zoom responsivo (diseño 1280×720), vibración (shake)
 * y límites por nivel.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils } = NS.Utils;

  class Camera {
    /**
     * @param {number} viewW Ancho de diseño (mundo) — 1280
     * @param {number} viewH Alto de diseño (mundo) — 720
     */
    constructor(viewW = 1280, viewH = 720) {
      this.viewW = viewW;
      this.viewH = viewH;

      // Posición = esquina superior-izquierda del viewport en el mundo
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;

      // Escala final (pantalla → mundo), sin contar devicePixelRatio
      this.scale = 1;

      // Límites del mundo
      this.bounds = { minX: 0, maxX: 2400, minY: 0, maxY: 720 };

      // Seguimiento
      this.followBody = null;
      this.lookAhead = new Vec2(260, -40);
      this.followLerp = 6; // velocidad de interpolación (1/s)

      // Vibración
      this.shake = 0;
      this.shakeDecay = 2.2;

      // Zoom
      this.zoom = 1;
      this.targetZoom = 1;

      // Dimensiones reales del mundo visibles en pantalla (px de mundo).
      // Se actualizan en resize() y las usan follow/clamp/culling, que
      // antes usaban el ancho de diseño (1280) y desacoplaban el
      // seguimiento del viewport real en orientación vertical.
      this.visibleW = viewW;
      this.visibleH = viewH;
    }

    /** Se llama al redimensionar la ventana. */
    resize(screenW, screenH) {
      // Cámara RESPONSIVE sobre el diseño de referencia 1280×720:
      //  · Horizontal (ancho ≥ alto): se cubre la pantalla — la escala
      //    mínima que deja entrar ancho Y alto de diseño. Es el
      //    comportamiento original, intacto.
      //  · Vertical (ancho < alto): zoom-out hasta mostrar una franja de
      //    juego de ~640 px de mundo en horizontal (en vez del recorte
      //    estrecho de ~330 px que daría "cubrir"). El fondo del
      //    escenario se dibuja hasta ~3200 px de profundidad (ver
      //    Scene.drawSand en js/scene.js), así que se limita el zoom-out
      //    para no mostrar más alto que eso. Si cambias el 3200, cambia
      //    también el relleno de arena del escenario.
      const aspect = screenW / screenH;
      if (aspect >= 1) {
        this.scale = Math.max(screenW / this.viewW, screenH / this.viewH);
      } else {
        this.scale = screenW / 640;
        this.scale = Math.max(this.scale, screenH / 3200);
      }
      // Dimensiones reales del viewport en el mundo
      this.visibleW = screenW / this.scale;
      this.visibleH = screenH / this.scale;
      return this;
    }

    setBounds(minX, maxX, minY = 0, maxY = 720) {
      this.bounds.minX = minX;
      this.bounds.maxX = maxX;
      this.bounds.minY = minY;
      this.bounds.maxY = maxY;
    }

    setZoom(z) {
      this.targetZoom = z;
    }

    follow(body) {
      this.followBody = body;
    }

    stopFollow() {
      this.followBody = null;
    }

    /**
     * Reinicia la cámara al origen (menú, reinicio o cambio de nivel).
     * Importante: también resetea targetX/targetY, porque update()
     * interpola x/y hacia esos objetivos cada frame — si no, la cámara
     * "volvía" a la posición de la torre al reiniciar.
     */
    reset() {
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.followBody = null;
      this.zoom = 1;
      this.targetZoom = 1;
      this.shake = 0;
      return this;
    }

    /** Centro del viewport en el mundo. */
    get center() {
      return new Vec2(
        this.x + this.visibleW / (2 * this.zoom),
        this.y + this.visibleH / (2 * this.zoom)
      );
    }

    addShake(amount) {
      this.shake = Math.min(this.shake + amount, 40);
    }

    update(dt) {
      // Zoom suave
      this.zoom = MathUtils.lerp(this.zoom, this.targetZoom, Math.min(1, dt * 4));

      // Dimensiones reales del viewport en el mundo (con zoom aplicado)
      const viewW = this.visibleW / this.zoom;
      const viewH = this.visibleH / this.zoom;

      // Seguimiento del objetivo con anticipación
      if (this.followBody) {
        const c = this.followBody.getWorldCenter();
        const vx = this.followBody.velocity.x * 0.4;
        const vy = this.followBody.velocity.y * 0.15;
        this.targetX = c.x - viewW * 0.4 + this.lookAhead.x * 0.35 + vx;
        this.targetY = c.y - viewH * 0.5 + this.lookAhead.y + vy;
      }

      // Interpolación crítica del punto de vista
      const k = 1 - Math.exp(-this.followLerp * dt);
      this.x = MathUtils.lerp(this.x, this.targetX, k);
      this.y = MathUtils.lerp(this.y, this.targetY, k);

      // Clampear a los límites del nivel
      const maxX = Math.max(this.bounds.minX, this.bounds.maxX - viewW);
      const maxY = Math.max(this.bounds.minY, this.bounds.maxY - viewH);
      this.x = MathUtils.clamp(this.x, this.bounds.minX, maxX);
      this.y = MathUtils.clamp(this.y, this.bounds.minY, maxY);

      // Vibración
      if (this.shake > 0.05) {
        this.shake *= Math.exp(-this.shakeDecay * dt);
      } else {
        this.shake = 0;
      }
    }

    /** Aplica la transformación de la cámara al contexto. */
    apply(ctx, dpr = 1) {
      const s = this.scale * this.zoom * dpr;
      const sx = this.shake > 0 ? MathUtils.rand(-1, 1) * this.shake : 0;
      const sy = this.shake > 0 ? MathUtils.rand(-1, 1) * this.shake : 0;
      ctx.setTransform(s, 0, 0, s, -this.x * s + sx, -this.y * s + sy);
      return s;
    }

    worldToScreen(p) {
      return new Vec2((p.x - this.x) * this.scale * this.zoom, (p.y - this.y) * this.scale * this.zoom);
    }

    screenToWorld(p) {
      return new Vec2(
        p.x / (this.scale * this.zoom) + this.x,
        p.y / (this.scale * this.zoom) + this.y
      );
    }

    /** ¿Está visible un punto/AABB en el viewport actual? */
    isVisible(point, margin = 80) {
      const vw = this.visibleW / this.zoom;
      const vh = this.visibleH / this.zoom;
      return (
        point.x > this.x - margin &&
        point.x < this.x + vw + margin &&
        point.y > this.y - margin &&
        point.y < this.y + vh + margin
      );
    }
  }

  NS.Camera = { Camera };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
