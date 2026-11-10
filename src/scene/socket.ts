import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PartId } from '../data/socket-lesson';
import { faultFor, type Level } from '../data/wiring-faults';

export type ColourScheme = 'current' | 'legacy';
export type SceneMode = 'explore' | 'wire';
/** The three conductors, and the three terminals they belong on (same names). */
export type WireId = 'line' | 'neutral' | 'earth';
export const WIRE_IDS: WireId[] = ['line', 'neutral', 'earth'];
export type Assignments = Record<WireId, WireId | null>;

export interface ProjectedAnchor {
  id: PartId;
  x: number;
  y: number;
  visible: boolean;
  occluded: boolean;
}

// 1 scene unit = 10 mm.
const W = 8.6; // back box / faceplate width and height (86 mm)
const D = 3.5; // back box depth (35 mm)
const T = 0.12; // box wall thickness
const REAR_Z = -2.7; // plate-local z of the socket body's rear face
const CABLE_X = 1.8;

// Pose of the plate when pulled out of the box, and when screwed onto it.
const PULLED_POS = new THREE.Vector3(-8.2, 4.2, 6.5);
const PULLED_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, Math.PI + 0.45, -0.1));
const FITTED_POS = new THREE.Vector3(0, 0, D / 2 + 0.3);
const FITTED_QUAT = new THREE.Quaternion();
// Where the cable ends (in plate space): out in front when pulled out, tucked inside the box when fitted.
const S_PULLED = new THREE.Vector3(0.5, -3.4, -5.8);
const S_FITTED = new THREE.Vector3(0.5, -3.75, -2.2);
const CABLE_BOX_PTS = [
  new THREE.Vector3(CABLE_X, -14, -1.5),
  new THREE.Vector3(CABLE_X, -8.5, -1.1),
  new THREE.Vector3(CABLE_X, -4.9, -1.1),
  new THREE.Vector3(CABLE_X, -3.75, -1.1),
];
const CABLE_P4 = new THREE.Vector3(CABLE_X - 0.2, -0.8, 0.9);
const CABLE_P5 = new THREE.Vector3(0.8, 1.2, 3.0);
// When fitted, the earth core and the tail run inside the box (world space).
const FIT_CPC_VIA = [
  new THREE.Vector3(-2.6, -3.3, -0.9),
  new THREE.Vector3(-2.4, -1.2, -1.1),
  new THREE.Vector3(-2.4, 2.3, -1.1),
];
const FIT_TAIL = [
  new THREE.Vector3(-3.1, -0.6, -1.1),
  new THREE.Vector3(-3.2, 0.2, -1.1),
  new THREE.Vector3(-3.2, 1.4, -1.1),
  new THREE.Vector3(-2.9, 2.8, -1.1),
  new THREE.Vector3(-1.4, 3.5, -1.3),
];

const COLOURS = {
  brown: 0x6b3f1d,
  blue: 0x1f5fbf,
  red: 0xc6281d,
  black: 0x161616,
};

interface PartEntry {
  meshes: THREE.Mesh[];
  mats: Set<THREE.MeshStandardMaterial>;
}

interface Conductor {
  id: WireId;
  mat: THREE.MeshStandardMaterial;
  /** Offset of this core inside the cable end, along the cable's local axes. */
  off: [number, number];
  ins: THREE.Mesh;
  bare: THREE.Mesh;
  /** Invisible, fatter copy of the core so it is easy to click. */
  hit: THREE.Mesh;
  /** 0 = resting, 1 = lifted out of the cable (hover). Only affects loose cores. */
  lift: number;
}

interface TerminalInfo {
  entry: THREE.Vector3;
  dir: THREE.Vector3;
}

function std(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...opts });
}

function brass() {
  return std(0xc9a54a, { metalness: 0.85, roughness: 0.32 });
}

function copper() {
  return std(0xc8743a, { metalness: 0.9, roughness: 0.3 });
}

function stripedTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 64;
  const g = c.getContext('2d')!;
  const bands = ['#2f9e4f', '#f2c40f', '#2f9e4f', '#f2c40f'];
  bands.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, (i * 64) / 4, 8, 64 / 4);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function letterMaterial(ch: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a3a36';
  g.font = '700 92px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true });
}

export class SocketScene {
  onSelect: (id: PartId | null) => void = () => {};
  onFrame: (anchors: ProjectedAnchor[]) => void = () => {};
  /** Fired whenever the wire-it state changes (mode, selection or connections). */
  onWiringChange: () => void = () => {};

