/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * js/collision.js
 * ------------------------------------------------------------
 * FASE ESTRECHA (Narrow Phase) del motor físico.
 *
 * Formas soportadas:
 *   - CircleShape (círculo)
 *   - PolygonShape (polígono convexo; cajas, rocas, suelos)
 *
 * Pruebas implementadas:
 *   - Círculo vs Círculo
 *   - Círculo vs Polígono (característica más cercana)
 *   - Polígono vs Polígono (SAT + generación de manifold
 *     por clipping de la cara incidente contra la cara de
 *     referencia — método clásico de motores tipo Box2D)
 *
 * Un `Manifold` describe un contacto:
 *   { normal, depth, contacts[] } con `normal` apuntando
 *   SIEMPRE del cuerpo A hacia el cuerpo B.
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = (global.FrogGame = global.FrogGame || {});
  const { Vec2, MathUtils } = NS.Utils;

  /* ----------------------------------------------------------
   * AABB — caja alineada a los ejes (Broad Phase y utilidades)
   * ---------------------------------------------------------- */
  class AABB {
    constructor(minX = 0, minY = 0, maxX = 0, maxY = 0) {
      this.minX = minX;
      this.minY = minY;
      this.maxX = maxX;
      this.maxY = maxY;
    }

    /** AABB vacío en un punto. */
    static at(x, y) {
      return new AABB(x, y, x, y);
    }

    contains(other) {
      return (
        other.minX >= this.minX &&
        other.minY >= this.minY &&
        other.maxX <= this.maxX &&
        other.maxY <= this.maxY
      );
    }

    /** Une dos AABB (para cuerpos compuestos). */
    merge(other) {
      this.minX = Math.min(this.minX, other.minX);
      this.minY = Math.min(this.minY, other.minY);
      this.maxX = Math.max(this.maxX, other.maxX);
      this.maxY = Math.max(this.maxY, other.maxY);
    }

    overlaps(other) {
      return !(
        other.minX > this.maxX ||
        other.maxX < this.minX ||
        other.minY > this.maxY ||
        other.maxY < this.minY
      );
    }

    static overlaps(a, b) {
      return a.overlaps(b);
    }

    get centerX() {
      return (this.minX + this.maxX) * 0.5;
    }
    get centerY() {
      return (this.minY + this.maxY) * 0.5;
    }
    get width() {
      return this.maxX - this.minX;
    }
    get height() {
      return this.maxY - this.minY;
    }
  }

  /* ----------------------------------------------------------
   * Manifold — contacto entre dos cuerpos
   * ---------------------------------------------------------- */
  class Manifold {
    /**
     * @param {Vec2} normal   Normal unitaria: de A hacia B
     * @param {number} depth  Profundidad de penetración (>= 0)
     * @param {Vec2[]} contacts Puntos de contacto (1 o 2) en coords. mundiales
     */
    constructor(normal, depth, contacts) {
      this.normal = normal;
      this.depth = depth;
      this.contacts = contacts;
      this.a = null; // cuerpo A (lo asigna el World)
      this.b = null; // cuerpo B
      this.key = '';
      this.lastImpact = 0; // cooldown de daño
      this.normalImpulse = 0; // warm-start simple
      this.tangentImpulse = 0;
    }

    get contactCount() {
      return this.contacts.length;
    }
  }

  /* ----------------------------------------------------------
   * Shape — clase base de formas.
   * ---------------------------------------------------------- */
  class Shape {
    constructor(kind) {
      this.kind = kind; // 'circle' | 'polygon'
    }

    /** AABB en coordenadas mundiales dado pos/angle del cuerpo. */
    computeAABB(body, out) {
      throw new Error('computeAABB() debe implementarse');
    }

    /** Masa e inercia (giro) alrededor del centro. */
    computeMass(density, out) {
      throw new Error('computeMass() debe implementarse');
    }
  }

  /* ----------------------------------------------------------
   * CircleShape
   * ---------------------------------------------------------- */
  class CircleShape extends Shape {
    constructor(radius = 10, offset = new Vec2()) {
      super('circle');
      this.radius = radius;
      this.offset = offset.clone();
    }

    computeAABB(body, out) {
      const c = body.position.add(this.offset.rotate(body.angle));
      out.minX = c.x - this.radius;
      out.minY = c.y - this.radius;
      out.maxX = c.x + this.radius;
      out.maxY = c.y + this.radius;
      return out;
    }

    /** Centro del círculo en coords. mundiales. */
    worldCenter(body) {
      return body.position.add(this.offset.rotate(body.angle));
    }

    computeMass(density, out) {
      const m = density * Math.PI * this.radius * this.radius;
      out.mass = m;
      out.inertia = m * this.radius * this.radius * 0.5;
      return out;
    }
  }

  /* ----------------------------------------------------------
   * PolygonShape — polígono convexo en coords. locales.
   * Los vértices deben estar en orden antihorario.
   * ---------------------------------------------------------- */
  class PolygonShape extends Shape {
    /**
     * @param {Vec2[]} vertices Vértices locales (orden antihorario)
     * @param {Vec2} offset     Desplazamiento local respecto al centro del cuerpo
     */
    constructor(vertices = [], offset = new Vec2()) {
      super('polygon');
      this.vertices = vertices.map((v) => v.clone());
      this.offset = offset.clone();
      this._worldVertices = [];
      this._worldNormals = [];
      this._rebuildWorld(this._worldVertices, this._worldNormals);
    }

    /** Crea un rectángulo centrado en (0,0) de w×h. */
    static rect(w, h, offset = new Vec2()) {
      const hw = w * 0.5;
      const hh = h * 0.5;
      return new PolygonShape(
        [
          new Vec2(-hw, -hh),
          new Vec2(hw, -hh),
          new Vec2(hw, hh),
          new Vec2(-hw, hh)
        ],
        offset
      );
    }

    /** Crea un polígono regular (n lados, radio, rotación inicial). */
    static regular(n, radius, angleOffset = 0, offset = new Vec2()) {
      const verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * MathUtils.TAU + angleOffset;
        verts.push(new Vec2(Math.cos(a) * radius, Math.sin(a) * radius));
      }
      return new PolygonShape(verts, offset);
    }

    _rebuildWorld(outV, outN) {
      outV.length = 0;
      outN.length = 0;
      const n = this.vertices.length;
      for (let i = 0; i < n; i++) {
        outV.push(this.vertices[i].add(this.offset));
      }
      for (let i = 0; i < n; i++) {
        const a = outV[i];
        const b = outV[(i + 1) % n];
        const e = b.sub(a);
        // Normal exterior para orden antihorario: (e.y, -e.x)
        outN.push(new Vec2(e.y, -e.x).normalize());
      }
    }

    computeAABB(body, out) {
      const n = this.vertices.length;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const w = this.vertices[i].add(this.offset).rotate(body.angle).add(body.position);
        minX = Math.min(minX, w.x);
        minY = Math.min(minY, w.y);
        maxX = Math.max(maxX, w.x);
        maxY = Math.max(maxY, w.y);
      }
      out.minX = minX;
      out.minY = minY;
      out.maxX = maxX;
      out.maxY = maxY;
      return out;
    }

    /** Vértices mundiales (transformados por el cuerpo). */
    worldVertices(body) {
      const n = this.vertices.length;
      const out = this._worldVertices;
      // Reutilizamos el array interno pero transformado en el momento.
      const res = [];
      for (let i = 0; i < n; i++) {
        const v = this.vertices[i].add(this.offset).rotate(body.angle).add(body.position);
        res.push(v);
        if (out[i]) out[i].copy(v);
        else out.push(v.clone());
      }
      out.length = n;
      return res;
    }

    /** Normales exteriores mundiales. */
    worldNormals(body) {
      const n = this.vertices.length;
      const out = this._worldNormals;
      for (let i = 0; i < n; i++) {
        const a = this.vertices[i].add(this.offset).rotate(body.angle).add(body.position);
        const b = this.vertices[(i + 1) % n].add(this.offset).rotate(body.angle).add(body.position);
        const e = b.sub(a);
        const nl = new Vec2(e.y, -e.x).normalize();
        if (out[i]) out[i].copy(nl);
        else out.push(nl.clone());
      }
      out.length = n;
      return out;
    }

    computeMass(density, out) {
      // Masa por área (bounding box) e inercia de placa rectangular
      // I = m·(w² + h²)/12 — exacta para cajas, aproximación buena
      // para polígonos convexos compactos.
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const v of this.vertices) {
        minX = Math.min(minX, v.x + this.offset.x);
        minY = Math.min(minY, v.y + this.offset.y);
        maxX = Math.max(maxX, v.x + this.offset.x);
        maxY = Math.max(maxY, v.y + this.offset.y);
      }
      const w = Math.max(maxX - minX, 0.1);
      const h = Math.max(maxY - minY, 0.1);
      const m = density * Math.max(w * h, 0.01);
      const inertia = m * (w * w + h * h) / 12;
      out.mass = m;
      out.inertia = inertia;
      return out;
    }
  }

  /* ----------------------------------------------------------
   * PRUEBAS DE COLISIÓN
   * ---------------------------------------------------------- */

  /** Devuelve el manifold círculo-círculo o null. normal: A→B. */
  function circleCircle(A, B) {
    const ca = A.worldCenter(A.body);
    const cb = B.worldCenter(B.body);
    const rSum = A.radius + B.radius;
    const d = ca.sub(cb);
    const dist = d.length();
    if (dist >= rSum) return null;
    let normal;
    if (dist > 1e-6) {
      normal = d.scale(1 / dist); // de B hacia A
    } else {
      normal = new Vec2(0, -1); // coincidentes: empujar hacia arriba
    }
    // Queremos normal de A→B → invertir
    normal = normal.scale(-1);
    const depth = rSum - dist;
    const contact = ca.add(cb).scale(0.5);
    return new Manifold(normal, depth, [contact]);
  }

  /**
   * Círculo vs polígono. `A` es el círculo, `B` el polígono.
   * normal: A→B (del círculo hacia el polígono).
   */
  function circlePolygon(A, B) {
    const center = A.worldCenter(A.body);
    const verts = B.worldVertices(B.body);
    const norms = B.worldNormals(B.body);
    const n = verts.length;

    // 1) Buscar la cara MÁS CERCANA (máxima separación). Si alguna cara
    //    queda más allá del radio → el círculo está separado.
    let maxSep = -Infinity;
    let bestIndex = -1;
    for (let i = 0; i < n; i++) {
      const sep = norms[i].dot(center.sub(verts[i]));
      if (sep > A.radius) return null;
      if (sep > maxSep) {
        maxSep = sep;
        bestIndex = i;
      }
    }

    const faceNormal = norms[bestIndex];
    const faceVertex = verts[bestIndex];

    // 2) Centro dentro del polígono → empujar por la cara más cercana.
    if (maxSep < 0) {
      return new Manifold(faceNormal.scale(-1), A.radius - maxSep, [center.clone()]);
    }

    // 3) Centro fuera: buscar el punto MÁS CERCANO en TODAS las aristas
    //    (maneja correctamente los casos de esquina/vértice).
    let bestDistSq = Infinity;
    let bestPoint = null;
    for (let i = 0; i < n; i++) {
      const va = verts[i];
      const vb = verts[(i + 1) % n];
      const e = vb.sub(va);
      const lenSq = e.lengthSq();
      let t = lenSq > 0 ? center.sub(va).dot(e) / lenSq : 0;
      t = MathUtils.clamp(t, 0, 1);
      const closest = va.add(e.scale(t));
      const d = center.distanceSq(closest);
      if (d < bestDistSq) {
        bestDistSq = d;
        bestPoint = closest;
      }
    }
    if (bestDistSq >= A.radius * A.radius) return null;
    const dist = Math.sqrt(bestDistSq);
    // Normal de A(círculo) → B(polígono): apunta desde el círculo hacia el polígono
    const normal = dist > 1e-6 ? bestPoint.sub(center).normalize() : faceNormal.scale(-1);
    return new Manifold(normal, A.radius - dist, [bestPoint]);
  }

  /**
   * Polígono vs polígono con SAT + clipping. normal: A→B.
   */
  function polygonPolygon(A, B) {
    const va = A.worldVertices(A.body);
    const na = A.worldNormals(A.body);
    const vb = B.worldVertices(B.body);
    const nb = B.worldNormals(B.body);

    // --- 1) Separación máxima sobre las aristas de A ---
    const sepA = findMaxSeparation(va, na, vb);
    if (sepA.sep >= 0) return null;

    // --- 2) Separación máxima sobre las aristas de B ---
    const sepB = findMaxSeparation(vb, nb, va);
    if (sepB.sep >= 0) return null;

    // --- 3) La cara con mayor separación (menos negativa) es la referencia ---
    let refVertices;
    let refNormals;
    let refIndex;
    let incVertices;
    let flipNormal; // si la referencia es B, invertimos la normal final

    if (sepA.sep > sepB.sep) {
      refVertices = va;
      refNormals = na;
      refIndex = sepA.index;
      incVertices = vb;
      flipNormal = false;
    } else {
      refVertices = vb;
      refNormals = nb;
      refIndex = sepB.index;
      incVertices = va;
      flipNormal = true;
    }

    const refN = refNormals[refIndex];
    const refV1 = refVertices[refIndex];
    const refV2 = refVertices[(refIndex + 1) % refVertices.length];

    // --- 4) Cara incidente: la más anti-paralela a la normal de referencia ---
    const incIndex = findIncidentEdge(incVertices, refN);

    // --- 5) Clipping de la cara incidente contra los planos laterales ---
    // Un punto p está dentro del tramo longitudinal de la cara si
    //   e·refV1 <= e·p <= e·refV2  (e = tangente de la cara de referencia)
    const e = refV2.sub(refV1).normalize();
    let seg = [
      incVertices[incIndex],
      incVertices[(incIndex + 1) % incVertices.length]
    ];
    seg = clipSegment(seg, e.scale(-1), refV1.dot(e.scale(-1))); // e·p >= e·refV1
    if (seg.length < 2) return null;
    seg = clipSegment(seg, e, refV2.dot(e)); // e·p <= e·refV2
    if (seg.length < 2) return null;

    // --- 6) Quedarse con puntos detrás del plano frontal de la cara ---
    const contacts = [];
    let maxDepth = -Infinity;
    for (const p of seg) {
      const d = refN.dot(p.sub(refV1));
      if (d <= 0) {
        contacts.push(p);
        maxDepth = Math.max(maxDepth, -d);
      }
    }
    if (contacts.length === 0) return null;

    // Punto de contacto ÚNICO en el punto medio de la cara incidente:
    // para contacto cara-cara queda alineado con el centro de masa
    // (torque cero → pilas estables); para caras inclinadas se desplaza
    // hacia la esquina profunda → torque que endereza el cuerpo.
    const normal = flipNormal ? refN.scale(-1) : refN.clone();
    const mid = contacts.reduce((acc, p) => acc.add(p), new Vec2(0, 0)).scale(1 / contacts.length);
    return new Manifold(normal, maxDepth > 0 ? maxDepth : 0.001, [mid]);
  }

  /**
   * Busca la arista de `va` con la separación máxima respecto a `vb`.
   * Devuelve { index, sep } donde sep es la separación SIGNED a lo
   * largo de la normal de la arista (negativa si hay penetración).
   */
  function findMaxSeparation(va, na, vb) {
    let bestIndex = 0;
    let bestSep = -Infinity;
    for (let i = 0; i < va.length; i++) {
      const n = na[i];
      const v = va[i];
      // Vértice MÁS PROFUNDO de vb contra esta cara (mínima separación)
      let sep = Infinity;
      for (const b of vb) {
        const s = n.dot(b.sub(v));
        if (s < sep) sep = s;
      }
      // Máxima separación entre todas las caras = eje con menos penetración
      if (sep > bestSep) {
        bestSep = sep;
        bestIndex = i;
      }
    }
    return { index: bestIndex, sep: bestSep };
  }

  /** Cara de `v` con normal más anti-paralela a refN (cara enfrentada). */
  function findIncidentEdge(v, refN) {
    // Normales EXTERIORES: para orden antihorario, (e.y, -e.x).
    const n = v.length;
    let best = 0;
    let bestDot = Infinity;
    for (let i = 0; i < n; i++) {
      const a = v[i];
      const b = v[(i + 1) % n];
      const e = b.sub(a);
      const normal = new Vec2(e.y, -e.x).normalize();
      const d = normal.dot(refN);
      if (d < bestDot) {
        bestDot = d;
        best = i;
      }
    }
    return best;
  }

  /** Recorta un segmento al semiplano n·p <= offset. Devuelve [p1, p2] (1 o 2 puntos). */
  function clipSegment(seg, n, offset) {
    const out = [];
    const [p1, p2] = seg;
    const d1 = n.dot(p1) - offset;
    const d2 = n.dot(p2) - offset;
    if (d1 <= 0) out.push(p1);
    if (d2 <= 0) out.push(p2);
    if (d1 * d2 < 0) {
      const t = d1 / (d1 - d2);
      out.push(new Vec2(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t));
    }
    return out;
  }

  /**
   * Punto de entrada: detecta colisión entre dos cuerpos con forma.
   * `a` y `b` deben tener `.body` y `.shape`. Devuelve Manifold|null
   * con normal de a→b.
   */
  function collide(a, b) {
    const kind = a.kind < b.kind ? a.kind + '_' + b.kind : b.kind + '_' + a.kind;
    switch (kind) {
      case 'circle_circle':
        return circleCircle(a, b);
      case 'circle_polygon':
        return a.kind === 'circle' ? circlePolygon(a, b) : invert(circlePolygon(b, a));
      case 'polygon_polygon':
        return polygonPolygon(a, b);
      default:
        return null;
    }
  }

  /** Invierte un manifold (normal de b→a). */
  function invert(m) {
    if (!m) return null;
    m.normal = m.normal.scale(-1);
    return m;
  }

  NS.Collision = { AABB, Manifold, CircleShape, PolygonShape, collide };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
