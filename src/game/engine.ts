import * as THREE from "three";

// ----------------------------- Types -----------------------------
export type Quality = "low" | "medium" | "high";
export interface GameConfig {
  mobile?: boolean;
  sensitivity?: number;
  quality?: Quality;
  enemyCount?: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  slot: number;
  type: "auto" | "semi" | "throw" | "heal" | "melee" | "jetpack";
  damage: number;
  clip: number;
  reserve: number;
  fireRate: number; // seconds between shots
  reloadTime: number;
  spread: number;
  range: number;
}

export const WEAPONS: WeaponDef[] = [
  { id: "ak47", name: "AK-47", slot: 1, type: "auto", damage: 17, clip: 30, reserve: 90, fireRate: 0.1, reloadTime: 1.6, spread: 0.012, range: 200 },
  { id: "glock", name: "GLOCK", slot: 2, type: "semi", damage: 26, clip: 15, reserve: 45, fireRate: 0.22, reloadTime: 1.2, spread: 0.02, range: 160 },
  { id: "grenade", name: "GRENADE", slot: 3, type: "throw", damage: 90, clip: 1, reserve: 3, fireRate: 0.9, reloadTime: 0.5, spread: 0, range: 0 },
  { id: "medkit", name: "MEDKIT", slot: 4, type: "heal", damage: 0, clip: 1, reserve: 2, fireRate: 1, reloadTime: 0, spread: 0, range: 0 },
  { id: "knife", name: "KNIFE", slot: 5, type: "melee", damage: 65, clip: 0, reserve: 0, fireRate: 0.5, reloadTime: 0, spread: 0, range: 6 },
  { id: "jetpack", name: "JETPACK", slot: 6, type: "jetpack", damage: 0, clip: 0, reserve: 0, fireRate: 0, reloadTime: 0, spread: 0, range: 0 },
];

export interface HudState {
  health: number;
  shield: number;
  fuel: number;
  maxFuel: number;
  weaponIndex: number;
  ammo: { clip: number; reserve: number }[];
  reloading: boolean;
  kills: number;
  alive: number;
  zoneTime: number;
  zoneShrinking: boolean;
  zoneRadius: number;
  mapSize: number;
  playerX: number;
  playerZ: number;
  playerAngle: number;
  enemies: { x: number; z: number }[];
  status: "playing" | "won" | "lost";
  hitFlash: number;
  damageDir: number; // angle of last damage relative to facing
  flying: boolean;
}

