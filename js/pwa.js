/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/pwa.js
 * ------------------------------------------------------------
 * Registro del Service Worker para PWA (instalación en pantalla
 * de inicio, uso offline, actualización automática).
 * Solo actúa en contextos seguros (https / localhost); en file://
 * o en el harness de test simplemente no hace nada.
 * ============================================================ */
(function (global) {
  'use strict';

  function register() {
    if (!('serviceWorker' in global.navigator)) return;
    if (!global.location || !/^https?:$/.test(global.location.protocol || '')) return;

    global.addEventListener('load', () => {
      global.navigator.serviceWorker.register('sw.js').catch((err) => {
        if (global.console) console.warn('Service worker no registrado:', err);
      });
    });
  }

  register();
})(typeof window !== 'undefined' ? window : globalThis);