  private mode: SceneMode = 'explore';
  private conductors = new Map<WireId, Conductor>();
  private terminalInfo = new Map<WireId, TerminalInfo>();
  private terminalMats = new Map<WireId, THREE.MeshStandardMaterial[]>();
  private assignments: Assignments = { line: null, neutral: null, earth: null };
  private activeConductor: WireId | null = null;
  private hoverConductor: WireId | null = null;
  private hoverTerminal: WireId | null = null;
  // Fitting the faceplate: `fit` moves the plate (0 pulled out .. 1 on the box), then `screw` turns the screws.
  private fitWanted = false;
  private fit = 0;
  private screw = 0;
  private screwHeads: THREE.Mesh[] = [];
  private cableMesh!: THREE.Mesh;
  private capMesh!: THREE.Mesh;
  private tailMesh!: THREE.Mesh;
  private tailBareMesh!: THREE.Mesh;
  private sheathAnchorObj!: THREE.Object3D;
  private tailAnchorObj!: THREE.Object3D;
  private sheathEnd = new THREE.Vector3();
  private tEnd = new THREE.Vector3();
  private n1 = new THREE.Vector3();
  private n2 = new THREE.Vector3();
  private zOut = new THREE.Vector3();
  private cpcVia: THREE.Vector3[] = [];

  private host: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private parts = new Map<PartId, PartEntry>();
  private anchors = new Map<PartId, THREE.Object3D>();
  private pickables: THREE.Mesh[] = [];
  private wirePickables: THREE.Mesh[] = [];
  private selected: PartId | null = null;
  private plate = new THREE.Group();
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private lineMat = std(COLOURS.brown, { roughness: 0.45 });
  private neutralMat = std(COLOURS.blue, { roughness: 0.45 });

  private defaultPos = new THREE.Vector3(9, 7, 35);
  private defaultTarget = new THREE.Vector3(-3.2, 0.2, 4);
  private tween: {
    t: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;
  private lastTime = 0;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    host.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(10, 16, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 24;
    sc.bottom = -24;
    sc.near = 1;
    sc.far = 80;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb9c4d6, 0.5));

