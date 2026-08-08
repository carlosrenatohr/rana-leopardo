/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/engine.js
 * ------------------------------------------------------------
 * MOTOR DEL JUEGO — orquesta todos los subsistemas:
 *
 *   - Bucle principal con requestAnimationFrame y timestep
 *     físico fijo (acumulador).
 *   - Máquina de estados: MENU → PLAYING → WON / LOST.
 *   - Resortera: arrastrar, soltar, trayectoria, lanzamiento.
 *   - Daño por impacto, destrucción, puntuación y estrellas.
 *   - Condiciones de victoria (sin enemigos) y derrota
 *     (sin ranas y enemigos vivos).
 *   - Progreso guardado en localStorage.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils } = NS.Utils;
  const { Body } = NS.Physics;
  const { PolygonShape, CircleShape } = NS.Collision;
  const { PHYSICS } = NS.Physics;
  const { Camera } = NS.Camera;
  const { Renderer } = NS.Renderer;
  const { Particles } = NS.Particles;
  const { Lighting } = NS.Lighting;
  const { Scene } = NS.Scene;
  const { World } = NS.Physics;
  const { InputManager } = NS.Input;
  const { AudioManager } = NS.Audio;
  const { LevelLoader } = NS.LevelLoader;
  const { UIManager } = NS.UI;
  const { EntityFactory, Frog, MATERIALS } = NS.Entities;

  const CONFIG = {
    MAX_PULL: 150, // radio máximo de estirado (px)
    MIN_PULL: 28, // estirado mínimo para lanzar
    LAUNCH_K: 9.6, // velocidad = pull * K
    WATER_KILL_Y: 705, // por debajo: splash (rana perdida)
    OFF_LEFT: -280, // fuera del mundo por la izquierda
    OFF_RIGHT_PAD: 240, // fuera del mundo por la derecha
    DAMAGE_K: 0.3, // daño = velocidad de impacto * K
    SETTLE_TIME: 0.35, // segundos en reposo para consumir la rana (reinicio ágil)
    BASE_CLEAR: 500, // puntos por superar el nivel
    FROG_BONUS: 250 // puntos por rana sin usar
  };

  class Engine {
    constructor({ canvas }) {
      this.canvas = canvas;
      this.camera = new Camera(1280, 720);
      this.renderer = new Renderer(canvas, this.camera);
      this.audio = new AudioManager();
      this.particles = new Particles();
      this.lighting = new Lighting();
      this.world = new World({ gravity: PHYSICS.GRAVITY.clone() });
      this.scene = null;
      this.entities = [];

      this.input = new InputManager(canvas, this.camera);
      this.ui = new UIManager(this);

      this.state = 'MENU';
      this.levelIndex = 1;
      this.levelData = null;
      this.score = 0;
      this.starGoal = '';
      this.frogQueue = 0;
      this.enemyCount = 0;
      this.activeFrog = null;
      this.heldFrog = null;
      this.dragging = false;
      this.pull = new Vec2();
      this.trajectory = [];
      this.trail = []; // estela de vuelo (posiciones recientes de la rana)
      this._trailTimer = 0;
      this.frogSettledTimer = 0;
      this.time = 0;
      this._lastTime = performance.now();
      this._hudTimer = 0;

      // Progreso (nivel desbloqueado + estrellas + récords de puntuación)
      this.progress = { unlocked: 1, best: {}, scores: {} };
      this._loadProgress();

      // Enrutar eventos
      this.world.onImpact = (a, b, speed, m) => this._onImpact(a, b, speed, m);
      this.input.onDragStart = (p) => this._onDragStart(p);
      this.input.onDragMove = (p) => this._onDragMove(p);
      this.input.onDragEnd = (p) => this._onDragEnd(p);
      this.input.onKey = (k) => this._onKey(k);
      this.input.onAnyInput = () => this.audio.unlock();

      window.addEventListener('resize', () => this.renderer.resize());
      this.renderer.resize();

      // Escena de fondo del menú
      this._buildMenuScene();
      this.ui.showMenu();

      this._raf = requestAnimationFrame((t) => this._loop(t));
    }

    /* ================== PROGRESO ================== */

    _loadProgress() {
      try {
        const raw = localStorage.getItem('rana-progress');
        if (raw) {
          const p = JSON.parse(raw);
          this.progress = {
            unlocked: Math.max(1, p.unlocked || 1),
            best: p.best || {},
            scores: p.scores || {}
          };
        }
      } catch (e) { /* sin almacenamiento */ }
    }

    _saveProgress() {
      try {
        localStorage.setItem('rana-progress', JSON.stringify(this.progress));
      } catch (e) { /* sin almacenamiento */ }
    }

    getUnlockedLevel() {
      return Math.min(this.progress.unlocked, LevelLoader.getLevelCount());
    }

    getBestStars() {
      return this.progress.best;
    }

    /** Mejor puntaje de un nivel (0 si nunca se ganó). */
    getBestScore(index) {
      return this.progress.scores[index] || 0;
    }

    getLevelName(i) {
      try {
        return LevelLoader.EMBEDDED[i - 1].name;
      } catch (e) {
        return 'Nivel ' + i;
      }
    }

    /* ================== MENÚ ================== */

    _buildMenuScene() {
      const dummy = {
        name: 'Menu',
        width: 2400,
        slingshot: { x: 220, y: 620 },
        decorations: [
          { type: 'palm', x: 200, y: 624, scale: 1.2 },
          { type: 'palm', x: 1300, y: 624, scale: 1.1 },
          { type: 'palm', x: 2000, y: 624, scale: 1.3 },
          { type: 'flower', x: 900, y: 660, scale: 1 },
          { type: 'flower', x: 1100, y: 668, scale: 1.2 },
          { type: 'rock', x: 500, y: 648, scale: 1 },
          { type: 'rock', x: 1700, y: 650, scale: 1.2 }
        ],
        objects: []
      };
      this.scene = new Scene(dummy, dummy.width);
    }

    showMenu() {
      this.state = 'MENU';
      this.input.setEnabled(false);
      this._buildMenuScene();
      this.camera.setBounds(0, 2400, 0, 720);
      this.camera.reset();
      this.world.clear();
      this.entities.length = 0;
      this.activeFrog = null;
      this.heldFrog = null;
      this.trail = [];
      this.particles.clear();
      this.ui.showMenu();
    }

    /* ================== NIVELES ================== */

    async startLevel(index) {
      if (index < 1 || index > LevelLoader.getLevelCount()) {
        this.showMenu();
        return;
      }
      this.state = 'LOADING';
      this.levelIndex = index;
      const data = await LevelLoader.load(index);
      this._setupLevel(data);
    }

    _setupLevel(data) {
      this.levelData = data;
      this.score = 0;
      this.starsEarned = 0;
      this.enemyCount = 0;
      this.frogQueue = data.frogs || 1;
      this.activeFrog = null;
      this.heldFrog = null;
      this.dragging = false;
      this.pull = new Vec2();
      this.trajectory = [];
      this.trail = [];
      this._trailTimer = 0;
      this.frogSettledTimer = 0;
      this.state = 'PLAYING';

      // Objetivo de estrellas (se calcula una vez por nivel)
      this.starGoal = (data.stars || [1000, 2000, 3000])
        .map((t, i) => '★'.repeat(i + 1) + ' ' + t)
        .join('  ');

      // Mundo físico limpio
      this.world.clear();
      this.entities.length = 0;

      // Suelo (cuerpo estático invisible)
      const ground = new Body({
        position: new Vec2(data.width / 2, 640),
        shape: PolygonShape.rect(data.width + 200, 40),
        isStatic: true,
        friction: 0.6,
        restitution: 0.02,
        tags: ['ground']
      });
      this.world.addBody(ground);

      // Pared izquierda (evita fugas hacia la resortera)
      const leftWall = new Body({
        position: new Vec2(-60, 500),
        shape: PolygonShape.rect(40, 500),
        isStatic: true,
        friction: 0.4,
        tags: ['wall']
      });
      this.world.addBody(leftWall);

      // Entidades del nivel
      for (const def of data.objects || []) {
        const entity = EntityFactory.create(def);
        if (!entity) continue;
        entity.position.set(def.x, def.y);
        entity.angle = def.angle || 0;
        if (entity.isEnemy) this.enemyCount++;
        this.world.addBody(entity);
        this.entities.push(entity);
      }

      // Escena
      this.scene = new Scene(data, data.width);
      this.camera.setBounds(0, data.width, 0, 720);
      this.camera.reset();
      this.particles.clear();

      // Primera rana en la resortera
      this._spawnHeldFrog();

      this.ui.showHUD();
      this.ui.setNextEnabled(this.levelIndex < LevelLoader.getLevelCount());
      this.ui.updateHUD(this._hudData());
      this.ui.buildLevelSelect();
      this.input.setEnabled(true);
      this.audio.play('click');
    }

    restartLevel() {
      return this.startLevel(this.levelIndex);
    }

    nextLevel() {
      if (this.levelIndex < LevelLoader.getLevelCount()) {
        return this.startLevel(this.levelIndex + 1);
      }
      this.showMenu();
    }

    /* ================== RANAS ================== */

    _spawnHeldFrog() {
      if (this.frogQueue <= 0) {
        this.heldFrog = null;
        return;
      }
      const s = this.scene.slingshot;
      const frog = new Frog();
      frog.position.copy(s.restPoint);
      frog.angle = 0;
      frog.velocity.set(0, 0);
      frog.angularVelocity = 0;
      frog.held = true;
      frog.facing = 1;
      this.heldFrog = frog;
      this._updateHUDSoon();
    }

    _launchFrog() {
      const frog = this.heldFrog;
      if (!frog) return;
      const s = this.scene.slingshot;
      const anchor = new Vec2(s.x, s.y - 96);

      const dir = anchor.sub(frog.position);
      const pullLen = dir.length();
      if (pullLen < CONFIG.MIN_PULL) {
        // Cancelar: la rana vuelve al reposo
        frog.position.copy(s.restPoint);
        frog.angle = 0;
        this.dragging = false;
        this.trajectory = [];
        return;
      }

      const speed = Math.min(pullLen * CONFIG.LAUNCH_K, 1500);
      const v = dir.normalize().scale(speed);

      // La rana entra al mundo físico
      frog.held = false;
      frog.facing = v.x >= 0 ? 1 : -1;
      frog.velocity.copy(v);
      frog.angularVelocity = -speed / 60; // giro hacia delante (torque simple)
      this.world.addBody(frog);
      this.activeFrog = frog;
      this.heldFrog = null;
      this.frogQueue--;
      this.frogSettledTimer = 0;
      this.dragging = false;
      this.trajectory = [];
      this.trail = [];
      this._trailTimer = 0;

      // Efectos
      this.particles.dust(frog.position.x, frog.position.y + 20, 10);
      this.audio.play('launch');
      this.camera.follow(frog);
      this._updateHUDSoon();
    }

    /** Consume la rana actual (se posó, cayó al mar o salió del mundo). */
    _consumeFrog(reason) {
      const frog = this.activeFrog;
      if (!frog) return;
      this.world.removeBody(frog);
      this.entities = this.entities.filter((e) => e !== frog);
      this.activeFrog = null;
      this.camera.stopFollow();
      this.trail = []; // la estela muere con la rana

      if (reason === 'water') {
        this.particles.splash(frog.position.x, frog.position.y, 1);
        this.audio.play('splash');
      } else if (reason === 'rest') {
        this.particles.dust(frog.position.x, frog.position.y + 20, 5);
      }

      // ¿Siguen enemigos vivos?
      if (this.enemyCount > 0) {
        if (this.frogQueue > 0) {
          this._spawnHeldFrog();
          this.camera.targetX = 0;
        } else {
          this._defeat();
        }
      } else {
        // Ya ganamos (puede ocurrir si la última rana mató al último enemigo)
        this._win();
      }
      this._updateHUDSoon();
    }

    _updateFrogLifecycle(dt) {
      const frog = this.activeFrog;
      if (!frog) return;

      // Estela de vuelo: guardar una posición cada ~0.03s (máx. 60).
      // Solo mientras la rana vuela: al posarse, no se amontonan puntos
      // casi idénticos en el punto de aterrizaje.
      this._trailTimer -= dt;
      if (this._trailTimer <= 0 && frog.velocity.length() > 60) {
        this._trailTimer = 0.03;
        this.trail.push(frog.position.clone());
        if (this.trail.length > 60) this.trail.shift();
      }

      // ¿Cayó al mar?
      if (frog.position.y > CONFIG.WATER_KILL_Y) {
        this._consumeFrog('water');
        return;
      }
      // ¿Salió del mundo?
      if (frog.position.x > this.levelData.width + CONFIG.OFF_RIGHT_PAD ||
          frog.position.x < CONFIG.OFF_LEFT) {
        this._consumeFrog('off');
        return;
      }

      // ¿Se posó? Un círculo que rueda despacio nunca duerme (su velocidad
      // angular supera el umbral de sleep), así que una velocidad baja
      // sostenida también cuenta como "posado".
      const still = frog.sleeping || frog.velocity.length() < 40;
      if (still) {
        this.frogSettledTimer += dt;
        if (this.frogSettledTimer >= CONFIG.SETTLE_TIME) {
          this._consumeFrog('rest');
        }
      } else {
        this.frogSettledTimer = 0;
      }
    }

    /* ================== RESORTERA ================== */

    _onDragStart(worldPos) {
      if (this.state !== 'PLAYING' || !this.heldFrog) return;
      this.dragging = true;
      this._updatePull(worldPos);
    }

    _onDragMove(worldPos) {
      if (!this.dragging || !this.heldFrog) return;
      this._updatePull(worldPos);
    }

    _onDragEnd(worldPos) {
      if (!this.dragging) return;
      this._updatePull(worldPos);
      this._launchFrog();
    }

    _updatePull(worldPos) {
      const s = this.scene.slingshot;
      const anchor = new Vec2(s.x, s.y - 96);
      const toPointer = worldPos.sub(anchor);
      const len = toPointer.length();
      const clamped = len > CONFIG.MAX_PULL ? toPointer.normalize().scale(CONFIG.MAX_PULL) : toPointer;

      // Vector de estirado = −clamped (Vec2 es inmutable: copy/set mutan,
      // add/sub/scale devuelven vectores nuevos).
      this.pull.set(-clamped.x, -clamped.y);
      this.heldFrog.position.copy(anchor.add(clamped));
      this.heldFrog.angle = MathUtils.clamp(clamped.angle() * 0.22, -0.5, 0.5);
      this.heldFrog.facing = clamped.x < 0 ? -1 : 1;

      // Trayectoria prevista: la velocidad real de lanzamiento apunta
      // en dirección `-clamped` (del punto estirado hacia el ancla);
      // `this.pull` es exactamente ese vector (−clamped).
      const v0 = this.pull.normalize().scale(Math.min(this.pull.length() * CONFIG.LAUNCH_K, 1500));
      this.trajectory = this._predict(this.heldFrog.position, v0);
      this.audio.play('stretch', 0.6);
      this._updateHUDSoon();
    }

    /** Simulación balística simple (sin colisiones) para el preview. */
    _predict(origin, velocity) {
      const pts = [];
      let p = origin.clone();
      let v = velocity.clone();
      const g = this.world.gravity;
      const dt = 1 / 40;
      for (let i = 0; i < 30; i++) {
        v = v.add(g.scale(dt));
        p = p.addScaled(v, dt);
        // Cortar en la línea del suelo (~620) para que la rana fantasma
        // aterrice sobre la arena y no "flote".
        if (p.y > 620) break;
        pts.push(p.clone());
      }
      return pts;
    }

    _onKey(key) {
      const k = key.toLowerCase();
      if (k === 'r' && this.state === 'PLAYING') this.restartLevel();
      if (k === 'm') this.showMenu();
      if (k === 'escape' && this.dragging && this.heldFrog) {
        this.dragging = false;
        this.heldFrog.position.copy(this.scene.slingshot.restPoint);
        this.heldFrog.angle = 0;
        this.trajectory = [];
      }
    }

    /* ================== IMPACTOS / DAÑO ================== */

    _onImpact(a, b, speed, manifold) {
      const point = manifold && manifold.contacts[0];
      const frog = this.activeFrog;

      // La rana también "siente" el golpe: pulso squash visible
      if (frog && (a === frog || b === frog) && speed > 150) {
        frog.impactPulse = 1;
      }

      // Efectos visuales del impacto
      if (speed > 220) {
        this.camera.addShake(MathUtils.clamp((speed - 220) * 0.02, 1.5, 7));
        if (point) {
          this.particles.impactRing(point.x, point.y, 'rgba(255,255,255,0.8)', MathUtils.clamp(speed * 0.03, 8, 26));
        }
      }

      // Los daños aplican a los cuerpos con HP que no sean la rana
      const candidates = [a, b].filter((body) => body && typeof body.hp === 'number' && body !== frog);

      for (const entity of candidates) {
        const damage = speed * CONFIG.DAMAGE_K;
        const died = entity.damage(damage, point);
        if (died) {
          this._entityDied(entity, point);
        } else {
          // Sonido de impacto según material (si es lo bastante fuerte)
          if (speed > 160) this._impactSound(entity, speed);
        }
      }

      // Impacto de la rana contra el suelo
      const groundHit = (a === frog || b === frog) && (a.tags.has('ground') || b.tags.has('ground'));
      if (groundHit && speed > 300) {
        this.audio.play('impact-frog', MathUtils.clamp(speed / 900, 0.3, 1));
        if (point) this.particles.dust(point.x, point.y, 6);
      }
    }

    _impactSound(entity, speed) {
      const vol = MathUtils.clamp(speed / 900, 0.3, 1);
      const t = entity.entityType;
      if (t.includes('wood')) this.audio.play('impact-wood', vol);
      else if (t.includes('crystal')) this.audio.play('impact-glass', vol);
      else if (t.includes('bamboo')) this.audio.play('impact-wood', vol * 0.8);
      else if (t.includes('stone')) this.audio.play('impact-stone', vol);
      else this.audio.play('impact-frog', vol * 0.7);
    }

    _entityDied(entity, point) {
      this.world.removeBody(entity);
      entity.active = false;
      const idx = this.entities.indexOf(entity);
      if (idx >= 0) this.entities.splice(idx, 1);

      const x = point ? point.x : entity.position.x;
      const y = point ? point.y : entity.position.y;
      const isEnemy = entity.isEnemy;
      const t = entity.entityType;

      // Partículas y sonido según tipo
      if (t === 'wood-block') {
        this.particles.woodSplinters(x, y, 1);
        this.audio.play('break-wood');
      } else if (t === 'crystal-block') {
        this.particles.glassShards(x, y, 1);
        this.audio.play('break-glass');
      } else if (t === 'bamboo-block') {
        this.particles.woodSplinters(x, y, 1.2);
        this.audio.play('break-bamboo');
      } else if (t === 'stone-block') {
        this.particles.stoneChips(x, y, 1);
        this.audio.play('break-stone');
      } else if (t === 'crab' || t === 'coco') {
        this.particles.confetti(x, y, 22);
        this.audio.play('pop');
      } else if (t === 'pufferfish') {
        this.particles.bubble(x, y, 1);
        this.particles.confetti(x, y, 18);
        this.audio.play('pop');
      } else {
        this.particles.confetti(x, y, 16);
      }

      // Puntos
      const pts = entity.scoreValue || 0;
      this.score += pts;
      if (pts > 0) {
        this.particles.scorePopup(x, y - 10, '+' + pts, isEnemy ? '#ff8c94' : '#ffffff', 20);
      }

      this._updateHUDSoon();

      // ¿Era el último enemigo?
      if (isEnemy) {
        this.enemyCount--;
        if (this.enemyCount <= 0) {
          this._win();
        }
      }
    }

    /* ================== VICTORIA / DERROTA ================== */

    _win() {
      if (this.state !== 'PLAYING') return;
      this.state = 'WON';
      this.input.setEnabled(false);

      // Bonus de ranas restantes
      const frogBonus = this.frogQueue * CONFIG.FROG_BONUS;
      this.score += CONFIG.BASE_CLEAR + frogBonus;
      for (let i = 0; i < this.frogQueue; i++) {
        this.particles.heart(this.camera.center.x, this.camera.center.y - 60 - i * 40);
      }

      // Estrellas
      const thresholds = this.levelData.stars || [1000, 2000, 3000];
      let stars = 0;
      for (const th of thresholds) {
        if (this.score >= th) stars++;
      }
      this.starsEarned = stars;

      // Progreso: estrellas + récord de puntuación del nivel
      const prevBest = this.progress.best[this.levelIndex] || 0;
      if (stars > prevBest) {
        this.progress.best[this.levelIndex] = stars;
      }
      const prevScore = this.progress.scores[this.levelIndex] || 0;
      const newRecord = this.score > prevScore;
      if (newRecord) {
        this.progress.scores[this.levelIndex] = this.score;
      }
      if (prevBest !== this.progress.best[this.levelIndex] || newRecord) {
        this._saveProgress();
      }
      if (this.levelIndex >= this.progress.unlocked && this.levelIndex < LevelLoader.getLevelCount()) {
        this.progress.unlocked = this.levelIndex + 1;
        this._saveProgress();
      }

      // Festejo
      this.camera.addShake(4);
      this.particles.confetti(this.camera.center.x, this.camera.center.y - 100, 50);
      this.audio.play('win');

      setTimeout(() => {
        if (this.state === 'WON') {
          this.ui.showVictory({
            score: this.score,
            stars,
            best: this.progress.best,
            hasNext: this.levelIndex < LevelLoader.getLevelCount(),
            level: this.levelIndex,
            bestScore: this.progress.scores[this.levelIndex] || 0,
            newRecord
          });
        }
      }, 700);
      this._updateHUDSoon();
    }

    _defeat() {
      if (this.state !== 'PLAYING') return;
      this.state = 'LOST';
      this.input.setEnabled(false);
      this.audio.play('lose');
      this.ui.showDefeat({ score: this.score, enemiesLeft: this.enemyCount });
    }

    /* ================== HUD ================== */

    _hudData() {
      // La rana sujetada ya está incluida en frogQueue (se descuenta al
      // lanzar), así que NO se suma aparte: antes se contaba dos veces
      // y el HUD mostraba una ranita de más al iniciar el nivel.
      return {
        level: this.levelIndex,
        score: this.score,
        frogsLeft: this.frogQueue + (this.activeFrog ? 1 : 0),
        stars: this.starsEarned,
        levelName: this.levelData ? this.levelData.name : '',
        starGoal: this.starGoal || '',
        bestScore: this.progress.scores[this.levelIndex] || 0
      };
    }

    _updateHUDSoon() {
      this._hudTimer = 0;
    }

    /* ================== BUCLE PRINCIPAL ================== */

    _loop(now) {
      this._raf = requestAnimationFrame((t) => this._loop(t));
      const dt = Math.min((now - this._lastTime) / 1000, 0.05);
      this._lastTime = now;
      this.time += dt;

      this._update(dt);
      this._render();
    }

    _update(dt) {
      // Animaciones comunes
      if (this.scene) this.scene.update(dt);
      this.particles.update(dt);
      this.camera.update(dt);

      // Física solo en partida
      if (this.state === 'PLAYING') {
        this.world.advance(dt);

        // Actualizar entidades
        for (const entity of this.entities) {
          entity.update(dt);
        }

        // Pez globo: detecta proximidad de la rana
        const frogPos = this.activeFrog ? this.activeFrog.position : (this.heldFrog ? this.heldFrog.position : null);
        for (const entity of this.entities) {
          if (entity.entityType === 'pufferfish') {
            const near = frogPos && frogPos.distance(entity.position) < 170;
            entity.setFrogNear(!!near);
          }
        }

        this._updateFrogLifecycle(dt);
      } else if (this.state === 'WON' || this.state === 'LOST') {
        // Seguir simulando para que las estructuras terminen de caer
        this.world.advance(dt);
        for (const entity of this.entities) {
          entity.update(dt);
          if (entity.dead) {
            this.world.removeBody(entity);
          }
        }
        this.entities = this.entities.filter((e) => !e.dead);
      }

      // HUD (limitado a ~7 actualizaciones por segundo)
      this._hudTimer -= dt;
      if (this._hudTimer <= 0) {
        this._hudTimer = 0.15;
        if (this.state === 'PLAYING' || this.state === 'WON') {
          this.ui.updateHUD(this._hudData());
        }
      }
    }

    _render() {
      const hold = this.heldFrog ? this.heldFrog.position : null;
      this.renderer.draw({
        scene: this.scene,
        entities: this.entities,
        particles: this.particles,
        lighting: this.lighting,
        heldFrog: this.heldFrog,
        holdPosition: hold,
        trajectory: this.trajectory,
        trail: this.trail
      });
    }
  }

  NS.Engine = { Engine, CONFIG };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
