/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/input.js
 * ------------------------------------------------------------
 * INPUT — ratón + táctil unificados (Pointer Events) y teclado.
 *
 * Traduce las coordenadas de pantalla a coordenadas del mundo
 * a través de la cámara, y notifica al motor:
 *   - onDragStart / onDragMove / onDragEnd  (resortera)
 *   - onTap      (toques simples para UI/menús)
 *   - onKey      (atajos de teclado)
 *
 * También desbloquea el audio en el primer gesto del usuario.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2 } = NS.Utils;

  class InputManager {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Camera} camera
     */
    constructor(canvas, camera) {
      this.canvas = canvas;
      this.camera = camera;
      this.enabled = true;
      this.dragging = false;
      this.pointerId = null;
      this.lastScreen = new Vec2();
      this.lastWorld = new Vec2();

      // Callbacks
      this.onDragStart = null;
      this.onDragMove = null;
      this.onDragEnd = null;
      this.onTap = null;
      this.onAnyInput = null; // para desbloquear audio

      this._bindEvents();
    }

    _bindEvents() {
      const c = this.canvas;

      c.addEventListener('pointerdown', (e) => this._onPointerDown(e), { passive: false });
      c.addEventListener('pointermove', (e) => this._onPointerMove(e), { passive: false });
      window.addEventListener('pointerup', (e) => this._onPointerUp(e), { passive: false });
      window.addEventListener('pointercancel', (e) => this._onPointerUp(e), { passive: false });
      c.addEventListener('contextmenu', (e) => e.preventDefault());

      window.addEventListener('keydown', (e) => {
        if (this.onKey) this.onKey(e.key, e);
      });
    }

    /** Posición del evento en pantalla (CSS px). */
    _screenPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return new Vec2(e.clientX - rect.left, e.clientY - rect.top);
    }

    _notifyInput() {
      if (this.onAnyInput) this.onAnyInput();
    }

    _onPointerDown(e) {
      if (!this.enabled) return;
      this._notifyInput();
      this.pointerId = e.pointerId;
      this.lastScreen = this._screenPos(e);
      this.lastWorld = this.camera.screenToWorld(this.lastScreen);
      this.dragging = true;
      if (this.onDragStart) this.onDragStart(this.lastWorld.clone());
    }

    _onPointerMove(e) {
      if (!this.enabled) return;
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
      this.lastScreen = this._screenPos(e);
      this.lastWorld = this.camera.screenToWorld(this.lastScreen);
      if (this.dragging) {
        if (this.onDragMove) this.onDragMove(this.lastWorld.clone());
      }
    }

    _onPointerUp(e) {
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
      this._notifyInput();
      if (this.dragging) {
        this.dragging = false;
        if (this.onDragEnd) this.onDragEnd(this.lastWorld.clone());
      }
      this.pointerId = null;
    }

    /** Bloquea/desbloquea la entrada del canvas (para menús). */
    setEnabled(enabled) {
      this.enabled = enabled;
      if (!enabled) {
        this.dragging = false;
        this.pointerId = null;
      }
    }
  }

  NS.Input = { InputManager };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
