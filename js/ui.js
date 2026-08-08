/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/ui.js
 * ------------------------------------------------------------
 * UI (DOM) — HUD, menú principal, selector de niveles,
 * overlays de victoria/derrota, hint de rotación y toasts.
 *
 * Los estilos viven en style.css; aquí solo se construye el
 * DOM con clases semánticas y se enrutan los eventos al motor.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});

  /** SVG inline de la rana leopardo (reutilizado en HUD/menú). */
  function frogIconSVG(size = 40, spot = false) {
    const s = size;
    return `
    <svg class="frog-icon" width="${s}" height="${s * 0.92}" viewBox="0 0 60 55" aria-hidden="true">
      <ellipse cx="30" cy="30" rx="27" ry="24" fill="#8fd05f" stroke="#5f9e42" stroke-width="2"/>
      <ellipse cx="30" cy="38" rx="16" ry="12" fill="#fdf6dd"/>
      ${spot ? `
      <ellipse cx="20" cy="20" rx="5" ry="3.4" fill="#2e5a2e" opacity="0.55"/>
      <ellipse cx="34" cy="16" rx="4.4" ry="3" fill="#2e5a2e" opacity="0.55"/>
      <ellipse cx="40" cy="26" rx="4" ry="2.8" fill="#2e5a2e" opacity="0.55"/>` : ''}
      <circle cx="20" cy="17" r="7" fill="#fff"/>
      <circle cx="40" cy="17" r="7" fill="#fff"/>
      <circle cx="21" cy="18" r="3.4" fill="#26261f"/>
      <circle cx="39" cy="18" r="3.4" fill="#26261f"/>
      <circle cx="20" cy="16" r="1.2" fill="#fff"/>
      <circle cx="38" cy="16" r="1.2" fill="#fff"/>
      <path d="M24 38 Q30 42 36 38" stroke="#2e5a2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="15" cy="33" r="3" fill="#ffb3c1" opacity="0.7"/>
      <circle cx="45" cy="33" r="3" fill="#ffb3c1" opacity="0.7"/>
    </svg>`;
  }

  class UIManager {
    /**
     * @param {object} engine Referencia al motor (callbacks)
     */
    constructor(engine) {
      this.engine = engine;
      this.root = null;
      this.levelCount = 6;

      // Nodos de referencia
      this.hud = null;
      this.menu = null;
      this.overlay = null;
      this.toast = null;
      this.rotateHint = null;

      this._build();
    }

    /* ================== CONSTRUCCIÓN ================== */

    _build() {
      const root = document.createElement('div');
      root.id = 'ui-root';
      root.innerHTML = `
        <!-- HUD -->
        <div class="hud" id="hud" hidden>
          <div class="hud-top">
            <div class="chip level-chip"><span class="chip-label">Nivel</span><span class="chip-value" id="hud-level">1</span></div>
            <div class="hud-center">
              <div class="score-box">
                <span class="score-icon">✦</span>
                <span class="score-value" id="hud-score">0</span>
              </div>
              <div class="stars" id="hud-stars"></div>
              <div class="hud-best" id="hud-best"></div>
              <div class="hud-goal" id="hud-goal"></div>
            </div>
            <div class="hud-right">
              <div class="frogs-left" id="hud-frogs"></div>
              <button class="icon-btn" id="btn-sound" title="Sonido" aria-label="Sonido">🔊</button>
            </div>
          </div>
          <div class="hud-bottom">
            <button class="btn btn-ghost" id="btn-restart">↻ Reiniciar</button>
            <button class="btn btn-primary" id="btn-next" disabled>Siguiente ›</button>
          </div>
          <div class="hud-name" id="hud-levelname">Primera Ola</div>
        </div>

        <!-- MENÚ PRINCIPAL -->
        <div class="menu" id="menu">
          <div class="menu-hero">${frogIconSVG(150, true)}</div>
          <h1 class="menu-title">Rana <span>Leopardo</span></h1>
          <p class="menu-subtitle">Aventura en Corn Island · Caribe pastel</p>
          <button class="btn btn-big btn-primary" id="btn-play">▶ Jugar</button>
          <div class="level-select" id="level-select"></div>
          <div class="menu-toggles">
            <button class="icon-btn" id="btn-menu-sound" title="Sonido">🔊</button>
            <button class="icon-btn" id="btn-menu-music" title="Música">🎵</button>
          </div>
          <p class="menu-hint">Arrastra la rana en la resortera y suéltala 🐸</p>
        </div>

        <!-- OVERLAY VICTORIA / DERROTA -->
        <div class="overlay" id="overlay" hidden>
          <div class="overlay-card" id="overlay-card">
            <div class="overlay-title" id="overlay-title">¡Victoria!</div>
            <div class="overlay-stars" id="overlay-stars"></div>
            <div class="overlay-score">Puntos: <span id="overlay-score">0</span></div>
            <div class="overlay-info" id="overlay-info"></div>
            <div class="overlay-record" id="overlay-record"></div>
            <div class="overlay-buttons">
              <button class="btn btn-ghost" id="btn-overlay-menu">Menú</button>
              <button class="btn btn-primary" id="btn-overlay-restart">↻ Reintentar</button>
              <button class="btn btn-primary" id="btn-overlay-next" hidden>Siguiente ›</button>
            </div>
          </div>
        </div>

        <!-- AVISO ROTACIÓN (no bloqueante) -->
        <div class="rotate-hint" id="rotate-hint">
          <div class="rotate-icon">📱</div>
          <p>Consejo: gira el dispositivo para jugar en horizontal</p>
        </div>

        <!-- TOAST -->
        <div class="toast" id="toast" hidden></div>
      `;
      document.body.appendChild(root);

      this.hud = root.querySelector('#hud');
      this.menu = root.querySelector('#menu');
      this.overlay = root.querySelector('#overlay');
      this.toast = root.querySelector('#toast');
      this.rotateHint = root.querySelector('#rotate-hint');

      this._bindEvents();
    }

    _bindEvents() {
      const $ = (id) => document.getElementById(id);

      $('btn-play').addEventListener('click', () => {
        this.engine.audio.unlock();
        this.engine.startLevel(1); // startLevel vive en el Engine, no en la UI
      });
      $('btn-restart').addEventListener('click', () => this.engine.restartLevel());
      $('btn-next').addEventListener('click', () => this.engine.nextLevel());
      $('btn-overlay-menu').addEventListener('click', () => this.engine.showMenu());
      $('btn-overlay-restart').addEventListener('click', () => this.engine.restartLevel());
      $('btn-overlay-next').addEventListener('click', () => this.engine.nextLevel());

      const soundBtn = $('btn-sound');
      const menuSound = $('btn-menu-sound');
      const menuMusic = $('btn-menu-music');

      const syncSoundIcons = () => {
        const icon = this.engine.audio.muted ? '🔇' : '🔊';
        soundBtn.textContent = icon;
        menuSound.textContent = icon;
        const musicIcon = this.engine.audio.musicOn ? '🎵' : '🚫';
        menuMusic.textContent = musicIcon;
      };

      soundBtn.addEventListener('click', () => {
        this.engine.audio.setMuted(!this.engine.audio.muted);
        syncSoundIcons();
      });
      menuSound.addEventListener('click', () => {
        this.engine.audio.unlock();
        this.engine.audio.setMuted(!this.engine.audio.muted);
        syncSoundIcons();
      });
      menuMusic.addEventListener('click', () => {
        this.engine.audio.unlock();
        this.engine.audio.setMusic(!this.engine.audio.musicOn);
        syncSoundIcons();
      });
      this._syncSoundIcons = syncSoundIcons;

      // Aviso de rotación NO bloqueante: solo aparece en vertical,
      // se auto-oculta a los pocos segundos y jamás intercepta la
      // entrada (pointer-events: none en CSS).
      const checkRotate = () => {
        const portrait = window.innerHeight > window.innerWidth;
        this.rotateHint.classList.toggle('show', portrait);
        clearTimeout(this._rotateTimer);
        if (portrait) {
          this._rotateTimer = setTimeout(() => {
            this.rotateHint.classList.remove('show');
          }, 6000);
        }
      };
      window.addEventListener('resize', checkRotate);
      window.addEventListener('pointerdown', () => {
        this.rotateHint.classList.remove('show');
        clearTimeout(this._rotateTimer);
      });
      checkRotate();
    }

    /* ================== ESTADOS DE PANTALLA ================== */

    showMenu() {
      this.hud.hidden = true;
      this.overlay.hidden = true;
      this.menu.hidden = false;
      this._syncSoundIcons();
      this.buildLevelSelect();
    }

    showHUD() {
      this.menu.hidden = true;
      this.overlay.hidden = true;
      this.hud.hidden = false;
      // El nombre del nivel aparece destacado y se oculta solo a los ~3 s
      // (no estorba la visibilidad del marcador/estrellas).
      const name = document.getElementById('hud-levelname');
      if (name) {
        name.classList.remove('hide');
        clearTimeout(this._nameHideTimer);
        this._nameHideTimer = setTimeout(() => {
          if (name) name.classList.add('hide');
        }, 3000);
      }
    }

    hideHUD() {
      this.hud.hidden = true;
    }

    /** Construye la rejilla de niveles (bloqueados según progreso). */
    buildLevelSelect() {
      const container = document.getElementById('level-select');
      if (!container) return;
      const unlocked = this.engine.getUnlockedLevel();
      const best = this.engine.getBestStars();
      container.innerHTML = '';
      for (let i = 1; i <= this.levelCount; i++) {
        const locked = i > unlocked;
        const btn = document.createElement('button');
        btn.className = 'level-card' + (locked ? ' locked' : '');
        // Mejor puntaje de cada nivel (persistido en localStorage)
        const bestScore = this.engine.getBestScore(i);
        btn.innerHTML = `
          <span class="level-num">${i}</span>
          <span class="level-name">${locked ? '🔒' : this.engine.getLevelName(i)}</span>
          <span class="level-stars-mini">${this._miniStars(best[i] || 0)}</span>
          <span class="level-best">${bestScore > 0 ? '🏆 ' + bestScore : ''}</span>
        `;
        if (!locked) {
          btn.addEventListener('click', () => {
            this.engine.audio.unlock();
            this.engine.startLevel(i);
          });
        }
        container.appendChild(btn);
      }
    }

    _miniStars(n) {
      let out = '';
      for (let i = 1; i <= 3; i++) out += i <= n ? '★' : '☆';
      return out;
    }

    /** Actualiza el HUD. */
    updateHUD({ level, score, frogsLeft, stars = 0, levelName, starGoal, bestScore = 0 }) {
      const $ = (id) => document.getElementById(id);
      if ($('hud-level')) $('hud-level').textContent = level;
      if ($('hud-score')) $('hud-score').textContent = score;
      if ($('hud-levelname')) $('hud-levelname').textContent = levelName || '';
      if ($('hud-goal')) $('hud-goal').textContent = starGoal || '';
      if ($('hud-best')) $('hud-best').textContent = bestScore > 0 ? '🏆 Récord: ' + bestScore : '';
      this._renderStars('hud-stars', stars);
      this._renderFrogs('hud-frogs', frogsLeft);
    }

    /** 3 huecos de estrella: 0 = vacía, 1..3 = rellenas. */
    _renderStars(containerId, earned) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const star = document.createElement('span');
        star.className = 'star' + (i <= earned ? ' earned' : '');
        star.textContent = i <= earned ? '★' : '☆';
        container.appendChild(star);
      }
    }

    /** Iconos de ranas restantes. */
    _renderFrogs(containerId, count) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < count; i++) {
        container.insertAdjacentHTML('beforeend', frogIconSVG(26, false));
      }
    }

    /* ================== OVERLAYS ================== */

    showVictory({ score, stars, best, hasNext, level, bestScore = 0, newRecord = false }) {
      this.overlay.hidden = false;
      this.overlay.classList.remove('lose');
      this.overlay.classList.add('win');
      const $ = (id) => document.getElementById(id);
      $('overlay-title').textContent = '¡Victoria!';
      $('overlay-score').textContent = score;
      $('overlay-info').textContent = '';
      // Récord del nivel (best score en localStorage)
      const rec = $('overlay-record');
      if (bestScore > 0) {
        rec.textContent = newRecord
          ? '🏆 ¡Nuevo récord del nivel: ' + bestScore + '!' :
          'Récord del nivel: ' + bestScore;
      } else {
        rec.textContent = '';
      }
      const next = $('btn-overlay-next');
      next.hidden = !hasNext;
      // Estrellas animadas
      const starsEl = $('overlay-stars');
      starsEl.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const s = document.createElement('span');
        s.className = 'star big' + (i <= stars ? ' earned' : '');
        s.textContent = '★';
        starsEl.appendChild(s);
      }
      if (stars > 0) {
        setTimeout(() => this.engine.audio.play('star'), 350);
      }
      this.hud.hidden = true;
      if (stars === 3 && (!best[level] || best[level] < 3)) {
        this.showToast('¡3 estrellas! Nivel perfecto 🌟');
      }
    }

    showDefeat({ score, enemiesLeft = 0 }) {
      this.overlay.hidden = false;
      this.overlay.classList.remove('win');
      this.overlay.classList.add('lose');
      const $ = (id) => document.getElementById(id);
      $('overlay-title').textContent = '¡Oh no!';
      $('overlay-score').textContent = score;
      // Deja claro POR QUÉ se perdió: se gana eliminando a TODOS los cangris
      // (nombre cariñoso de los enemigos: cangrejos, peces globo y cocos)
      $('overlay-info').textContent = enemiesLeft > 0
        ? (enemiesLeft === 1 ? 'Quedaba 1 cangri en pie' : 'Quedaban ' + enemiesLeft + ' cangris en pie')
        : '';
      $('overlay-stars').innerHTML = '<span class="star big">☆</span><span class="star big">☆</span><span class="star big">☆</span>';
      document.getElementById('btn-overlay-next').hidden = true;
      document.getElementById('overlay-record').textContent = '';
      this.hud.hidden = true;
    }

    hideOverlay() {
      this.overlay.hidden = true;
    }

    /* ================== EXTRAS ================== */

    showToast(text) {
      this.toast.textContent = text;
      this.toast.hidden = false;
      this.toast.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this.toast.classList.remove('show');
        setTimeout(() => { this.toast.hidden = true; }, 300);
      }, 2400);
    }

    setNextEnabled(enabled) {
      const btn = document.getElementById('btn-next');
      if (btn) btn.disabled = !enabled;
    }
  }

  NS.UI = { UIManager, frogIconSVG };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
