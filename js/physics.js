/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/physics.js
 * ------------------------------------------------------------
 * MOTOR FÍSICO PROPIO — implementado desde cero, sin librerías.
 *
 * Componentes:
 *   - Body        : cuerpo rígido (masa, inercia, centro de masa,
 *                   velocidad lineal/angular, fricción, restitución,
 *                   damping, sleeping).
 *   - BroadPhase  : rejilla espacial hash → pares candidatos AABB.
 *   - NarrowPhase : js/collision.js (SAT, círculo-polígono...).
 *   - Solver      : resolución por impulsos lineales + angulares
 *                   (torque), fricción tangencial, corrección
 *                   posicional (Baumgarte), restitución y sleeping.
 *
 * Integración: semi-implícita (symplectic Euler), timestep fijo.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils } = NS.Utils;
  const { AABB, Manifold, CircleShape, PolygonShape, collide } = NS.Collision;

  /* ----------------------------------------------------------
   * Constantes globales de simulación
   * ---------------------------------------------------------- */
  const PHYSICS = {
    FIXED_DT: 1 / 60, // timestep físico fijo
    MAX_DT: 0.05, // clamp del dt de frame
    VELOCITY_ITERATIONS: 8, // iteraciones del solver de velocidad
    POSITION_ITERATIONS: 4, // iteraciones de corrección posicional
    GRAVITY: new Vec2(0, 1400),
    SLEEP_LINEAR: 45, // px/s bajo el cual un cuerpo puede dormir
    SLEEP_ANGULAR: 0.5, // rad/s
    SLEEP_TIME: 0.35, // segundos bajo el umbral para dormir
    SLOP: 0.02, // holgura de penetración tolerada
    BAUMGARTE: 0.25, // fracción de corrección posicional por paso
    MAX_LINEAR_CORRECTION: 2.0, // tope por contacto/iteración (evita inyección de energía)
    RESTITUTION_THRESHOLD: -80, // velocidad normal mínima para rebotar
    WAKE_IMPACT_SPEED: 90, // velocidad de cierre que despierta a un cuerpo dormido
    ALLOW_SLEEPING: true
  };

  /* ----------------------------------------------------------
   * Body — cuerpo rígido
   * ---------------------------------------------------------- */
  class Body {
    static _idCounter = 0;

    /**
     * @param {object} opts
     * @param {Vec2}   opts.position   Centro del cuerpo (mundo)
     * @param {number} opts.angle      Ángulo inicial (rad)
     * @param {boolean} opts.isStatic  Cuerpo fijo (suelo, rocas decorativas)
     * @param {Shape}  opts.shape      CircleShape | PolygonShape
     * @param {number} opts.density    Densidad (masa por área)
     * @param {number} opts.mass       Masa directa (si se da, se ignora density)
     * @param {number} opts.restitution Coeficiente de rebote 0..1
     * @param {number} opts.friction    Coeficiente de fricción
     * @param {Vec2}   opts.comOffset   Desplazamiento del centro de masa local
     */
    constructor(opts = {}) {
      this.id = 'b' + Body._idCounter++;
      this.position = (opts.position || new Vec2()).clone();
      this.angle = opts.angle || 0;
      this.velocity = new Vec2();
      this.angularVelocity = 0;
      this.force = new Vec2(); // fuerza acumulada por paso (para gravedad por cuerpo)
      this.torque = 0;

      this.isStatic = !!opts.isStatic;
      this.shape = opts.shape || new CircleShape(10);
      this.shape.body = this;
      this.density = opts.density ?? 1;
      this._explicitMass = opts.mass !== undefined && opts.mass !== null;
      this.mass = opts.mass ?? 1;
      this.invMass = this.isStatic ? 0 : 1 / this.mass;
      this.inertia = opts.inertia ?? 1;
      this.invInertia = this.isStatic ? 0 : 1 / this.inertia;

      this.restitution = opts.restitution ?? 0.1;
      this.friction = opts.friction ?? 0.4;
      this.linearDamping = opts.linearDamping ?? 0.02;
      this.angularDamping = opts.angularDamping ?? 0.08;

      this.comOffset = (opts.comOffset || new Vec2()).clone();
      this.sleeping = false;
      this.sleepTime = 0;
      this.active = true;

      // Metadatos de juego (entidades, materiales...)
      this.tags = new Set(opts.tags || []);
      this.userData = opts.userData || null;

      this.aabb = new AABB();
      this.updateMass();
      this.updateAABB();
    }

    /** Centro de masa en coordenadas mundiales. */
    get com() {
      return this.position.add(this.comOffset.rotate(this.angle));
    }

    get isAwake() {
      return !this.sleeping;
    }

    setMass(mass) {
      this._explicitMass = true;
      this.mass = mass;
      this.invMass = this.isStatic ? 0 : 1 / mass;
      this.updateMass();
    }

    /**
     * Recalcula masa e inercia a partir de la forma.
     * Si se indicó `mass` explícitamente, se respeta ese valor y solo
     * se recalcula la inercia (según la geometría). En caso contrario
     * la masa deriva de la densidad × área.
     */
    updateMass() {
      if (this.isStatic) {
        this.mass = Infinity;
        this.invMass = 0;
        this.inertia = Infinity;
        this.invInertia = 0;
        return;
      }
      const unit = { mass: 0, inertia: 0 };
      this.shape.computeMass(1, unit); // densidad 1 → masa = área
      const factor = unit.mass > 0 ? unit.inertia / unit.mass : 1; // momento unitario
      this.mass = this._explicitMass ? this.mass : Math.max(this.density * unit.mass, 0.001);
      this.invMass = 1 / this.mass;
      this.inertia = Math.max(this.mass * factor, 0.001);
      this.invInertia = 1 / this.inertia;
    }

    /** Aplica un impulso en un punto del mundo (provoca rotación). */
    applyImpulse(impulse, point = null) {
      if (this.isStatic) return;
      this.wake();
      const p = point || this.com;
      const r = p.sub(this.com);
      this.velocity = this.velocity.addScaled(impulse, this.invMass);
      this.angularVelocity += this.invInertia * r.cross(impulse);
    }

    applyForceAt(f, point = null) {
      if (this.isStatic) return;
      const p = point || this.com;
      this.force = this.force.add(f);
      this.torque += p.sub(this.com).cross(f);
    }

    wake() {
      if (this.sleeping) {
        this.sleeping = false;
        this.sleepTime = 0;
      }
    }

    trySleep() {
      if (!PHYSICS.ALLOW_SLEEPING || this.isStatic) return;
      const speed = this.velocity.length();
      if (speed < PHYSICS.SLEEP_LINEAR && Math.abs(this.angularVelocity) < PHYSICS.SLEEP_ANGULAR) {
        this.sleepTime += PHYSICS.FIXED_DT;
        if (this.sleepTime >= PHYSICS.SLEEP_TIME) {
          this.sleeping = true;
          this.velocity.set(0, 0);
          this.angularVelocity = 0;
        }
      } else {
        this.sleepTime = 0;
      }
    }

    updateAABB() {
      this.shape.computeAABB(this, this.aabb);
    }

    /** Devuelve el centro del mundo del cuerpo (forma). */
    getWorldCenter() {
      if (this.shape instanceof CircleShape) return this.shape.worldCenter(this);
      return this.position;
    }
  }

  /* ----------------------------------------------------------
   * BroadPhase — rejilla espacial hash
   * ---------------------------------------------------------- */
  class BroadPhase {
    constructor(cellSize = 96) {
      this.cellSize = cellSize;
      this._grid = new Map();
      this._pairKeys = new Set();
    }

    _cellKey(cx, cy) {
      // Hash espacial clásico para evitar colisiones de claves.
      return (cx * 73856093) ^ (cy * 19349663);
    }

    _insert(body) {
      const bb = body.aabb;
      const minX = Math.floor(bb.minX / this.cellSize);
      const maxX = Math.floor(bb.maxX / this.cellSize);
      const minY = Math.floor(bb.minY / this.cellSize);
      const maxY = Math.floor(bb.maxY / this.cellSize);
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const key = this._cellKey(cx, cy);
          if (!this._grid.has(key)) this._grid.set(key, []);
          this._grid.get(key).push(body);
        }
      }
    }

    /**
     * Construye la lista de pares candidatos (AABB overlap).
     * @returns {Array<[Body, Body]>}
     */
    update(bodies) {
      this._grid.clear();
      this._pairKeys.clear();
      const pairs = [];
      for (const body of bodies) {
        if (!body.active) continue;
        this._insert(body);
      }
      for (const cell of this._grid.values()) {
        for (let i = 0; i < cell.length; i++) {
          for (let j = i + 1; j < cell.length; j++) {
            const a = cell[i];
            const b = cell[j];
            if (a.isStatic && b.isStatic) continue;
            if (a.id === b.id) continue;
            const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
            if (this._pairKeys.has(key)) continue;
            this._pairKeys.add(key);
            if (a.aabb.overlaps(b.aabb)) {
              pairs.push([a, b]);
            }
          }
        }
      }
      return pairs;
    }
  }

  /* ----------------------------------------------------------
   * World — simulación completa
   * ---------------------------------------------------------- */
  class World {
    constructor(opts = {}) {
      this.gravity = opts.gravity || PHYSICS.GRAVITY.clone();
      this.bodies = [];
      this.contacts = []; // manifolds del último paso
      this.broadPhase = new BroadPhase(opts.cellSize);
      this.velocityIterations = opts.velocityIterations ?? PHYSICS.VELOCITY_ITERATIONS;
      this.positionIterations = opts.positionIterations ?? PHYSICS.POSITION_ITERATIONS;
      this.accumulator = 0;
      this.time = 0;

      /** Callback de impacto: onImpact(a, b, relativeSpeed) */
      this.onImpact = null;
      this._impactKeys = new Map();
      this.frame = 0;

      /**
       * Warm starting: impulsos acumulados por par de cuerpos entre
       * frames (clave → { a, b, frame, jn[], jt[], tangent }).
       * Es lo que da estabilidad a las pilas en reposo.
       */
      this._warmCache = new Map();
    }

    addBody(body) {
      if (this.bodies.includes(body)) return body;
      this.bodies.push(body);
      return body;
    }

    removeBody(body) {
      const i = this.bodies.indexOf(body);
      if (i >= 0) this.bodies.splice(i, 1);
      // Limpiar warm cache del cuerpo eliminado
      for (const [key, e] of this._warmCache) {
        if (e.a === body || e.b === body) this._warmCache.delete(key);
      }
    }

    clear() {
      this.bodies.length = 0;
      this.contacts.length = 0;
      this._impactKeys.clear();
      this._warmCache.clear();
    }

    /** Paso fijo recomendado: usar fixedStep() o advance(dt). */
    advance(dt) {
      this.accumulator += Math.min(dt, PHYSICS.MAX_DT);
      let steps = 0;
      while (this.accumulator >= PHYSICS.FIXED_DT && steps < 5) {
        this.fixedStep();
        this.accumulator -= PHYSICS.FIXED_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;
    }

    fixedStep() {
      this.time += PHYSICS.FIXED_DT;
      this._integrate(PHYSICS.FIXED_DT);

      // Broad phase
      const pairs = this.broadPhase.update(this.bodies);

      // Narrow phase
      const manifolds = [];
      for (const [a, b] of pairs) {
        if (!a.active || !b.active) continue;
        const m = collide(a.shape, b.shape);
        if (m) {
          m.a = a;
          m.b = b;
          m.key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
          manifolds.push(m);
        }
      }

      // Velocidad de cierre PRE-solver (para impactos/daño, antes de
      // que el solver invierta la velocidad con la restitución).
      for (const m of manifolds) m.preSolveSpeed = this._closingSpeed(m);

      // Warm starting: re-aplicar los impulsos acumulados del frame
      // anterior como velocidad inicial (estabilidad de pilas).
      this.frame++;
      for (const m of manifolds) this._warmStart(m);

      // Solver de velocidad + posición
      for (let iter = 0; iter < this.velocityIterations; iter++) {
        for (const m of manifolds) this._solveVelocity(m);
      }
      for (let iter = 0; iter < this.positionIterations; iter++) {
        for (const m of manifolds) this._solvePosition(m);
      }

      // Guardar impulsos acumulados para el siguiente frame
      for (const m of manifolds) this._storeWarm(m);

      // Impactos (daño / sonido)
      this._emitImpacts(manifolds);

      // Sleeping: un cuerpo dormido solo se despierta si lo golpea un
      // cuerpo DINÁMICO despierto con energía real (impacto). Un contacto
      // EN REPOSO no lo despierta — de lo contrario la última pieza en
      // asentarse re-despertaría toda la pila en bucle infinito.
      if (PHYSICS.ALLOW_SLEEPING) {
        for (const m of manifolds) {
          const a = m.a;
          const b = m.b;
          if (a.isStatic || b.isStatic) continue;
          if (a.isAwake && b.isAwake) continue;
          const impact = m.preSolveSpeed > PHYSICS.WAKE_IMPACT_SPEED;
          if (impact) {
            if (!a.isAwake) a.wake();
            if (!b.isAwake) b.wake();
          }
        }
        for (const body of this.bodies) {
          if (body.active && !body.isStatic) body.trySleep();
        }
      }

      this.contacts = manifolds;
    }

    _integrate(dt) {
      const g = this.gravity;
      for (const body of this.bodies) {
        if (!body.active || body.isStatic) continue;
        if (body.sleeping) continue;

        // Aplicar gravedad + fuerzas
        body.velocity = body.velocity.addScaled(g, dt);
        if (body.force.lengthSq() > 0) {
          body.velocity = body.velocity.addScaled(body.force, body.invMass * dt);
          body.angularVelocity += body.torque * body.invInertia * dt;
        }
        body.force.set(0, 0);
        body.torque = 0;

        // Damping
        const damp = Math.max(0, 1 - body.linearDamping * dt);
        body.velocity = body.velocity.scale(damp);
        body.angularVelocity *= Math.max(0, 1 - body.angularDamping * dt);

        // Integración semi-implícita
        body.position = body.position.addScaled(body.velocity, dt);
        body.angle += body.angularVelocity * dt;

        body.updateAABB();
      }
    }

    /** Re-aplica los impulsos acumulados del frame anterior. */
    _warmStart(m) {
      const prev = this._warmCache.get(m.key);
      const zeroPoints = () => { m.points = m.contacts.map(() => ({ jn: 0, jt: 0 })); };
      if (!prev || prev.a !== m.a || prev.b !== m.b || prev.frame !== this.frame - 1) {
        zeroPoints();
        return;
      }
      // Solo warm start si la geometría del contacto es similar
      if (prev.normal.dot(m.normal) < 0.95) {
        zeroPoints();
        return;
      }
      // Solo warm start en contactos EN REPOSO: si el par se acerca
      // rápido (impacto nuevo) o se separa, no re-aplicar impulsos viejos
      const vn = this._closingSpeed(m);
      if (vn < -60 || vn > 0) {
        zeroPoints();
        return;
      }
      const a = m.a;
      const b = m.b;
      const n = m.normal;
      m.points = m.contacts.map((contact, i) => ({
        jn: prev.jn[i] || 0,
        jt: 0 // la fricción se re-resuelve cada frame (la tangente con
        // velocidad relativa ~0 es ambigua y causaría deriva lateral)
      }));
      for (let i = 0; i < m.contacts.length; i++) {
        const P = n.scale(m.points[i].jn);
        if (P.lengthSq() < 1e-12) continue;
        const rA = m.contacts[i].sub(a.com);
        const rB = m.contacts[i].sub(b.com);
        a.velocity = a.velocity.addScaled(P, -a.invMass);
        a.angularVelocity -= a.invInertia * rA.cross(P);
        b.velocity = b.velocity.addScaled(P, b.invMass);
        b.angularVelocity += b.invInertia * rB.cross(P);
      }
    }

    /** Guarda los impulsos acumulados para el próximo frame. */
    _storeWarm(m) {
      this._warmCache.set(m.key, {
        a: m.a,
        b: m.b,
        frame: this.frame,
        normal: m.normal.clone(),
        jn: m.points.map((p) => p.jn)
      });
    }

    /**
     * Resuelve la velocidad a lo largo de la normal y la tangente
     * (impulso normal con restitución + fricción con tope de Coulomb,
     * acumulado por contacto para el warm starting).
     */
    _solveVelocity(m) {
      const a = m.a;
      const b = m.b;
      const invMa = a.invMass;
      const invMb = b.invMass;
      if (invMa === 0 && invMb === 0) return;

      const n = m.normal;
      // IMPULSO EN CADA punto de contacto (un manifold puede tener 2)
      for (let i = 0; i < m.contacts.length; i++) {
        const contact = m.contacts[i];
        const point = m.points[i];
        const rA = contact.sub(a.com);
        const rB = contact.sub(b.com);
        const rv = b.velocity.add(rB.perp().scale(b.angularVelocity))
          .sub(a.velocity).sub(rA.perp().scale(a.angularVelocity));
        const vn = rv.dot(n);

        // Separándose: dejar que el impulso acumulado se desvanezca
        // (evita que un impulso de impacto viejo se reaplique después)
        if (vn >= 0) {
          point.jn *= 0.85;
          point.jt *= 0.85;
          continue;
        }

        // Velocidad de cierre normal negativa = acercándose
        if (vn < 0) {
          // Restitución completa solo en impactos fuertes
          const e = vn < PHYSICS.RESTITUTION_THRESHOLD ? Math.max(a.restitution, b.restitution) : 0;
          const rnA = rA.cross(n);
          const rnB = rB.cross(n);
          // OJO: los términos angulares usan la INERCIA inversa
          const denom = invMa + invMb + a.invInertia * rnA * rnA + b.invInertia * rnB * rnB;
          const jn = denom > 0 ? -(1 + e) * vn / denom : 0;
          const newJn = Math.max(point.jn + jn, 0); // no tirar de los cuerpos
          const jnDelta = newJn - point.jn;
          point.jn = newJn;
          const impulse = n.scale(jnDelta);

          // Fricción tangencial (impulso con tope de Coulomb acumulado)
          const tangent = rv.addScaled(n, -vn);
          const vt = tangent.length();
          if (vt > 1e-6) {
            const t = tangent.scale(1 / vt);
            const rnAt = rA.cross(t);
            const rnBt = rB.cross(t);
            const denomT = invMa + invMb + a.invInertia * rnAt * rnAt + b.invInertia * rnBt * rnBt;
            const jt = denomT > 0 ? -vt / denomT : 0;
            const mu = Math.sqrt(a.friction * b.friction);
            const newJt = MathUtils.clamp(point.jt + jt, -mu * newJn, mu * newJn);
            const jtDelta = newJt - point.jt;
            point.jt = newJt;
            const tImpulse = t.scale(jtDelta);
            // A recibe -tImpulse, B recibe +tImpulse
            a.velocity = a.velocity.addScaled(tImpulse, -invMa);
            b.velocity = b.velocity.addScaled(tImpulse, invMb);
            a.angularVelocity += a.invInertia * rA.cross(tImpulse.scale(-1));
            b.angularVelocity += b.invInertia * rB.cross(tImpulse);
          }

          // A recibe -impulse, B recibe +impulse (en el punto de contacto)
          a.velocity = a.velocity.addScaled(impulse, -invMa);
          b.velocity = b.velocity.addScaled(impulse, invMb);
          a.angularVelocity += a.invInertia * rA.cross(impulse.scale(-1));
          b.angularVelocity += b.invInertia * rB.cross(impulse);
          // NOTA: no se llama wake() aquí — los impulsos de reposo no deben
          // despertar cuerpos dormidos; el despertar lo gestiona fixedStep.
        }
      }
    }

    /**
     * Corrección posicional (Baumgarte) con corrección ANGULAR:
     * los cuerpos se desplazan Y se rotan para salir de la penetración
     * (los momentos se reparten según masa/inercia inversas). Esto
     * mantiene las pilas rectas: una inclinación accidental produce
     * penetración asimétrica que se corrige rotando el bloque.
     */
    _solvePosition(m) {
      const a = m.a;
      const b = m.b;
      const invMa = a.invMass;
      const invMb = b.invMass;
      if (invMa === 0 && invMb === 0) return;
      const n = m.normal;
      const pen = Math.max(m.depth - PHYSICS.SLOP, 0);
      if (pen <= 0) return;
      for (const contact of m.contacts) {
        const rA = contact.sub(a.com);
        const rB = contact.sub(b.com);
        const rnA = rA.cross(n);
        const rnB = rB.cross(n);
        const kNormal = invMa + invMb + a.invInertia * rnA * rnA + b.invInertia * rnB * rnB;
        if (kNormal <= 0) continue;
        const corr = Math.min(pen / kNormal * PHYSICS.BAUMGARTE, PHYSICS.MAX_LINEAR_CORRECTION);
        const push = n.scale(corr);
        a.position = a.position.addScaled(push, -invMa);
        b.position = b.position.addScaled(push, invMb);
        a.angle -= a.invInertia * rA.cross(push);
        b.angle += b.invInertia * rB.cross(push);
      }
      a.updateAABB();
      b.updateAABB();
    }

    /** Velocidad de cierre a lo largo de la normal (positiva = acercándose). */
    _closingSpeed(m) {
      const a = m.a;
      const b = m.b;
      const n = m.normal;
      const contact = m.contacts[0];
      const rA = contact.sub(a.com);
      const rB = contact.sub(b.com);
      const rv = b.velocity.add(rB.perp().scale(b.angularVelocity))
        .sub(a.velocity).sub(rA.perp().scale(a.angularVelocity));
      return -rv.dot(n);
    }

    /** Detecta impactos significativos y los reporta al callback. */
    _emitImpacts(manifolds) {
      if (!this.onImpact) return;
      const now = this.time;
      for (const m of manifolds) {
        const a = m.a;
        const b = m.b;
        if (a.isStatic && b.isStatic) continue;
        const speed = m.preSolveSpeed || 0; // velocidad PRE-solver
        if (speed < 90) continue;

        const key = m.key;
        const last = this._impactKeys.get(key) || 0;
        if (now - last < 0.08) continue;
        this._impactKeys.set(key, now);
        this.onImpact(a, b, speed, m);
      }
    }

    /** Raycast simple AABB (para trayectoria/hints) — no usado por física. */
    raycast(origin, dir, maxDist) {
      // Devuelve la distancia al primer AABB intersectado (util para UI).
      let best = maxDist;
      for (const body of this.bodies) {
        if (!body.active) continue;
        const t = rayAABB(origin, dir, body.aabb);
        if (t !== null && t < best) best = t;
      }
      return best;
    }
  }

  /** Intersección rayo-AABB (slab method). Devuelve t o null. */
  function rayAABB(origin, dir, bb) {
    let tmin = 0;
    let tmax = Infinity;
    if (Math.abs(dir.x) < 1e-9) {
      if (origin.x < bb.minX || origin.x > bb.maxX) return null;
    } else {
      let t1 = (bb.minX - origin.x) / dir.x;
      let t2 = (bb.maxX - origin.x) / dir.x;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    if (Math.abs(dir.y) < 1e-9) {
      if (origin.y < bb.minY || origin.y > bb.maxY) return null;
    } else {
      let t1 = (bb.minY - origin.y) / dir.y;
      let t2 = (bb.maxY - origin.y) / dir.y;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin <= maxDist ? tmin : null;
  }

  NS.Physics = { Body, BroadPhase, World, PHYSICS };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