// ----------------------------- Game -----------------------------
export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;

  private onHud: (s: HudState) => void;
  private hudAccum = 0;

  // world
  private mapSize = 140;
  private cell = 2;
  private heights: number[][] = [];
  private gridN = 0;

  // player
  private pos = new THREE.Vector3(0, 20, 0);
  private vel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private health = 100;
  private shield = 100;
  private fuel = 100;
  private maxFuel = 100;
  private flying = false;
  private grounded = false;

  // weapons
  private weaponIndex = 0;
  private clips: number[] = WEAPONS.map((w) => w.clip);
  private reserves: number[] = WEAPONS.map((w) => w.reserve);
  private medkits = 2;
  private grenades = 3;
  private fireCd = 0;
  private reloadT = 0;
  private reloading = false;
  private firing = false;

  // input
  private keys: Record<string, boolean> = {};
  private locked = false;

  // entities
  private enemies: Enemy[] = [];
  private grenadeProj: GrenadeProj[] = [];
  private effects: Effect[] = [];
  private kills = 0;

  // zone
  private zoneRadius = 70;
  private zoneTarget = 70;
  private zoneTimer = 30;
  private zoneShrinking = false;
  private zoneMesh!: THREE.Mesh;
  private zoneRing!: THREE.Mesh;

  // viewmodel
  private viewGroup = new THREE.Group();
  private gunGroup = new THREE.Group();
  private muzzle!: THREE.Mesh;
  private muzzleT = 0;
  private gunRecoil = 0;
  private bobT = 0;
  private jetFlames!: THREE.Group;

  private status: "playing" | "won" | "lost" = "playing";
  private hitFlash = 0;
  private damageDir = 0;
  private recoilPitch = 0;

  private raycaster = new THREE.Raycaster();
  private enemyMeshes: THREE.Object3D[] = [];

  // mobile / settings
  private mobile = false;
  private mobileThrust = false;
  private touchMove = { x: 0, y: 0 };
  private lookSensitivity = 1;
  private paused = false;

  constructor(canvas: HTMLCanvasElement, onHud: (s: HudState) => void, config?: GameConfig) {
    this.canvas = canvas;
    this.onHud = onHud;
    const cfg = config ?? {};
    this.mobile = cfg.mobile ?? false;
    this.lookSensitivity = cfg.sensitivity ?? 1;

    const q = cfg.quality ?? "high";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== "low", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.prFor(q));
    this.renderer.shadowMap.enabled = q !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec9f0);
    this.scene.fog = new THREE.Fog(0x9fd0ef, 90, 220);

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 600);

    this.buildLights();
    this.buildWorld();
    this.buildZone();
    this.buildViewModel();
    this.spawnEnemies(cfg.enemyCount ?? 12);

    this.resize();
    window.addEventListener("resize", this.resize);
    this.bindInput();
  }

  private prFor(q: Quality) {
    const cap = Math.min(window.devicePixelRatio || 1, 2);
    if (q === "low") return Math.min(cap, 1);
    if (q === "medium") return Math.min(cap, 1.5);
    return cap;
  }

  // ------------------------- public mobile API -------------------------
  setMove(x: number, y: number) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }
  look(dx: number, dy: number) {
    const s = 0.004 * this.lookSensitivity;
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }
  setThrust(on: boolean) {
    this.mobileThrust = on;
  }
  setFiring(on: boolean) {
    this.firing = on;
    if (on) this.tryAction();
  }
  doReload() {
    this.startReload();
  }
  doMelee() {
    this.meleeAttack();
  }
  setSensitivity(v: number) {
    this.lookSensitivity = v;
  }
  setPaused(v: boolean) {
    this.paused = v;
    if (v && this.locked) document.exitPointerLock();
  }
  isPaused() {
    return this.paused;
  }

  // ------------------------- setup -------------------------
  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xcfeeff, 0x4a6b3a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(60, 110, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 120;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.far = 320;
    this.scene.add(sun);

    // clouds (block style)
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < n; j++) {
        const s = 6 + Math.random() * 8;
        const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s), cloudMat);
        m.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 22);
        g.add(m);
      }
      g.position.set((Math.random() - 0.5) * 320, 70 + Math.random() * 30, (Math.random() - 0.5) * 320);
      this.scene.add(g);
    }
  }

  private noise(x: number, z: number) {
    return (
      Math.sin(x * 0.12) * Math.cos(z * 0.11) * 2.2 +
      Math.sin(x * 0.05 + z * 0.04) * 3.0 +
      Math.cos(z * 0.18 - x * 0.02) * 1.2
    );
  }

  private buildWorld() {
    const half = this.mapSize / 2;
    this.gridN = Math.floor(this.mapSize / this.cell);
    const n = this.gridN;
    this.heights = [];
    for (let i = 0; i < n; i++) {
      this.heights[i] = [];
      for (let j = 0; j < n; j++) {
        const x = -half + i * this.cell;
        const z = -half + j * this.cell;
        let h = Math.max(1, Math.round(4 + this.noise(x, z)));
        this.heights[i][j] = h;
      }
    }

    // stamp structures into heightfield
    const stamp = (cx: number, cz: number, w: number, d: number, h: number) => {
      const i0 = Math.floor((cx - w / 2 + half) / this.cell);
      const i1 = Math.floor((cx + w / 2 + half) / this.cell);
      const j0 = Math.floor((cz - d / 2 + half) / this.cell);
      const j1 = Math.floor((cz + d / 2 + half) / this.cell);
      for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++)
        for (let j = Math.max(0, j0); j <= Math.min(n - 1, j1); j++) this.heights[i][j] = h;
    };
    // central high tower
    stamp(0, 0, 10, 10, 24);
    stamp(0, 0, 16, 16, 14);
    // scattered barricades / buildings
    const blocks: [number, number, number, number, number][] = [
      [-38, -30, 18, 14, 9], [34, -36, 16, 16, 11], [40, 28, 14, 20, 8],
      [-44, 34, 20, 12, 10], [18, 44, 12, 12, 7], [-20, 18, 10, 24, 6],
      [50, -10, 10, 10, 13], [-52, -6, 12, 10, 9], [10, -48, 22, 10, 7],
    ];
    blocks.forEach((b) => stamp(b[0], b[1], b[2], b[3], b[4]));

    // build instanced terrain cubes
    const geo = new THREE.BoxGeometry(this.cell, 1, this.cell);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: false });
    const total = n * n;
    const inst = new THREE.InstancedMesh(geo, mat, total);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = -half + i * this.cell;
        const z = -half + j * this.cell;
        const h = this.heights[i][j];
        dummy.position.set(x, h / 2, z);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(idx, dummy.matrix);
        // color: grass top vs structure (gray) vs dirt
        if (h >= 6 && this.isStructure(x, z)) {
          color.setHSL(0, 0, 0.42 + Math.random() * 0.12); // gray block
        } else {
          const g = 0.32 + Math.random() * 0.14;
          color.setRGB(0.22 * g * 3 * 0.45, 0.55 * g * 1.6, 0.22 * g * 2);
          color.setHSL(0.28, 0.5, 0.32 + Math.random() * 0.12);
        }
        inst.setColorAt(idx, color);
        idx++;
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.scene.add(inst);

    // decorative trees (block trunks + leaves) - not colliding
    for (let k = 0; k < 40; k++) {
      const x = (Math.random() - 0.5) * (this.mapSize - 16);
      const z = (Math.random() - 0.5) * (this.mapSize - 16);
      if (Math.hypot(x, z) < 16) continue;
      const h = this.getHeight(x, z);
      if (this.isStructure(x, z)) continue;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
      trunk.position.set(x, h + 2.5, z);
      trunk.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshLambertMaterial({ color: 0x3f9b3a }));
      leaves.position.set(x, h + 7, z);
      leaves.castShadow = true;
      this.scene.add(trunk, leaves);
    }

    // floating islands
    for (let k = 0; k < 5; k++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const y = 26 + Math.random() * 14;
      const isl = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 12), new THREE.MeshLambertMaterial({ color: 0x4a8f3e }));
      isl.position.set(x, y, z);
      isl.castShadow = true;
      isl.receiveShadow = true;
      this.scene.add(isl);
    }
  }

  private isStructure(x: number, z: number) {
    const h = this.getHeight(x, z);
    return h >= 6;
  }

  private getHeight(x: number, z: number): number {
    const half = this.mapSize / 2;
    let i = Math.round((x + half) / this.cell);
    let j = Math.round((z + half) / this.cell);
    i = Math.max(0, Math.min(this.gridN - 1, i));
    j = Math.max(0, Math.min(this.gridN - 1, j));
    return this.heights[i]?.[j] ?? 1;
  }

  private buildZone() {
    const geo = new THREE.CylinderGeometry(1, 1, 80, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x35a7ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.zoneMesh = new THREE.Mesh(geo, mat);
    this.zoneMesh.position.y = 38;
    this.scene.add(this.zoneMesh);

    const ringGeo = new THREE.TorusGeometry(1, 0.4, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x35a7ff, transparent: true, opacity: 0.6 });
    this.zoneRing = new THREE.Mesh(ringGeo, ringMat);
    this.zoneRing.rotation.x = Math.PI / 2;
    this.zoneRing.position.y = 2;
    this.scene.add(this.zoneRing);
  }

  private buildViewModel() {
    this.camera.add(this.viewGroup);
    this.scene.add(this.camera);

    const skin = new THREE.MeshLambertMaterial({ color: 0xe0a878 });
    const sleeve = new THREE.MeshLambertMaterial({ color: 0x2b3327 });

    // gun group (AK style)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.0), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    body.position.set(0, 0, -0.5);
    const wood = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.34), new THREE.MeshLambertMaterial({ color: 0x7a4a1e }));
    wood.position.set(0, -0.02, -0.18);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.14), new THREE.MeshLambertMaterial({ color: 0x3a2a18 }));
    mag.position.set(0, -0.18, -0.42);
    mag.rotation.x = 0.3;
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    barrel.position.set(0, 0.01, -1.05);
    this.gunGroup.add(body, wood, mag, barrel);

    // right hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), skin);
    rHand.position.set(0.02, -0.12, -0.35);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.4), sleeve);
    rArm.position.set(0.05, -0.22, -0.05);
    rArm.rotation.x = -0.4;
    // left hand on barrel
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), skin);
    lHand.position.set(-0.04, -0.08, -0.85);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.4), sleeve);
    lArm.position.set(-0.18, -0.2, -0.7);
    lArm.rotation.set(-0.2, 0.4, 0);
    this.gunGroup.add(rHand, rArm, lHand, lArm);

    // muzzle flash
    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc33 })
    );
    this.muzzle.position.set(0, 0.01, -1.32);
    this.muzzle.visible = false;
    this.gunGroup.add(this.muzzle);

    this.gunGroup.position.set(0.28, -0.28, -0.55);
    this.viewGroup.add(this.gunGroup);

    // jetpack flames (shown when flying, near bottom)
    this.jetFlames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7714, transparent: true, opacity: 0.9 });
    for (let s = 0; s < 2; s++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), flameMat);
      f.position.set(s === 0 ? -0.18 : 0.18, -0.55, -0.5);
      f.rotation.x = Math.PI;
      this.jetFlames.add(f);
    }
    this.jetFlames.visible = false;
    this.viewGroup.add(this.jetFlames);
  }

  // ------------------------- enemies -------------------------
  private spawnEnemies(count: number) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      const r = 35 + Math.random() * 28;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const e = new Enemy(x, z, this.getHeight(x, z));
      this.scene.add(e.group);
      this.enemies.push(e);
      this.enemyMeshes.push(e.hitbox);
    }
  }

  // ------------------------- input -------------------------
  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onLockChange);
    this.canvas.addEventListener("click", () => {
      if (this.mobile || this.paused) return;
      if (!this.locked && this.status === "playing") this.canvas.requestPointerLock();
    });
  }

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.canvas;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === "KeyR") this.startReload();
    if (e.code.startsWith("Digit")) {
      const n = parseInt(e.code.replace("Digit", ""));
      if (n >= 1 && n <= 6) this.setWeapon(n - 1);
    }
    if (e.code === "KeyV") this.meleeAttack();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.firing = true;
      this.tryAction();
    }
  };
  private onMouseUp = () => {
    this.firing = false;
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    const s = 0.0022 * this.lookSensitivity;
    this.yaw -= e.movementX * s;
    this.pitch -= e.movementY * s;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  };

  setWeapon(i: number) {
    if (i === this.weaponIndex) return;
    this.weaponIndex = i;
    this.reloading = false;
    this.reloadT = 0;
    this.updateViewModelForWeapon();
  }

  private updateViewModelForWeapon() {
    const w = WEAPONS[this.weaponIndex];
    // hide gun for non-gun slots, show simple icon-less arms still
    const showGun = w.type === "auto" || w.type === "semi";
    this.gunGroup.visible = showGun;
  }

  // ------------------------- actions -------------------------
  private tryAction() {
    const w = WEAPONS[this.weaponIndex];
    if (w.type === "throw") this.throwGrenade();
    else if (w.type === "heal") this.useMedkit();
    else if (w.type === "melee") this.meleeAttack();
  }

  private startReload() {
    const w = WEAPONS[this.weaponIndex];
    if (w.type !== "auto" && w.type !== "semi") return;
    if (this.reloading) return;
    if (this.clips[this.weaponIndex] >= w.clip) return;
    if (this.reserves[this.weaponIndex] <= 0) return;
    this.reloading = true;
    this.reloadT = w.reloadTime;
  }

  private shoot() {
    const w = WEAPONS[this.weaponIndex];
    if (this.reloading || this.fireCd > 0) return;
    if (this.clips[this.weaponIndex] <= 0) {
      this.startReload();
      return;
    }
    this.clips[this.weaponIndex]--;
    this.fireCd = w.fireRate;
    this.muzzleT = 0.05;
    this.muzzle.visible = true;
    this.gunRecoil = 0.08;
    this.recoilPitch += 0.012 + Math.random() * 0.01;

    // hitscan
    const dir = this.cameraDir();
    dir.x += (Math.random() - 0.5) * w.spread;
    dir.y += (Math.random() - 0.5) * w.spread;
    dir.z += (Math.random() - 0.5) * w.spread;
    dir.normalize();
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    this.raycaster.set(origin, dir);
    this.raycaster.far = w.range;
    const hits = this.raycaster.intersectObjects(this.enemyMeshes, false);
    let endPoint = origin.clone().add(dir.clone().multiplyScalar(w.range));
    if (hits.length > 0) {
      endPoint = hits[0].point.clone();
      const e = (hits[0].object as any).userData.enemy as Enemy;
      if (e && e.alive) {
        const headHit = hits[0].point.y > e.group.position.y + 2.4;
        const dmg = w.damage * (headHit ? 2 : 1);
        this.damageEnemy(e, dmg);
        this.spawnHitSpark(hits[0].point);
      }
    }
    this.spawnTracer(origin.clone().add(dir.clone().multiplyScalar(1.2)), endPoint);
  }

  private damageEnemy(e: Enemy, dmg: number) {
    e.health -= dmg;
    e.hitTime = 0.15;
    if (e.health <= 0) {
      e.alive = false;
      e.group.visible = false;
      this.enemyMeshes = this.enemyMeshes.filter((m) => m !== e.hitbox);
      this.kills++;
      this.spawnExplosion(e.group.position.clone(), 0xffaa33, 0.6);
      const aliveCount = this.enemies.filter((x) => x.alive).length;
      if (aliveCount === 0) this.status = "won";
    }
  }

  private throwGrenade() {
    if (this.fireCd > 0 || this.grenades <= 0) return;
    this.grenades--;
    this.fireCd = 0.9;
    const dir = this.cameraDir();
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x3a5a2a })
    );
    mesh.position.copy(origin).add(dir.clone().multiplyScalar(1.2));
    this.scene.add(mesh);
    this.grenadeProj.push({
      mesh,
      vel: dir.multiplyScalar(34).add(new THREE.Vector3(0, 6, 0)),
      life: 2.2,
    });
  }

  private useMedkit() {
    if (this.fireCd > 0 || this.medkits <= 0) return;
    if (this.health >= 100) return;
    this.medkits--;
    this.fireCd = 1.2;
    this.health = Math.min(100, this.health + 50);
    this.spawnExplosion(this.camera.getWorldPosition(new THREE.Vector3()).add(this.cameraDir().multiplyScalar(2)), 0x44ff66, 0.3);
  }

  private meleeAttack() {
    if (this.fireCd > 0) return;
    this.fireCd = 0.5;
    this.gunRecoil = 0.18;
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.cameraDir();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.group.position.clone().sub(origin);
      if (d.length() < 6 && d.normalize().dot(dir) > 0.6) {
        this.damageEnemy(e, WEAPONS[4].damage);
      }
    }
  }

  private cameraDir() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
  }

  // ------------------------- effects -------------------------
  private spawnTracer(a: THREE.Vector3, b: THREE.Vector3) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.effects.push({ obj: line, life: 0.06, max: 0.06, kind: "tracer" });
  }
  private spawnHitSpark(p: THREE.Vector3) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    m.position.copy(p);
    this.scene.add(m);
    this.effects.push({ obj: m, life: 0.18, max: 0.18, kind: "spark" });
  }
  private spawnExplosion(p: THREE.Vector3, color: number, scale: number) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(p);
    m.scale.setScalar(scale);
    this.scene.add(m);
    this.effects.push({ obj: m, life: 0.4, max: 0.4, kind: "boom" });
  }

  // ------------------------- loop -------------------------
  start() {
    this.clock.start();
    this.loop();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    let dt = this.clock.getDelta();
    dt = Math.min(dt, 0.05);
    if (this.status === "playing" && !this.paused) {
      this.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.hudAccum += dt;
    if (this.hudAccum > 0.08) {
      this.hudAccum = 0;
      this.pushHud();
    }
  };

  private update(dt: number) {
    this.updatePlayer(dt);
    this.updateWeapon(dt);
    this.updateEnemies(dt);
    this.updateGrenades(dt);
    this.updateEffects(dt);
    this.updateZone(dt);
    this.updateViewModel(dt);
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.health <= 0 && this.status === "playing") {
      this.health = 0;
      this.status = "lost";
      if (this.locked) document.exitPointerLock();
    }
  }

  private updatePlayer(dt: number) {
    // camera orientation
    const euler = new THREE.Euler(this.pitch - this.recoilPitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(euler);
    this.recoilPitch = Math.max(0, this.recoilPitch - dt * 0.6);

    // movement (horizontal)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys["KeyW"]) move.add(forward);
    if (this.keys["KeyS"]) move.sub(forward);
    if (this.keys["KeyD"]) move.add(right);
    if (this.keys["KeyA"]) move.sub(right);
    // mobile analog stick
    if (this.touchMove.x !== 0 || this.touchMove.y !== 0) {
      move.add(forward.clone().multiplyScalar(this.touchMove.y));
      move.add(right.clone().multiplyScalar(this.touchMove.x));
    }
    const speed = 18;
    if (move.lengthSq() > 1) move.normalize();
    move.multiplyScalar(speed);
    this.vel.x = move.x;
    this.vel.z = move.z;

    // jetpack
    const thrust = this.keys["Space"] || this.mobileThrust;
    this.flying = false;
    if (thrust && this.fuel > 0) {
      this.vel.y += 60 * dt;
      this.vel.y = Math.min(this.vel.y, 16);
      this.fuel = Math.max(0, this.fuel - 38 * dt);
      this.flying = true;
    } else {
      // regen fuel when grounded or not thrusting
      this.fuel = Math.min(this.maxFuel, this.fuel + 18 * dt);
    }
    // gravity
    this.vel.y -= 26 * dt;
    this.vel.y = Math.max(this.vel.y, -40);

    // integrate
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    // bounds
    const lim = this.mapSize / 2 - 3;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));

    // floor collision
    const floor = this.getHeight(this.pos.x, this.pos.z) + 2.4;
    if (this.pos.y <= floor) {
      this.pos.y = floor;
      this.vel.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.camera.position.copy(this.pos);

    // zone damage
    const dist = Math.hypot(this.pos.x, this.pos.z);
    if (dist > this.zoneRadius) {
      this.takeDamage(12 * dt, this.pos.x, this.pos.z, true);
    }
  }

  takeDamage(amount: number, fromX: number, fromZ: number, silent = false) {
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount * 0.6);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    this.health -= amount;
    if (!silent) {
      this.hitFlash = 0.25;
      const ang = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);
      this.damageDir = ang - this.yaw;
    }
  }

  private updateWeapon(dt: number) {
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.muzzleT > 0) {
      this.muzzleT -= dt;
      if (this.muzzleT <= 0) this.muzzle.visible = false;
    }
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        const w = WEAPONS[this.weaponIndex];
        const need = w.clip - this.clips[this.weaponIndex];
        const take = Math.min(need, this.reserves[this.weaponIndex]);
        this.clips[this.weaponIndex] += take;
        this.reserves[this.weaponIndex] -= take;
      }
    }
    // auto / semi firing
    const w = WEAPONS[this.weaponIndex];
    if (this.firing && (this.locked || this.mobile)) {
      if (w.type === "auto") this.shoot();
      else if (w.type === "semi") {
        if (this.fireCd <= 0) this.shoot();
        this.firing = false; // semi needs re-click
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.update(dt, this.pos, this);
      // zone damage on enemies
      const d = Math.hypot(e.group.position.x, e.group.position.z);
      if (d > this.zoneRadius + 6) {
        e.health -= 10 * dt;
        if (e.health <= 0) this.damageEnemy(e, 0.01);
      }
    }
  }

  // enemy shoots player
  enemyShoot(e: Enemy) {
    const origin = e.group.position.clone().add(new THREE.Vector3(0, 2.5, 0));
    this.spawnTracer(origin, this.pos.clone());
    if (Math.random() < 0.45) {
      this.takeDamage(5 + Math.random() * 5, e.group.position.x, e.group.position.z);
    }
  }

  private updateGrenades(dt: number) {
    for (let i = this.grenadeProj.length - 1; i >= 0; i--) {
      const g = this.grenadeProj[i];
      g.vel.y -= 30 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += dt * 6;
      g.mesh.rotation.z += dt * 5;
      const floor = this.getHeight(g.mesh.position.x, g.mesh.position.z) + 0.5;
      if (g.mesh.position.y <= floor) {
        g.mesh.position.y = floor;
        g.vel.y = -g.vel.y * 0.4;
        g.vel.x *= 0.6;
        g.vel.z *= 0.6;
      }
      g.life -= dt;
      if (g.life <= 0) {
        this.explodeGrenade(g.mesh.position.clone());
        this.scene.remove(g.mesh);
        this.grenadeProj.splice(i, 1);
      }
    }
  }

  private explodeGrenade(p: THREE.Vector3) {
    this.spawnExplosion(p, 0xff8822, 4);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.group.position.distanceTo(p);
      if (d < 10) this.damageEnemy(e, WEAPONS[2].damage * (1 - d / 10));
    }
    const dp = this.pos.distanceTo(p);
    if (dp < 9) this.takeDamage(40 * (1 - dp / 9), p.x, p.z);
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const ef = this.effects[i];
      ef.life -= dt;
      const t = ef.life / ef.max;
      if (ef.kind === "boom") {
        ef.obj.scale.multiplyScalar(1 + dt * 6);
        (ef.obj as THREE.Mesh).material && ((((ef.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, t)));
        ((ef.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).transparent = true;
      } else if (ef.kind === "tracer") {
        ((ef.obj as THREE.Line).material as THREE.LineBasicMaterial).opacity = Math.max(0, t);
      }
      if (ef.life <= 0) {
        this.scene.remove(ef.obj);
        this.effects.splice(i, 1);
      }
    }
  }

  private updateZone(dt: number) {
    this.zoneTimer -= dt;
    if (this.zoneTimer <= 0) {
      if (!this.zoneShrinking && this.zoneTarget > 18) {
        this.zoneShrinking = true;
        this.zoneTarget = Math.max(18, this.zoneTarget - 16);
        this.zoneTimer = 24;
      } else {
        this.zoneShrinking = false;
        this.zoneTimer = 14;
      }
    }
    if (this.zoneShrinking) {
      this.zoneRadius += (this.zoneTarget - this.zoneRadius) * Math.min(1, dt * 0.4);
    }
    this.zoneMesh.scale.set(this.zoneRadius, 1, this.zoneRadius);
    this.zoneRing.scale.set(this.zoneRadius, this.zoneRadius, 1);
    const pulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.15;
    (this.zoneMesh.material as THREE.MeshBasicMaterial).opacity = this.zoneShrinking ? 0.28 * pulse + 0.12 : 0.16;
  }

  private updateViewModel(dt: number) {
    // recoil recover
    this.gunRecoil = Math.max(0, this.gunRecoil - dt * 0.8);
    // bob
    const moving = (this.keys["KeyW"] || this.keys["KeyA"] || this.keys["KeyS"] || this.keys["KeyD"]) && this.grounded;
    if (moving) this.bobT += dt * 10;
    const bobY = moving ? Math.sin(this.bobT) * 0.012 : 0;
    const bobX = moving ? Math.cos(this.bobT * 0.5) * 0.012 : 0;
    this.viewGroup.position.set(bobX, bobY, this.gunRecoil * 0.5);
    this.gunGroup.rotation.x = -this.gunRecoil * 1.5;
    this.jetFlames.visible = this.flying;
    if (this.flying) {
      this.jetFlames.children.forEach((c) => {
        c.scale.y = 0.7 + Math.random() * 0.8;
      });
    }
    this.muzzle.scale.setScalar(0.8 + Math.random() * 0.8);
  }

  private pushHud() {
    const aliveEnemies = this.enemies.filter((e) => e.alive);
    this.onHud({
      health: Math.max(0, Math.round(this.health)),
      shield: Math.max(0, Math.round(this.shield)),
      fuel: Math.round(this.fuel),
      maxFuel: this.maxFuel,
      weaponIndex: this.weaponIndex,
      ammo: WEAPONS.map((w, i) => {
        if (w.type === "throw") return { clip: this.grenades, reserve: 0 };
        if (w.type === "heal") return { clip: this.medkits, reserve: 0 };
        if (w.type === "melee" || w.type === "jetpack") return { clip: 0, reserve: 0 };
        return { clip: this.clips[i], reserve: this.reserves[i] };
      }),
      reloading: this.reloading,
      kills: this.kills,
      alive: aliveEnemies.length + (this.status !== "lost" ? 1 : 0),
      zoneTime: Math.max(0, Math.ceil(this.zoneTimer)),
      zoneShrinking: this.zoneShrinking,
      zoneRadius: this.zoneRadius,
      mapSize: this.mapSize,
      playerX: this.pos.x,
      playerZ: this.pos.z,
      playerAngle: this.yaw,
      enemies: aliveEnemies.map((e) => ({ x: e.group.position.x, z: e.group.position.z })),
      status: this.status,
      hitFlash: Math.max(0, this.hitFlash / 0.25),
      damageDir: this.damageDir,
      flying: this.flying,
    });
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // single-fire for semi handled, expose for HUD button maybe
  triggerFire() {
    this.firing = true;
    this.tryAction();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    this.renderer.dispose();
  }
}

