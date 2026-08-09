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
  const CONTENT = NS.Content;

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
      this.modal = null;
      this.modalBody = null;
      this.modalTitleEl = null;
      this.modalPrimaryBtn = null;
      this._modalPrimaryHandler = null;

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
              <button class="icon-btn" id="btn-hud-fact" title="Curiosidad del nivel">💡</button>
              <button class="icon-btn" id="btn-hud-recon" title="Ubicación de los cangris">🔍</button>
              <button class="icon-btn" id="btn-hud-menu" title="Menú principal">🏠</button>
              <button class="icon-btn" id="btn-sound" title="Sonido" aria-label="Sonido">🔊</button>
            </div>
          </div>
          <div class="hud-bottom">
            <button class="btn btn-ghost" id="btn-restart">↻ Reiniciar</button>
            <button class="btn btn-primary" id="btn-next" disabled>Siguiente ›</button>
          </div>
          <div class="hud-fact" id="hud-fact" hidden>
            <div class="hud-fact-title" id="hud-fact-title"></div>
            <div class="hud-fact-text" id="hud-fact-text"></div>
          </div>
          <div class="hud-name" id="hud-levelname">Primera Ola</div>
          <div class="recon" id="recon" hidden>
            <div class="recon-title">📍 Ubicación de los cangris — nivel <span id="recon-level"></span></div>
            <div class="recon-track" id="recon-track"></div>
          </div>
        </div>

        <!-- MENÚ PRINCIPAL -->
        <div class="menu" id="menu">
          <div class="menu-hero">${frogIconSVG(150, true)}</div>
          <h1 class="menu-title">Rana <span>Leopardo</span></h1>
          <p class="menu-subtitle">Una aventura en Corn Island</p>
          <p class="menu-tagline">${CONTENT.menu.tagline}</p>
          <button class="btn btn-big btn-primary" id="btn-play">▶ Jugar</button>
          <button class="btn btn-ghost btn-info" id="btn-info">ℹ️ Sobre el juego</button>
          <div class="level-select" id="level-select"></div>
          <div class="menu-toggles">
            <button class="icon-btn" id="btn-menu-sound" title="Sonido">🔊</button>
            <button class="icon-btn" id="btn-menu-music" title="Música">🎵</button>
          </div>
          <p class="menu-hint">${CONTENT.menu.hint}</p>
          <p class="menu-footer">${CONTENT.menu.footer} <strong>Nativerse</strong> 💚</p>
        </div>

        <!-- OVERLAY VICTORIA / DERROTA -->
        <div class="overlay" id="overlay" hidden>
          <div class="overlay-card" id="overlay-card">
            <div class="overlay-title" id="overlay-title">¡Excelente trabajo!</div>
            <div class="overlay-stars" id="overlay-stars"></div>
            <div class="overlay-score">Puntos: <span id="overlay-score">0</span></div>
            <div class="overlay-info" id="overlay-info"></div>
            <div class="overlay-fact" id="overlay-fact" hidden>
              <div class="overlay-fact-title" id="overlay-fact-title"></div>
              <div class="overlay-fact-text" id="overlay-fact-text"></div>
            </div>
            <div class="overlay-record" id="overlay-record"></div>
            <div class="overlay-buttons">
              <button class="btn btn-ghost" id="btn-overlay-menu">Menú</button>
              <button class="btn btn-primary" id="btn-overlay-restart">↻ Reintentar</button>
              <button class="btn btn-primary" id="btn-overlay-final" hidden>🎉 Ver final</button>
              <button class="btn btn-primary" id="btn-overlay-next" hidden>Siguiente ›</button>
            </div>
          </div>
        </div>

        <!-- MODAL (información del juego / final) -->
        <div class="modal-backdrop" id="modal" hidden>
          <div class="modal-card">
            <div class="modal-head">
              <h2 class="modal-title" id="modal-title"></h2>
              <button class="icon-btn modal-close" id="modal-close" title="Cerrar" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body" id="modal-body"></div>
            <div class="modal-actions">
              <button class="btn btn-primary" id="modal-primary"></button>
            </div>
          </div>
        </div>

        <!-- TOAST -->
        <div class="toast" id="toast" hidden></div>
      `;
      document.body.appendChild(root);

      this.hud = root.querySelector('#hud');
      this.menu = root.querySelector('#menu');
      this.overlay = root.querySelector('#overlay');
      this.toast = root.querySelector('#toast');

      this._bindEvents();
    }

    _bindEvents() {
      const $ = (id) => document.getElementById(id);

      $('btn-play').addEventListener('click', () => {
        this.engine.audio.unlock();
        this.engine.startLevel(1); // startLevel vive en el Engine, no en la UI
      });
      $('btn-info').addEventListener('click', () => {
        this.engine.audio.unlock();
        this.openInfoModal();
      });
      $('btn-restart').addEventListener('click', () => this.engine.restartLevel());
      $('btn-next').addEventListener('click', () => this.engine.nextLevel());
      $('btn-overlay-menu').addEventListener('click', () => this.engine.showMenu());
      $('btn-overlay-restart').addEventListener('click', () => this.engine.restartLevel());
      $('btn-overlay-next').addEventListener('click', () => this.engine.nextLevel());
      $('btn-overlay-final').addEventListener('click', () => {
        this.engine.audio.unlock();
        this.openFinalModal();
      });
      $('modal-close').addEventListener('click', () => this.hideModal());
      $('modal-primary').addEventListener('click', () => {
        if (this._modalPrimaryHandler) this._modalPrimaryHandler();
        this.hideModal();
      });
      this.modal = $('modal');
      this.modalBody = $('modal-body');
      this.modalTitleEl = $('modal-title');
      this.modalPrimaryBtn = $('modal-primary');
      this.recon = $('recon');
      this.reconTrack = $('recon-track');
      this.factChip = $('hud-fact');
      $('btn-hud-menu').addEventListener('click', () => this.engine.showMenu());
      $('btn-hud-fact').addEventListener('click', () => this.toggleFact());
      $('btn-hud-recon').addEventListener('click', () => this.toggleRecon());

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
    }

    /* ================== ESTADOS DE PANTALLA ================== */

    showMenu() {
      this.hud.hidden = true;
      this.overlay.hidden = true;
      this.menu.hidden = false;
      this.hideModal();
      if (this.recon) this.recon.hidden = true;
      if (this.factChip) this.factChip.hidden = true;
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

      // Textos según cornisland.md: "Excelente trabajo" o la victoria perfecta
      const isPerfect = stars >= 3;
      $('overlay-title').textContent = isPerfect ? CONTENT.victory.perfectTitle : CONTENT.victory.title;
      $('overlay-score').textContent = score;
      $('overlay-info').textContent = isPerfect
        ? CONTENT.victory.perfectLine
        : CONTENT.victory.line;
      // Curiosidad NO se muestra en la victoria: ocupa demasiado. Solo
      // aparece al iniciar nivel y con el botón 💡 del HUD.
      $('overlay-fact').hidden = true;
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
      // Al terminar el último nivel: botón para el modal del final del juego.
      $('btn-overlay-final').hidden = hasNext;
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
      $('overlay-title').textContent = CONTENT.defeat.title;
      $('overlay-score').textContent = score;
      // Deja claro POR QUÉ se perdió: se gana eliminando a TODOS los cangris
      // (nombre cariñoso de los enemigos: cangrejos, peces globo y cocos)
      $('overlay-info').textContent = [
        enemiesLeft > 0
          ? (enemiesLeft === 1 ? 'Quedaba 1 cangri en pie' : 'Quedaban ' + enemiesLeft + ' cangris en pie')
          : '',
        CONTENT.defeat.tip
      ].filter(Boolean).join(' · ');
      $('overlay-stars').innerHTML = '<span class="star big">☆</span><span class="star big">☆</span><span class="star big">☆</span>';
      document.getElementById('btn-overlay-next').hidden = true;
      document.getElementById('btn-overlay-final').hidden = true;
      document.getElementById('overlay-record').textContent = '';
      document.getElementById('overlay-fact').hidden = true;
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

    /* ================== CURIOSIDAD + RECON ================== */

    /**
     * Se llamo al entrar a un nivel: muestra la curiosidad del nivel
     * (transitoria, como el nombre) y una mini-mapa con la ubicación
     * de los cangris durante unos segundos antes de jugar.
     */
    showLevelIntro(level) {
      this._showFact(level);
      this.showRecon(true);
    }

    /** Rellena y muestra una curiosidad del banco (transitoria). */
    _showFact(level) {
      const fact = this._nextFact();
      this.factChip.hidden = true;
      this.factChip.classList.remove('hide');
      clearTimeout(this._factTimer);
      if (fact) {
        document.getElementById('hud-fact-title').textContent = fact.title;
        document.getElementById('hud-fact-text').textContent = fact.text;
        this.factChip.hidden = false;
        this._factTimer = setTimeout(() => this.factChip.classList.add('hide'), 4500);
      }
    }

    /**
     * Baraja el banco de curiosidades y devuelve la siguiente, evitando
     * repetir la inmediatamente anterior (la baraja se rearma al agotarse).
     */
    _nextFact() {
      const bank = CONTENT.facts || [];
      if (!bank.length) return null;
      if (!this._factDeck || this._factDeck.length === 0) {
        const deck = bank.slice();
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        // Si el primer fact de la nueva baraja repite el último mostrado,
        // lo movemos al final para que nunca se vea dos veces seguidas.
        if (deck.length > 1 && deck[0] === this._lastFact) {
          deck.push(deck.shift());
        }
        this._factDeck = deck;
      }
      this._lastFact = this._factDeck.pop();
      return this._lastFact;
    }

    /** Muestra/oculta la curiosidad del nivel actual (botón 💡). */
    toggleFact() {
      const visible = !this.factChip.hidden && !this.factChip.classList.contains('hide');
      if (visible) {
        clearTimeout(this._factTimer);
        this.factChip.classList.add('hide');
      } else {
        this._showFact(this.engine.levelIndex);
      }
    }

    /** Construye y muestra el mini-mapa de enemigos (también al jugar). */
    showRecon(auto = false) {
      if (!this.recon || !this.engine.levelData) {
        if (this.recon) this.recon.hidden = true;
        return;
      }
      const level = this.engine.levelIndex;
      const spots = this.engine.getEnemySpots();
      const width = this.engine.getWorldWidth();
      const slingX = this.engine.getSlingshotX();
      document.getElementById('recon-level').textContent = level;
      // Mini-mapa horizontal: resortera (rana) en la izquierda y cada cangri
      // en su posición relativa (%), para saber hacia dónde apuntar.
      const dots = spots.map((s) => {
        const left = Math.max(0, Math.min(92, (s.x / width) * 100));
        const icon = s.type === 'crab' ? '🦀' : s.type === 'coco' ? '🥥' : '🐡';
        return `<span class="recon-dot" style="left:${left}%">${icon}</span>`;
      }).join('');
      const frogLeft = Math.max(0, Math.min(100, (slingX / width) * 100));
      this.reconTrack.innerHTML =
        `<span class="recon-start" style="left:${frogLeft}%">🐸</span>` + dots;
      this.recon.hidden = false;
      clearTimeout(this._reconTimer);
      if (auto) {
        this._reconTimer = setTimeout(() => { this.recon.hidden = true; }, 3500);
      }
    }

    /** Muestra/oculta el mini-mapa de cangris (botón 🔍). */
    toggleRecon() {
      if (this.recon.hidden) {
        this.showRecon(false);
      } else {
        this.recon.hidden = true;
        clearTimeout(this._reconTimer);
      }
    }

    /* ================== MODAL INFORMATIVO ================== */

    /** Construye una sección de texto simple (título opcional + párrafos). */
    _modalSection(title, text) {
      const titleHtml = title ? '<h3 class="modal-section-title">' + title + '</h3>' : '';
      const paras = (Array.isArray(text) ? text : [text])
        .map((p) => '<p>' + p + '</p>')
        .join('');
      return '<div class="modal-section">' + titleHtml + paras + '</div>';
    }

    /** Abre el modal con los contenidos indicados. */
    openModal({ title, sections, primaryLabel, primaryHandler }) {
      this._modalPrimaryHandler = primaryHandler || null;
      this.modalTitleEl.textContent = title || '';
      this.modalBody.innerHTML = sections.join('');
      this.modalPrimaryBtn.textContent = primaryLabel || 'Entendido';
      this.modal.hidden = false;
      document.getElementById('overlay').hidden = true;
    }

    hideModal() {
      if (!this.modal) return;
      this.modal.hidden = true;
      this._modalPrimaryHandler = null;
    }

    /** Modal "Sobre el juego": introducción, historia, objetivo y filosofía. */
    openInfoModal() {
      const C = CONTENT;
      const sections = [
        this._modalSection(C.intro.title, C.intro.text),
        this._modalSection(C.hero.name, C.hero.text),
        this._modalSection(C.story.title, C.story.text),
        this._modalSection(C.objective.title, C.objective.text),
        this._modalSection(C.philosophy.title, C.philosophy.text)
      ];
      this.openModal({
        title: '🐸 Rana Leopardo',
        sections,
        primaryLabel: 'Continuar',
        primaryHandler: () => this.engine.audio.play('click')
      });
    }

    /** Modal final: se muestra al superar el último nivel. */
    openFinalModal() {
      const C = CONTENT;
      const sections = [
        this._modalSection(null, C.final.text),
        this._modalSection(C.final.natureHeading, C.final.natureText),
        this._modalSection(C.final.frogsHeading, C.final.frogsText),
        this._modalSection(C.final.islandHeading, C.final.islandText)
      ];
      this.openModal({
        title: C.final.title,
        sections,
        primaryLabel: 'Volver al menú',
        primaryHandler: () => this.engine.showMenu()
      });
    }
  }

  NS.UI = { UIManager, frogIconSVG };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