    // Invisible "wall" that only catches shadows.
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 60),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    wall.position.set(0, 0, -D / 2 - 0.05);
    wall.receiveShadow = true;
    this.scene.add(wall);

    this.buildBackBox();
    this.buildPlate();
    this.buildCableAndConductors();

    this.camera.position.copy(this.defaultPos);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 48;
    this.controls.update();

    this.bindPicking();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    this.start();
  }

  /* ------------------------------ public API ------------------------------ */

  /** Start (or resume) rendering. Call pause() when the chapter is hidden. */
  start() {
    this.resize();
    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  pause() {
    this.renderer.setAnimationLoop(null);
  }

  select(id: PartId | null) {
    this.selected = id;
    if (id && this.anchors.has(id)) {
      const p = new THREE.Vector3();
      this.anchors.get(id)!.getWorldPosition(p);
      const target = this.defaultTarget.clone().lerp(p, 0.45);
      this.flyTo(this.camera.position.clone(), target);
    }
  }

  resetView() {
    this.selected = null;
    this.flyTo(this.defaultPos.clone(), this.defaultTarget.clone());
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on && !this.reduced;
    this.controls.autoRotateSpeed = 1.2;
  }

  setColourScheme(scheme: ColourScheme) {
    this.lineMat.color.set(scheme === 'current' ? COLOURS.brown : COLOURS.red);
    this.neutralMat.color.set(scheme === 'current' ? COLOURS.blue : COLOURS.black);
  }

  /* ------------------------------- wire-it mode ------------------------------ */

  setMode(mode: SceneMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.selected = null;
    this.activeConductor = null;
    // Always start from the plate pulled out (instantly, no animation).
    this.fitWanted = false;
    this.fit = 0;
    this.screw = 0;
    this.applyScrew();
    this.setFit(0);
    if (mode === 'wire') this.setAssignments({ line: null, neutral: null, earth: null });
    else this.setAssignments({ line: 'line', neutral: 'neutral', earth: 'earth' });
    // Wire mode moves in closer to the plate; explore mode returns to the full view.
    const wv = this.wireView();
    this.flyTo(mode === 'wire' ? wv.pos : this.defaultPos.clone(), mode === 'wire' ? wv.target : this.defaultTarget.clone());
    this.onWiringChange();
  }

  /** Pick up a conductor (detaching it if connected). Same one again puts it down. */
  selectConductor(id: WireId | null) {
    if (this.mode !== 'wire' || this.fitWanted) return;
    if (id !== null && id === this.activeConductor) {
      this.activeConductor = null;
    } else {
      if (id !== null && this.assignments[id] !== null) {
        this.assignments[id] = null;
        this.rebuildConductor(this.conductors.get(id)!);
      }
      this.activeConductor = id;
    }
    this.onWiringChange();
  }

  /** Connect the picked-up conductor to a terminal (swapping out any occupant). */
  assignToTerminal(terminal: WireId) {
    const id = this.activeConductor;
    if (this.mode !== 'wire' || this.fitWanted || id === null) return;
    for (const other of WIRE_IDS) {
      if (other !== id && this.assignments[other] === terminal) {
        this.assignments[other] = null;
        this.rebuildConductor(this.conductors.get(other)!);
      }
    }
    this.assignments[id] = terminal;
    this.rebuildConductor(this.conductors.get(id)!);
    this.activeConductor = null;
    this.onWiringChange();
  }

  /** Hover a core from outside the 3D view (e.g. the panel list). */
  setHoverConductor(id: WireId | null) {
    this.hoverConductor = id;
  }

  resetWiring() {
    if (this.mode !== 'wire' || this.fitWanted) return;
    this.activeConductor = null;
    this.setAssignments({ line: null, neutral: null, earth: null });
    this.onWiringChange();
  }

  getWiring(): {
    mode: SceneMode;
    assignments: Assignments;
    active: WireId | null;
    fit: 'off' | 'fitting' | 'fitted' | 'removing';
  } {
    return { mode: this.mode, assignments: { ...this.assignments }, active: this.activeConductor, fit: this.fitState() };
  }

  /** Screw the faceplate onto the box (needs all three cores connected), or take it off again. */
  setFitted(on: boolean) {
    if (this.mode !== 'wire' || on === this.fitWanted) return;
    if (on && !WIRE_IDS.every((id) => this.assignments[id] !== null)) return;
    this.activeConductor = null;
    this.hoverConductor = null;
    this.fitWanted = on;
    if (on) this.flyTo(new THREE.Vector3(6, 4.5, 27), new THREE.Vector3(0, 0, 2));
    else this.flyTo(this.wireView().pos, this.wireView().target);
    this.onWiringChange();
  }

  private wireView() {
    const target = this.defaultTarget.clone().add(new THREE.Vector3(-1.8, -0.9, 0));
    const pos = target.clone().add(this.defaultPos.clone().sub(this.defaultTarget).multiplyScalar(0.78));
    return { pos, target };
  }

  private setAssignments(a: Assignments) {
    this.assignments = { ...a };
    for (const c of this.conductors.values()) this.rebuildConductor(c);
  }

  private startPoint(c: Conductor, along: number) {
    return this.sheathEnd
      .clone()
      .addScaledVector(this.n1, c.off[0])
      .addScaledVector(this.n2, c.off[1])
      .addScaledVector(this.tEnd, along);
  }

  private conductorRoute(c: Conductor, terminal: WireId | null) {
    const A = this.startPoint(c, -0.15);
    const B = this.startPoint(c, 0.9);

    if (terminal === null) {
      // Loose: the core hangs free, fanned out so you can see and pick each one.
      const spread = c.id === 'line' ? -1 : c.id === 'neutral' ? 0 : 1;
      const F = B.clone()
        .addScaledVector(this.tEnd, 2.2 + c.lift * 1.5)
        .addScaledVector(this.n1, spread * (2.0 + c.lift * 0.5))
        .add(new THREE.Vector3(0, -0.9 + c.lift * 1.0, 0));
      const M = B.clone().lerp(F, 0.5).add(new THREE.Vector3(0, 0.15, 0));
      const tip = F.clone().add(F.clone().sub(M).normalize().multiplyScalar(0.55));
      return { ins: [A, B, M, F], bare: [F, tip] };
    }

    const t = this.terminalInfo.get(terminal)!;
    const I = t.entry.clone().addScaledVector(t.dir, 0.45);
    const C = I.clone().addScaledVector(t.dir, 1.1);
    let via: THREE.Vector3[];
    if (c.id === 'earth' && terminal === 'earth') {
      via = this.cpcVia;
    } else {
      const mid = B.clone().lerp(C, 0.5);
      // A mis-wired core takes a wider path so it clears the other terminals.
      if (c.id !== terminal) mid.addScaledVector(this.zOut, 1.0);
      via = [mid];
    }
    return { ins: [A, B, ...via, C, I], bare: [I, t.entry.clone().addScaledVector(t.dir, -0.05)] };
  }

  private rebuildConductor(c: Conductor) {
    const r = this.conductorRoute(c, this.assignments[c.id]);
    c.ins.geometry.dispose();
    c.ins.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r.ins, false, 'centripetal'), 120, 0.15, 10, false);
    c.bare.geometry.dispose();
    c.bare.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r.bare, false, 'centripetal'), 6, 0.085, 10, false);
    c.hit.geometry.dispose();
    c.hit.geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([...r.ins, ...r.bare.slice(1)], false, 'centripetal'),
      60,
      0.45,
      6,
      false,
    );
  }

  private pickWire(hits: THREE.Intersection[]) {
    const kindOf = (h: THREE.Intersection) => h.object.userData.kind as 'conductor' | 'terminal' | undefined;
    // With a core in hand, a terminal under the cursor wins over any core near it.
    const terminal = this.activeConductor ? hits.find((h) => kindOf(h) === 'terminal') : undefined;
    const conductor = hits.find((h) => kindOf(h) === 'conductor');
    if (terminal) this.assignToTerminal(terminal.object.userData.wire as WireId);
    else if (conductor) this.selectConductor(conductor.object.userData.wire as WireId);
    else if (this.activeConductor) this.selectConductor(this.activeConductor); // click away = put down
  }

  /* ------------------------------- building ------------------------------- */

  private register(id: PartId, mesh: THREE.Mesh, pickable = true) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.part = id;
    let entry = this.parts.get(id);
    if (!entry) {
      entry = { meshes: [], mats: new Set() };
      this.parts.set(id, entry);
    }
    entry.meshes.push(mesh);
    if (mesh.material instanceof THREE.MeshStandardMaterial) entry.mats.add(mesh.material);
    if (pickable) this.pickables.push(mesh);
    return mesh;
  }

  private anchor(id: PartId, parent: THREE.Object3D, pos: THREE.Vector3) {
    const o = new THREE.Object3D();
    o.position.copy(pos);
    parent.add(o);
    this.anchors.set(id, o);
  }

  private buildBackBox() {
    const g = new THREE.Group();
    this.scene.add(g);
    const metal = std(0xbfc5cc, { metalness: 0.85, roughness: 0.38 });
    metal.side = THREE.DoubleSide;
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal);
      m.position.set(x, y, z);
      g.add(m);
      this.register('backbox', m);
    };
    box(W, W, T, 0, 0, -D / 2 + T / 2); // back
    box(W, T, D, 0, W / 2 - T / 2, 0); // top
    box(T, W - 2 * T, D, -W / 2 + T / 2, 0, 0); // left
    box(T, W - 2 * T, D, W / 2 - T / 2, 0, 0); // right

    // Bottom wall with a hole for the cable.
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, -D / 2);
    shape.lineTo(W / 2, -D / 2);
    shape.lineTo(W / 2, D / 2);
    shape.lineTo(-W / 2, D / 2);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(CABLE_X, -1.1, 0.55, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const bg = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 28 });
    bg.rotateX(Math.PI / 2);
    bg.translate(0, -W / 2 + T, 0);
    const bottom = new THREE.Mesh(bg, metal);
    g.add(bottom);
    this.register('backbox', bottom);

    // Fixing lugs at 60.3 mm centres.
    for (const s of [1, -1]) {
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 20).rotateX(Math.PI / 2), metal);
      lug.position.set(s * 3.015, 0, -D / 2 + T + 0.7);
      g.add(lug);
      this.register('backbox', lug);
      const dark = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      dark.position.set(s * 3.015, 0, -D / 2 + T + 1.41);
      g.add(dark);
    }

    // Knockouts (inner face) and cable grommet.
    const ringMat = std(0x8d949c, { metalness: 0.8, roughness: 0.5 });
    const discMat = std(0xaab1b8, { metalness: 0.8, roughness: 0.45 });
    const knock = (x: number, y: number, z: number, rx: number, ry: number) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 32), ringMat);
      ring.position.set(x, y, z);
      ring.rotation.set(rx, ry, 0);
      g.add(ring);
      this.register('knockout', ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.52, 28), discMat);
      disc.material.side = THREE.DoubleSide;
      disc.position.set(x, y, z);
      disc.rotation.set(rx, ry, 0);
      g.add(disc);
      this.register('knockout', disc);
    };
    const inner = W / 2 - T - 0.012;
    knock(0, 2.5, -D / 2 + T + 0.012, 0, 0);
    knock(0, -2.5, -D / 2 + T + 0.012, 0, 0);
    knock(inner, 0, 0, 0, Math.PI / 2);
    knock(-inner, 0, 0, 0, Math.PI / 2);
    knock(0, inner, 0, Math.PI / 2, 0);

    const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 10, 28), std(0x151515, { roughness: 0.8 }));
    grommet.rotation.x = Math.PI / 2;
    grommet.position.set(CABLE_X, -W / 2 + T + 0.02, -1.1);
    g.add(grommet);
    this.register('knockout', grommet);

    // Earth screw on the back of the box.
    const earthScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 20).rotateX(Math.PI / 2), brass());
    earthScrew.position.set(-2.8, -1.0, -D / 2 + T + 0.15);
    g.add(earthScrew);
    this.register('tail', earthScrew);

    this.anchor('backbox', g, new THREE.Vector3(W / 2, W / 2 - 0.4, D / 2));
    this.anchor('knockout', g, new THREE.Vector3(W / 2, 0, 0));
  }

  private buildPlate() {
    const p = this.plate;
    p.position.copy(PULLED_POS);
    p.quaternion.copy(PULLED_QUAT);
    this.scene.add(p);

    const plateMesh = new THREE.Mesh(new RoundedBoxGeometry(W, W, 0.6, 5, 0.28), std(0xf3f1ea, { roughness: 0.35 }));
    p.add(plateMesh);
    this.register('faceplate', plateMesh);

    const body = new THREE.Mesh(new RoundedBoxGeometry(5.2, 6.2, 2.4, 4, 0.25), std(0xe4e0d3, { roughness: 0.45 }));
    body.position.z = -1.5;
    p.add(body);
    this.register('faceplate', body);

    // The three rectangular pin slots on the front face (BS 1363): earth on top,
    // line (bottom right) and neutral (bottom left), seen from the front.
    const rimMat = std(0xd2cfc3, { roughness: 0.6 });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.95 });
    const slots: [number, number, number, number][] = [
      [0, 1.15, 0.42, 0.82], // earth
      [1.11, -1.0, 0.42, 0.66], // line
      [-1.11, -1.0, 0.42, 0.66], // neutral
    ];
    for (const [x, y, w, h] of slots) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.04), rimMat);
      rim.position.set(x, y, 0.3);
      p.add(rim);
      const hole = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), holeMat);
      hole.position.set(x, y, 0.315);
      p.add(hole);
    }

    // Fixing screws: long enough to reach the box lugs when fitted, with slotted heads on the front.
    for (const sgn of [1, -1]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.1, 14).rotateX(Math.PI / 2), brass());
      screw.position.set(sgn * 3.015, 0, -1.35);
      p.add(screw);
      this.register('screws', screw);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 14).rotateX(Math.PI / 2), brass());
      tip.position.set(sgn * 3.015, 0, -2.5);
      p.add(tip);
      this.register('screws', tip);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20).rotateX(Math.PI / 2), brass());
      head.position.set(sgn * 3.015, 0, 0.37);
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.04), std(0x3a3226, { roughness: 0.7 }));
      groove.position.z = 0.05;
      head.add(groove);
      p.add(head);
      this.screwHeads.push(head);
    }

    const terminals: { id: 'line' | 'neutral' | 'earth'; x: number; y: number; letter: string; lx: number; ly: number }[] = [
      { id: 'earth', x: 0, y: 1.55, letter: 'E', lx: 1.5, ly: 1.55 },
      { id: 'line', x: 1.45, y: -1.0, letter: 'L', lx: 1.45, ly: 0.1 },
      { id: 'neutral', x: -1.45, y: -1.0, letter: 'N', lx: -1.45, ly: 0.1 },
    ];
    const recess = new THREE.MeshBasicMaterial({ color: 0x55524a });
    for (const t of terminals) {
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.06), recess);
      pocket.position.set(t.x, t.y, REAR_Z - 0.02);
      p.add(pocket);

      const clamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.0), brass());
      clamp.position.set(t.x, t.y, REAR_Z - 0.55);
      p.add(clamp);
      this.register(t.id, clamp);
      clamp.userData.kind = 'terminal';
      clamp.userData.wire = t.id;

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 22).rotateX(Math.PI / 2), brass());
      head.position.set(t.x, t.y, REAR_Z - 1.1);
      p.add(head);
      this.register(t.id, head);
      head.userData.kind = 'terminal';
      head.userData.wire = t.id;
      this.terminalMats.set(t.id, [clamp.material as THREE.MeshStandardMaterial, head.material as THREE.MeshStandardMaterial]);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.06), std(0x3a3226, { roughness: 0.7 }));
      slot.position.set(t.x, t.y, REAR_Z - 1.2);
      p.add(slot);

      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), letterMaterial(t.letter));
      label.position.set(t.lx, t.ly, REAR_Z - 0.012);
      label.rotation.y = Math.PI;
      p.add(label);

      this.anchor(t.id, p, new THREE.Vector3(t.x, t.y, REAR_Z - 1.2));
    }

    this.anchor('faceplate', p, new THREE.Vector3(3.7, 2.4, -0.33));
    this.anchor('screws', p, new THREE.Vector3(3.015, 0, -2.5));
    p.updateMatrixWorld(true);
  }

  private buildCableAndConductors() {
    // Meshes are created once; their shapes are (re)computed by updateRouting() whenever the plate moves.
    this.cableMesh = new THREE.Mesh(new THREE.BufferGeometry(), std(0xcfd2d4, { roughness: 0.55 }));
    this.scene.add(this.cableMesh);
    this.register('sheath', this.cableMesh);
    this.capMesh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), std(0xb7bbbe, { roughness: 0.7 }));
    this.scene.add(this.capMesh);
    this.register('sheath', this.capMesh);
    this.sheathAnchorObj = new THREE.Object3D();
    this.scene.add(this.sheathAnchorObj);
    this.anchors.set('sheath', this.sheathAnchorObj);

    // The three cores from the cable.
    const sleeveMat = std(0xffffff, { roughness: 0.45 });
    sleeveMat.map = stripedTexture();
    const sleeveTail = sleeveMat.clone();
    sleeveTail.map = sleeveMat.map;
    const defs: [WireId, THREE.MeshStandardMaterial, [number, number]][] = [
      ['line', this.lineMat, [-0.17, 0]],
      ['neutral', this.neutralMat, [0.17, 0]],
      ['earth', sleeveMat, [0, 0.14]],
    ];
    for (const [id, mat, off] of defs) {
      const ins = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      const bare = new THREE.Mesh(new THREE.BufferGeometry(), copper());
      this.scene.add(ins, bare);
      this.register(id, ins);
      this.register(id, bare);
      for (const m of [ins, bare]) {
        m.userData.kind = 'conductor';
        m.userData.wire = id;
      }
      const hit = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.kind = 'conductor';
      hit.userData.wire = id;
      this.scene.add(hit);
      this.wirePickables.push(hit);
      const c: Conductor = { id, mat, off, ins, bare, hit, lift: 0 };
      this.conductors.set(id, c);
    }

    // The earth tail from the back box to the earth terminal.
    this.tailMesh = new THREE.Mesh(new THREE.BufferGeometry(), sleeveTail);
    this.scene.add(this.tailMesh);
    this.register('tail', this.tailMesh);
    this.tailBareMesh = new THREE.Mesh(new THREE.BufferGeometry(), copper());
    this.scene.add(this.tailBareMesh);
    this.register('tail', this.tailBareMesh);
    this.tailAnchorObj = new THREE.Object3D();
    this.scene.add(this.tailAnchorObj);
    this.anchors.set('tail', this.tailAnchorObj);

    this.assignments = { line: 'line', neutral: 'neutral', earth: 'earth' };
    this.updateRouting(0);
  }

  /** Move the plate along its fitting path (e: 0 pulled out .. 1 on the box) and re-route everything attached to it. */
  private setFit(t: number) {
    const e = t * t * (3 - 2 * t);
    this.plate.position.lerpVectors(PULLED_POS, FITTED_POS, e);
    this.plate.position.z += Math.sin(Math.PI * e) * 3.0; // swing out in front of the box on the way in
    this.plate.quaternion.slerpQuaternions(PULLED_QUAT, FITTED_QUAT, e);
    this.plate.updateMatrixWorld(true);
    this.updateRouting(e);
  }

  /** Recompute the cable, the cores and the earth tail for the plate's current pose. */
  private updateRouting(e: number) {
    const toWorld = (v: THREE.Vector3) => this.plate.localToWorld(v.clone());
    const at = (x: number, y: number, z: number) => this.plate.localToWorld(new THREE.Vector3(x, y, z));
    const S = toWorld(S_PULLED.clone().lerp(S_FITTED, e));

    // Cable: in through the bottom of the box, then either out to the plate or ending inside the box.
    const P3 = CABLE_BOX_PTS[3];
    const P4 = CABLE_P4.clone().lerp(P3.clone().lerp(S, 0.4), e);
    const P5 = CABLE_P5.clone().lerp(P3.clone().lerp(S, 0.75), e);
    const mid = P5.clone().lerp(S, 0.5).add(new THREE.Vector3(0, 1.0 * (1 - e), 0.5 * (1 - e)));
    const cable = new THREE.CatmullRomCurve3([...CABLE_BOX_PTS, P4, P5, mid, S], false, 'centripetal');
    this.cableMesh.geometry.dispose();
    this.cableMesh.geometry = new THREE.TubeGeometry(cable, 240, 0.4, 16, false);

    const tEnd = cable.getTangentAt(1).normalize();
    this.capMesh.position.copy(S).addScaledVector(tEnd, 0.001);
    this.capMesh.lookAt(S.clone().add(tEnd));
    this.sheathAnchorObj.position.copy(cable.getPointAt(0.8));

    const n1 = tEnd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const n2 = tEnd.clone().cross(n1).normalize();
    this.sheathEnd.copy(S);
    this.tEnd.copy(tEnd);
    this.n1.copy(n1);
    this.n2.copy(n2);

    const down = new THREE.Vector3(0, -1, 0).transformDirection(this.plate.matrixWorld);
    const upW = new THREE.Vector3(0, 1, 0).transformDirection(this.plate.matrixWorld);
    this.zOut = new THREE.Vector3(0, 0, -1).transformDirection(this.plate.matrixWorld);
    this.cpcVia = [
      at(-3.0, -3.5, -4.4).lerp(FIT_CPC_VIA[0], e),
      at(-3.5, -1.5, -4.6).lerp(FIT_CPC_VIA[1], e),
      at(-3.0, 2.6, -4.0).lerp(FIT_CPC_VIA[2], e),
    ];

    // Where each terminal takes a conductor: line and neutral from below, earth from above.
    this.terminalInfo.set('line', { entry: at(1.45, -1.0 - 0.6, REAR_Z - 0.55), dir: down });
    this.terminalInfo.set('neutral', { entry: at(-1.45, -1.0 - 0.6, REAR_Z - 0.55), dir: down });
    this.terminalInfo.set('earth', { entry: at(-0.25, 1.55 + 0.6, REAR_Z - 0.55), dir: upW });
    for (const c of this.conductors.values()) this.rebuildConductor(c);

    // Earth tail: round the plate's lower-left edge when pulled out (never through the socket),
    // straight up inside the box when fitted.
    const tailEntry = at(0.25, 1.55 + 0.6, REAR_Z - 0.55);
    const I = tailEntry.clone().addScaledVector(upW, 0.45);
    const C = I.clone().addScaledVector(upW, 1.1);
    const t0 = new THREE.Vector3(-2.8, -1.0, -D / 2 + T + 0.3);
    const pulledWps = [
      new THREE.Vector3(-2.8, -0.8, 2.2),
      at(-5.6, -5.8, -2.8),
      at(-4.9, -3.0, -3.8),
      at(-4.2, 0.8, -3.7),
      at(-2.4, 3.1, -3.6),
    ];
    const tailRoute = [t0, ...pulledWps.map((w, i) => w.lerp(FIT_TAIL[i], e)), C, I];
    const tailCurve = new THREE.CatmullRomCurve3(tailRoute, false, 'centripetal');
    this.tailMesh.geometry.dispose();
    this.tailMesh.geometry = new THREE.TubeGeometry(tailCurve, 120, 0.15, 10, false);
    this.tailBareMesh.geometry.dispose();
    this.tailBareMesh.geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([I, tailEntry.clone().addScaledVector(upW, -0.05)], false, 'centripetal'),
      6,
      0.085,
      10,
      false,
    );
    this.tailAnchorObj.position.copy(tailCurve.getPointAt(0.55));
  }

  private applyScrew() {
    for (const head of this.screwHeads) {
      head.rotation.z = this.screw * Math.PI * 4; // two full turns
      head.position.z = 0.37 - this.screw * 0.07;
    }
  }

  /** Advance the fit/unfit animation: plate moves first, then the screws turn (reverse on the way out). */
  private stepFit(dt: number) {
    const rate = this.reduced ? 12 : 1;
    const before = this.fitState();
    if (this.fitWanted) {
      if (this.fit < 1) {
        this.fit = Math.min(1, this.fit + (dt * rate) / 1.5);
        this.setFit(this.fit);
      } else if (this.screw < 1) {
        this.screw = Math.min(1, this.screw + (dt * rate) / 0.9);
        this.applyScrew();
      }
    } else if (this.screw > 0) {
      this.screw = Math.max(0, this.screw - (dt * rate) / 0.9);
      this.applyScrew();
    } else if (this.fit > 0) {
      this.fit = Math.max(0, this.fit - (dt * rate) / 1.5);
      this.setFit(this.fit);
    }
    if (this.fitState() !== before) this.onWiringChange();
  }

  private fitState(): 'off' | 'fitting' | 'fitted' | 'removing' {
    if (this.fitWanted) return this.fit >= 1 && this.screw >= 1 ? 'fitted' : 'fitting';
    return this.fit <= 0 && this.screw <= 0 ? 'off' : 'removing';
  }


  /* ------------------------------ interaction ------------------------------ */

  private bindPicking() {
    const el = this.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointermove', (e) => {
      if (this.mode !== 'wire' || e.buttons !== 0) return;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hits = this.raycaster.intersectObjects([...this.pickables, ...this.wirePickables], false);
      const kindOf = (h: THREE.Intersection) => h.object.userData.kind as string | undefined;
      const terminal = this.activeConductor ? hits.find((h) => kindOf(h) === 'terminal') : undefined;
      const conductor = terminal ? undefined : hits.find((h) => kindOf(h) === 'conductor');
      this.hoverTerminal = terminal ? (terminal.object.userData.wire as WireId) : null;
      this.hoverConductor = conductor ? (conductor.object.userData.wire as WireId) : null;
      el.style.cursor = terminal || conductor ? 'pointer' : '';
    });
    el.addEventListener('pointerleave', () => {
      this.hoverTerminal = null;
      this.hoverConductor = null;
      el.style.cursor = '';
    });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      if (this.mode === 'wire') {
        this.pickWire(this.raycaster.intersectObjects([...this.pickables, ...this.wirePickables], false));
        return;
      }
      const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
      const id = (hit?.object.userData.part as PartId | undefined) ?? null;
      this.onSelect(id);
    });
  }

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3) {
    if (this.reduced) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      return;
    }
    this.tween = {
      t: 0,
      fromPos: this.camera.position.clone(),
      toPos: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    };
  }

  private resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Keep the whole scene in view on tall (phone) screens.
    const base = THREE.MathUtils.degToRad(35);
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(base / 2) * Math.max(1, 1.2 / aspect)));
    this.camera.updateProjectionMatrix();
  }

  private tick(time: number) {
    const t = time / 1000;
    const dt = Math.max(0, Math.min(t - this.lastTime, 0.05)); // never negative, never a big jump
    this.lastTime = t;

    if (this.tween) {
      this.tween.t = Math.min(1, this.tween.t + dt / 0.7);
      const k = 1 - Math.pow(1 - this.tween.t, 3);
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, k);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, k);
      if (this.tween.t >= 1) this.tween = null;
    }
    this.controls.update();

    for (const [id, entry] of this.parts) {
      const on = id === this.selected;
      const intensity = on ? (this.reduced ? 0.4 : 0.3 + 0.2 * Math.sin(t * 4)) : 0;
      entry.mats.forEach((m) => {
        m.emissive.set(0xbcd8ff);
        m.emissiveIntensity = intensity;
      });
    }

    this.stepFit(dt);

    // Hovered loose cores lift out of the cable; the rest settle back.
    if (this.mode === 'wire') {
      for (const c of this.conductors.values()) {
        const target = this.hoverConductor === c.id && this.assignments[c.id] === null ? 1 : 0;
        let next = this.reduced ? target : c.lift + (target - c.lift) * Math.min(1, dt * 12);
        if (Math.abs(target - next) < 0.003) next = target;
        if (next !== c.lift) {
          c.lift = next;
          if (this.assignments[c.id] === null) this.rebuildConductor(c);
        }
      }
    }

    // Terminals glow green, amber or red as soon as a core is connected to them.
    if (this.mode === 'wire') {
      const tint: Record<Level, number> = { ok: 0x2f9e4f, warn: 0xf0a020, danger: 0xe03a2f };
      for (const id of WIRE_IDS) {
        const terminal = this.assignments[id];
        if (terminal === null) continue;
        const colour = tint[faultFor(id, terminal).level];
        this.terminalMats.get(terminal)?.forEach((m) => {
          m.emissive.set(colour);
          m.emissiveIntensity = 0.45;
        });
      }
    }

    if (this.mode === 'wire' && this.activeConductor) {
      const pulse = this.reduced ? 0.4 : 0.3 + 0.2 * Math.sin(t * 4);
      const mat = this.conductors.get(this.activeConductor)!.mat;
      mat.emissive.set(0xbcd8ff);
      mat.emissiveIntensity = pulse;
      this.terminalMats.forEach((ms) =>
        ms.forEach((m) => {
          m.emissive.set(0xbcd8ff);
          m.emissiveIntensity = pulse * 0.8;
        }),
      );
    }

    if (this.mode === 'wire') {
      if (this.hoverConductor && this.hoverConductor !== this.activeConductor) {
        const m = this.conductors.get(this.hoverConductor)!.mat;
        m.emissive.set(0xbcd8ff);
        m.emissiveIntensity = 0.3;
      }
      if (this.hoverTerminal && this.activeConductor) {
        this.terminalMats.get(this.hoverTerminal)?.forEach((m) => {
          m.emissive.set(0xbcd8ff);
          m.emissiveIntensity = 0.85;
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.onFrame(this.projectAnchors());
  }

  private projectAnchors(): ProjectedAnchor[] {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const out: ProjectedAnchor[] = [];
    const wp = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (const [id, a] of this.anchors) {
      a.getWorldPosition(wp);
      v.copy(wp).project(this.camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      let occluded = false;
      if (visible) {
        const dir = wp.clone().sub(this.camera.position);
        const dist = dir.length();
        this.raycaster.set(this.camera.position, dir.normalize());
        this.raycaster.far = dist;
        const hit = this.raycaster
          .intersectObjects(this.pickables, false)
          .find((h) => h.object.userData.part !== id);
        occluded = !!hit && hit.distance < dist - 0.35;
        this.raycaster.far = Infinity;
      }
      out.push({ id, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible, occluded });
    }
    return out;
  }
}
