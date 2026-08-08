/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/game.js
 * ------------------------------------------------------------
 * BOOTSTRAP — crea el canvas y arranca el motor cuando el DOM
 * está listo. Único punto de entrada del juego.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Engine } = NS.Engine;

  function boot() {
    // El canvas ya existe en index.html; si no, lo creamos.
    let canvas = document.getElementById('game');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game';
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    // Soporte básico de Canvas 2D
    if (!canvas.getContext || !canvas.getContext('2d')) {
      document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif">Tu navegador no soporta Canvas. Usa un navegador moderno 😢</div>';
      return;
    }

    NS.EngineInstance = new Engine({ canvas });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