// ----------------------------- Enemy -----------------------------
class Enemy {
  group = new THREE.Group();
  hitbox: THREE.Mesh;
  alive = true;
  health = 100;
  hitTime = 0;
  private waypoint = new THREE.Vector3();
  private shootCd = 1 + Math.random() * 2;
  private vy = 0;

  constructor(x: number, z: number, floor: number) {
    this.group.position.set(x, floor + 0.1, z);
    // block character (roblox-ish)
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a3328 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xe0a878 });
    const hair = new THREE.MeshLambertMaterial({ color: 0x141414 });

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), dark);
    legL.position.set(-0.32, 0.7, 0);
    const legR = legL.clone();
    legR.position.x = 0.32;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.7), dark);
    torso.position.y = 2.1;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.3, 0.45), dark);
    armL.position.set(-0.85, 2.1, 0);
    const armR = armL.clone();
    armR.position.x = 0.85;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), skin);
    head.position.y = 3.25;
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.95), hair);
    hairTop.position.y = 3.72;
    // gun in hand
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.9), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.85, 2.0, -0.6);
    // jetpack
    const jp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    jp.position.set(0, 2.1, 0.55);

    [legL, legR, torso, armL, armR, head, hairTop, gun, jp].forEach((m) => {
      m.castShadow = true;
      this.group.add(m);
    });

    this.hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 4, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.hitbox.position.y = 2;
    this.hitbox.userData.enemy = this;
    this.group.add(this.hitbox);

    this.pickWaypoint();
  }

  private pickWaypoint() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 50;
    this.waypoint.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  update(dt: number, playerPos: THREE.Vector3, game: Game) {
    const p = this.group.position;
    const distToPlayer = p.distanceTo(playerPos);

    let target: THREE.Vector3;
    const aggro = distToPlayer < 55;
    if (aggro) {
      // strafe / approach player
      target = playerPos.clone();
      if (distToPlayer < 18) {
        // keep distance, strafe
        const away = p.clone().sub(playerPos).normalize();
        target = p.clone().add(away.multiplyScalar(5));
      }
    } else {
      target = new THREE.Vector3(this.waypoint.x, p.y, this.waypoint.z);
      if (p.distanceTo(new THREE.Vector3(this.waypoint.x, p.y, this.waypoint.z)) < 4) this.pickWaypoint();
    }

    const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z);
    if (dir.lengthSq() > 0.01) {
      dir.normalize();
      const spd = aggro ? 9 : 6;
      p.x += dir.x * spd * dt;
      p.z += dir.z * spd * dt;
      // face movement / player
      const faceDir = aggro ? new THREE.Vector3(playerPos.x - p.x, 0, playerPos.z - p.z) : dir;
      this.group.rotation.y = Math.atan2(faceDir.x, faceDir.z);
    }

    // gravity + occasional jetpack hop
    const floor = (game as any).getHeight(p.x, p.z) + 0.1;
    if (aggro && Math.random() < 0.012 && p.y < floor + 1) this.vy = 12;
    this.vy -= 26 * dt;
    p.y += this.vy * dt;
    if (p.y <= floor) {
      p.y = floor;
      this.vy = 0;
    }

    // shooting
    if (aggro && distToPlayer < 50) {
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        this.shootCd = 0.6 + Math.random() * 1.2;
        game.enemyShoot(this);
      }
    }

    // hit flash
    if (this.hitTime > 0) {
      this.hitTime -= dt;
      this.group.scale.setScalar(1.08);
    } else {
      this.group.scale.setScalar(1);
    }
  }
}

interface GrenadeProj {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}
interface Effect {
  obj: THREE.Object3D;
  life: number;
  max: number;
  kind: "tracer" | "spark" | "boom";
}
