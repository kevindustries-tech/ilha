// Ilha 3D low-poly procedural. Tudo gerado por codigo, sem assets externos.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadChars, charsReady, makeChar, SKINS } from './chars.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, ...extra });
const C = {
  grass: 0x5cb85c, grass2: 0x4aa34a, sand: 0xe8d9a0, rock: 0x7d7f85, trunk: 0x8b5a2b, leaf: 0x3f9142,
  wood: 0xb07c4f, wall: 0xf1e7d0, roof: 0xc0392b, stone: 0xbfb9a8, water: 0x2f80c7, dark: 0x2b2b2b,
  skin: 0xf0c8a0, shirt: 0x3b82f6, pants: 0x1f2937, flame: 0xff7a1a, ghost: 0xffffff,
};

function box(w, h, d, color, x = 0, y = 0, z = 0, extra) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra)); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 8, extra) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, extra)); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function cone(r, h, color, x = 0, y = 0, z = 0, seg = 6, extra) { return cyl(0, r, h, color, x, y, z, seg, extra); }
function sphere(r, color, x = 0, y = 0, z = 0, extra) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, extra)); m.position.set(x, y, z); m.castShadow = true; return m; }
function ghostify(g) { g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .18; o.material.color.set(C.ghost); o.castShadow = false; } }); }

function tree(scale = 1, x = 0, z = 0) {
  const g = new THREE.Group();
  g.add(cyl(.08 * scale, .12 * scale, .7 * scale, C.trunk));
  const f1 = cone(.55 * scale, .9 * scale, C.leaf, 0, .5 * scale); g.add(f1);
  const f2 = cone(.4 * scale, .7 * scale, C.grass2, 0, 1.0 * scale); g.add(f2);
  g.position.set(x, 0, z); return g;
}
function palm(x, z, rot = 0) {
  const g = new THREE.Group();
  const t = cyl(.07, .1, 1.6, C.trunk); t.rotation.z = .15; g.add(t);
  for (let i = 0; i < 5; i++) { const l = box(.9, .04, .25, C.leaf, .35, 1.55, 0); l.rotation.y = i * Math.PI * 2 / 5; l.rotation.z = -.4; l.position.set(Math.cos(i * 1.26) * .35, 1.6, Math.sin(i * 1.26) * .35); g.add(l); }
  g.position.set(x, 0, z); g.rotation.y = rot; return g;
}

// ---------- distritos ----------
function scaffold(w, d, h, x, z) {
  const g = new THREE.Group();
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cyl(.03, .03, h, C.wood, x + sx * w / 2, 0, z + sz * d / 2, 5));
  return g;
}
export function buildAcademia(lvl, prog, doneToday) {
  const g = new THREE.Group();
  g.add(box(3.4, .12, 3, C.stone, 0, 0, 0)); // piso
  if (lvl === 0 && prog === 0) { g.add(box(1, .3, .3, C.wood, 0, .12, .8)); return g; }
  const fh = 1.1, MAXF = 5;                 // teto visual: 5 andares
  const floors = Math.min(lvl, MAXF), extra = Math.max(0, lvl - MAXF);
  for (let i = 0; i < floors; i++) {
    const f = box(2.6 - i * .1, fh, 2.2 - i * .08, i % 2 ? C.wall : 0xdfe6ef, 0, .12 + i * fh, 0); g.add(f);
    for (const sx of [-1, 1]) g.add(box(.5, .5, .05, 0x8ed0ff, sx * .7, .12 + i * fh + .3, (2.2 - i * .08) / 2, { emissive: doneToday ? 0x3399ff : 0x000000, emissiveIntensity: .8 }));
  }
  if (prog > 0 && lvl < MAXF) {
    g.add(box(2.6 - lvl * .1, fh * prog, 2.2 - lvl * .08, 0xc9d6e3, 0, .12 + lvl * fh, 0));
    g.add(scaffold(2.9, 2.5, fh * lvl + fh, 0, 0));
  } else if (lvl > 0) {
    g.add(cone(1.9, .7, C.roof, 0, .12 + floors * fh, 0, 4));
  }
  // depois do 5o andar: cada nivel adiciona equipamento no patio (infinito, em anel)
  const eq = extra * 3 + (lvl >= MAXF ? Math.round(prog * 3) : 0);
  for (let k = 0; k < Math.min(eq, 24); k++) {
    const a = k * .55 + 1.2, r = 2.1 + Math.floor(k / 11) * .55;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (k % 3 === 0) { const d = cyl(.06, .06, .5, C.dark, x, .1, z, 6); d.rotation.z = Math.PI / 2; d.rotation.y = a; g.add(d); g.add(sphere(.12, C.dark, x + Math.cos(a) * .25, .16, z + Math.sin(a) * .25)); g.add(sphere(.12, C.dark, x - Math.cos(a) * .25, .16, z - Math.sin(a) * .25)); }
    else if (k % 3 === 1) g.add(box(.7, .35, .3, 0x374151, x, 0, z));
    else g.add(cyl(.28, .28, .14, 0x111827, x, 0, z, 12));
  }
  // placa e halteres
  const sign = box(1.6, .35, .08, doneToday ? 0xffb703 : 0x6b7280, 0, .12 + Math.max(floors, 1) * fh - .5, 1.15, { emissive: doneToday ? 0xff9900 : 0, emissiveIntensity: .6 }); g.add(sign);
  g.add(cyl(.05, .05, .6, C.dark, -1.3, .12, 1.2, 6).rotateZ(Math.PI / 2));
  return g;
}
// pessoa generica (amigos, familia); Bob usa buildPersonagem
// rosto: olhos, boca, cabelo (cor) ou bone
export function rosto(g, y, r, cabelo = 0x3b2a1a, bone = null, sorriso = true) {
  const eye = (s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r * .13, 6, 6), mat(0x111111)); e.position.set(s * r * .38, y + r * .1, r * .85); g.add(e); const w = new THREE.Mesh(new THREE.SphereGeometry(r * .2, 6, 6), mat(0xffffff)); w.position.set(s * r * .38, y + r * .1, r * .8); g.add(w); };
  eye(-1); eye(1);
  const m = box(r * .5, r * .08, r * .06, 0x7a3b2e, 0, y - r * .35, r * .9); if (sorriso) m.rotation.z = 0; g.add(m);
  if (bone) { g.add(cyl(r * 1.05, r * 1.05, r * .5, bone, 0, y + r * .55, 0, 10)); g.add(box(r * 1.2, r * .12, r * .8, bone, 0, y + r * .55, r * .6)); }
  else { const h = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55), mat(cabelo)); h.position.set(0, y + r * .12, -r * .08); g.add(h); }
}
export function buildPessoa(cor, escala = 1, cabelo = 0x3b2a1a, andar = true) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .55, 2, 6), mat(cor)); body.position.y = .9; body.castShadow = true;
  const head = sphere(.19, C.skin, 0, 1.45, 0); g.add(body, head);
  rosto(g, 1.45, .19, cabelo);
  const legs = [-1, 1].map(s => { const l = cyl(.08, .09, .5, C.pants, s * .12, 0, 0, 6); l.geometry.translate(0, -.25, 0); l.position.y = .5; return l; });
  legs.forEach(l => g.add(l));
  [-1, 1].forEach(s => { const a = cyl(.06, .06, .5, C.skin, s * .32, .62, 0, 6); a.rotation.z = s * .3; g.add(a); });
  g.userData.legs = legs;
  g.scale.setScalar(escala); return g;
}
export function buildCachorro(cor) {
  const g = new THREE.Group();
  g.add(box(.55, .28, .25, cor, 0, .25, 0)); g.add(box(.26, .24, .22, cor, .38, .38, 0));
  [-1, 1].forEach(s => { g.add(box(.08, .12, .06, 0x222222, .46, .62, s * .08)); });
  [[.18, .1], [-.18, .1], [.18, -.1], [-.18, -.1]].forEach(([x, z]) => g.add(cyl(.04, .04, .25, cor, x, 0, z, 5)));
  const t = cyl(.03, .03, .3, cor, -.3, .4, 0, 5); t.rotation.z = .8; g.add(t);
  return g;
}
export function buildCasa(cor) {
  const g = new THREE.Group();
  g.add(box(2.2, 1.3, 1.8, cor, 0, 0, 0));
  const r = cone(1.7, .9, C.roof, 0, 1.3, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, .82); g.add(r);
  g.add(box(.5, .8, .06, C.trunk, .3, 0, .93)); g.add(box(.45, .45, .06, 0xffe08a, -.55, .5, .93, { emissive: 0xffb000, emissiveIntensity: .8 }));
  g.add(box(.3, .6, .3, C.stone, -.7, 1.6, -.4));
  return g;
}
export function buildBandeirinhas(n = 12) {
  const g = new THREE.Group();
  const cores = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0xe67e22];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const f = cone(.12, .25, cores[i % 5], Math.cos(a) * 3.2, 1.9, Math.sin(a) * 3.2, 3); f.rotation.x = Math.PI; f.castShadow = false; g.add(f); }
  return g;
}
// Arquipelago: as ilhas vizinhas SEMPRE existiram (natureza). Bob ocupa uma por vez: cais + casa.
export function buildIlhaVizinhaNatural(i) {
  const g = new THREE.Group();
  const r = 2.4 + (i % 3) * .5;
  g.add(cyl(r, r + .7, 1.2, C.sand, 0, -1.0, 0, 8)); g.add(cyl(r - .5, r - .2, .5, C.grass, 0, 0, 0, 8));
  g.add(tree(1.1 + (i % 2) * .3, -.4, .3)); g.add(tree(.8, .9, -.9)); if (i % 2) g.add(palm(-1.2, -1.0, i));
  g.add(sphere(.35, C.rock, r - .6, .2, .4));
  return g;
}
export function buildOcupacao(i) {
  const g = new THREE.Group();
  g.add(box(1.3, 1.0, 1.1, C.wall, .3, .5, 0)); g.add(cone(1.05, .6, [C.roof, 0x2980b9, 0x27ae60][i % 3], .3, 1.5, 0, 4).rotateY(Math.PI / 4));
  for (let k = 0; k < 4; k++) g.add(box(.5, .08, .9, C.wood, -1.6 - k * .52, .45, 0));
  g.add(cyl(.05, .05, 1.2, C.wood, -1.9, .5, .55, 5)); g.add(box(.4, .28, .03, 0xe74c3c, -1.9, 1.55, .55));
  return g;
}
// ---------- cidade ----------
export function buildPredio(id) {
  const g = new THREE.Group();
  const casa = (w, h, d, cor, roofCor = C.roof) => { g.add(box(w, h, d, cor, 0, 0, 0)); const r = cone(Math.max(w, d) * .72, .8, roofCor, 0, h, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(r); };
  const placa = (cor, y = 1.0) => g.add(box(1.0, .35, .06, cor, 0, y, 1.06, { emissive: cor, emissiveIntensity: .25 }));
  switch (id) {
    case 'padaria': casa(2.2, 1.3, 2.0, 0xf5d0a9, 0x8b5a2b); placa(0xd97706); g.add(cyl(.12, .12, .6, C.stone, .7, 1.5, -.4, 6)); break;
    case 'mercado': casa(2.8, 1.4, 2.2, 0xfde68a, 0x16a34a); placa(0x16a34a); for (let i = 0; i < 3; i++) g.add(box(.5, .4, .4, [0xe74c3c, 0xf39c12, 0x2ecc71][i], -.8 + i * .8, 0, 1.4)); break;
    case 'hospital': casa(3.0, 1.8, 2.4, 0xffffff, 0xd1d5db); g.add(box(.7, .18, .08, 0xdc2626, 0, 1.3, 1.24)); g.add(box(.18, .7, .08, 0xdc2626, 0, 1.04, 1.24)); break;
    case 'seguranca': casa(2.4, 1.4, 2.0, 0x93c5fd, 0x1e3a8a); g.add(sphere(.16, 0x60a5fa, 0, 1.55, 1.05, { emissive: 0x3b82f6, emissiveIntensity: 1.2 })); placa(0x1e40af, .8); break;
    case 'escola': casa(3.0, 1.4, 2.2, 0xfef3c7, 0xf59e0b); for (let i = 0; i < 3; i++) g.add(box(.45, .45, .05, 0x8ed0ff, -.9 + i * .9, .5, 1.12)); g.add(cyl(.04, .04, 1.4, 0x9ca3af, 1.7, 0, 1.2, 5)); g.add(box(.5, .3, .03, 0x22c55e, 1.95, 1.1, 1.2)); break;
    case 'prefeitura': g.add(box(3.6, 2.0, 2.6, 0xf1e7d0, 0, 0, 0)); g.add(box(4.0, .3, 3.0, 0xd6d3d1, 0, 2.0, 0)); for (let i = 0; i < 4; i++) g.add(cyl(.13, .13, 2.0, 0xffffff, -1.35 + i * .9, 0, 1.45, 8)); g.add(cyl(.04, .04, 1.6, 0x9ca3af, 0, 2.3, 0, 5)); g.add(box(.6, .35, .03, 0x2563eb, .32, 3.5, 0)); g.add(box(.6, .35, .03, 0x22c55e, .32, 3.5, .02)); break;
    case 'praca': g.add(cyl(2.2, 2.2, .1, 0xd6c9a3, 0, 0, 0, 12)); for (let i = 0; i < 6; i++) g.add(cyl(.06, .06, 1.6, C.wood, Math.cos(i * 1.047) * 1.1, .1, Math.sin(i * 1.047) * 1.1, 5)); g.add(cone(1.5, .6, C.roof, 0, 1.7, 0, 6)); g.add(cyl(1.2, 1.2, .3, C.wood, 0, .1, 0, 6)); for (let i = 0; i < 4; i++) g.add(box(.9, .15, .3, C.wood, Math.cos(i * 1.57 + .78) * 1.8, .3, Math.sin(i * 1.57 + .78) * 1.8)); break;
    case 'porto': for (let i = 0; i < 8; i++) g.add(box(.6, .1, 2.0, C.wood, i * .62, .4, 0)); for (let i = 0; i <= 8; i += 2) for (const z of [-1, 1]) g.add(cyl(.06, .06, .9, C.wood, i * .62, 0, z, 5)); g.add(box(1.4, .5, .7, 0xe74c3c, 5.6, -.2, 1.4)); break;
    case 'biblioteca': casa(2.8, 1.6, 2.2, 0xd6d3d1, 0x7c2d12); for (let i = 0; i < 4; i++) g.add(box(.3, .5, .06, [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b][i], -.6 + i * .4, .6, 1.12)); break;
    case 'oficina': casa(2.4, 1.3, 2.4, 0x9ca3af, 0x374151); g.add(cyl(.12, .12, .9, C.stone, .8, 1.3, -.6, 6)); g.add(box(.7, .5, .5, 0xf59e0b, -.5, 0, 1.5)); g.add(cyl(.2, .2, .1, C.dark, .6, 0, 1.6, 10)); break;
    default: casa(2.0, 1.2, 1.8, C.wall);
  }
  return g;
}
// predio generico que cresce (biblioteca, oficina)
export function buildGenerico(tipo, lvl, prog, doneToday, night) {
  const g = new THREE.Group();
  const L = Math.min(lvl, 5);
  g.add(box(3.2, .12, 2.8, C.stone, 0, 0, 0));
  if (lvl === 0 && prog === 0) { g.add(box(1, .3, .3, C.wood, 0, .12, .8)); return g; }
  const w = 2.0 + L * .2, d = 1.8 + L * .15, h = 1.0 + L * .3;
  const cor = tipo === 'biblioteca' ? 0xd6d3d1 : 0x9ca3af, roof = tipo === 'biblioteca' ? 0x7c2d12 : 0x374151;
  g.add(box(w, h, d, cor, 0, .12, 0));
  const r = cone(Math.max(w, d) * .72, .7, roof, 0, .12 + h, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(r);
  if (tipo === 'biblioteca') for (let i = 0; i < Math.min(L + 1, 5); i++) g.add(box(.25, .45, .06, [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b, 0x8b5cf6][i], -.7 + i * .35, .5, d / 2 + .01, { emissive: night && doneToday ? 0x333333 : 0 }));
  else { g.add(cyl(.12, .12, .8, C.stone, w / 2 - .3, .12 + h, -.4, 6)); g.add(box(.6, .4, .4, 0xf59e0b, -w / 2 + .2, .12, d / 2 + .3)); if (L >= 2) g.add(cyl(.22, .22, .1, C.dark, w / 2 - .4, .12, d / 2 + .4, 10)); }
  g.add(box(.5, .5, .05, 0xffe08a, 0, .5, d / 2 + .01, { emissive: night && doneToday ? 0xffb000 : 0, emissiveIntensity: 1 }));
  if (prog > 0 && lvl < 5) g.add(scaffold(w + .4, d + .4, h + .8, 0, 0));
  for (let k = 5; k < lvl; k++) g.add(tree(.6, -2.0 + (k % 3) * .6, -1.6 - Math.floor((k - 5) / 3) * .5));
  return g;
}
// ---------- tecnologia ----------
export function buildGerador() {
  const g = new THREE.Group();
  g.add(box(.9, .6, .6, 0x4b5563, 0, 0, 0)); g.add(cyl(.12, .12, .5, 0x9ca3af, .55, .3, 0, 8).rotateZ(Math.PI / 2));
  const m = cyl(.04, .04, .5, C.dark, .8, .45, 0, 5); m.rotation.x = Math.PI / 2; m.name = 'manivela'; g.add(m);
  g.add(box(.3, .25, .5, 0xdc2626, -.2, .6, 0));
  return g;
}
export function buildMoinho() {
  const g = new THREE.Group();
  g.add(cyl(.35, .55, 3.2, C.wall, 0, 0, 0, 8)); g.add(cone(.6, .6, C.roof, 0, 3.2, 0, 8));
  const pas = new THREE.Group(); pas.name = 'pas'; pas.position.set(0, 3.0, .6);
  for (let i = 0; i < 4; i++) { const p = box(.25, 1.6, .05, C.wood, 0, 0, 0); p.position.set(0, .8, 0); const h = new THREE.Group(); h.add(p); h.rotation.z = i * Math.PI / 2; pas.add(h); }
  g.add(pas); return g;
}
export function buildPaineis() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const p = box(1.1, .06, .8, 0x1e3a8a, i * 1.25 - 1.25, .5, 0, { metalness: .6, roughness: .3 }); p.rotation.x = -.5; g.add(p); g.add(cyl(.04, .04, .5, 0x9ca3af, i * 1.25 - 1.25, 0, .3, 5)); }
  return g;
}
export function buildAntena(parabolica) {
  const g = new THREE.Group();
  g.add(cyl(.06, .1, parabolica ? 1.4 : 3.6, 0x9ca3af, 0, 0, 0, 6));
  if (parabolica) { const d = new THREE.Mesh(new THREE.SphereGeometry(.9, 12, 8, 0, Math.PI * 2, 0, .9), mat(0xe5e7eb, { side: THREE.DoubleSide })); d.rotation.x = -1.0; d.position.set(0, 1.6, .2); g.add(d); g.add(box(.08, .08, .08, 0xef4444, 0, 2.2, .6, { emissive: 0xff0000, emissiveIntensity: 1 })); }
  else { for (let i = 0; i < 3; i++) g.add(box(1.0 - i * .25, .04, .04, 0x9ca3af, 0, 2.6 + i * .4, 0)); g.add(sphere(.08, 0xef4444, 0, 3.7, 0, { emissive: 0xff0000, emissiveIntensity: 1.5 })); }
  return g;
}
export function buildPostes(aceso) {
  const g = new THREE.Group();
  for (const [x, z] of [[2.4, 3.0], [-2.6, 2.4], [-1.6, -3.4], [3.4, -3.8], [5.2, 2.8]]) {
    g.add(cyl(.05, .07, 1.8, 0x374151, x, 0, z, 6));
    g.add(sphere(.14, 0xfff1b8, x, 1.9, z, { emissive: aceso ? 0xffd166 : 0x111111, emissiveIntensity: aceso ? 1.5 : 0 }));
    if (aceso) { const l = new THREE.PointLight(0xffd166, .9, 5, 1.8); l.position.set(x, 1.9, z); g.add(l); }
  }
  return g;
}
export function buildCapela(lvl, prog, doneToday, night) {
  const g = new THREE.Group();
  const L = Math.min(Math.max(lvl, 0), 6);   // teto visual da igreja
  const len = 1.6 + L * .35, wid = 1.3 + L * .12, h = 1.0 + L * .15;
  g.add(box(wid, h, len, C.wall, 0, 0, 0));
  const r = cone(Math.max(wid, len) * .62, .7, C.roof, 0, h, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(wid / len, 1, 1); g.add(r);
  const th = 1.4 + L * .55;
  g.add(box(.7, th, .7, C.wall, 0, 0, len / 2 - .1));
  g.add(cone(.55, .6, C.roof, 0, th, len / 2 - .1, 4));
  if (L >= 1) { g.add(box(.08, .5, .08, C.gold || 0xffcc4d, 0, th + .55, len / 2 - .1)); g.add(box(.3, .08, .08, 0xffcc4d, 0, th + .8, len / 2 - .1)); }
  const glow = night && doneToday;
  g.add(box(.35, .5, .06, 0xffe08a, 0, .4, len / 2 - .1 + .36, { emissive: glow ? 0xffb000 : 0, emissiveIntensity: 1.2 }));
  for (let i = 0; i < L; i++) g.add(box(.05, .4, .3, 0xffe08a, wid / 2 + .01, .35, -len / 2 + .6 + i * .35 * (len / Math.max(L, 1)) / .35 * .35, { emissive: glow ? 0xffb000 : 0, emissiveIntensity: 1 }));
  if (prog > 0) g.add(scaffold(wid + .3, len + .3, h + .6 + prog * .6, 0, 0));
  // arvore plantada junto a ribeiros
  const s = .8 + Math.sqrt(L * 7 + prog * 7) * .22;
  g.add(tree(s, wid / 2 + .9, -.3));
  return g;
}
export function buildHorta(lvl, prog, doneToday) {
  const g = new THREE.Group();
  g.add(box(3.2, .1, 2.6, 0x8a6a3c, 0, 0, 0));
  const n = Math.min(lvl * 3 + Math.round(prog * 3), 18);
  for (let i = 0; i < n; i++) {
    const x = -1.2 + (i % 6) * .48, z = -.8 + Math.floor(i / 6) * .7;
    g.add(cyl(.02, .03, .3, C.leaf, x, .1, z, 4));
    g.add(sphere(.11, i % 3 === 0 ? 0xe74c3c : i % 3 === 1 ? 0xf39c12 : 0x2ecc71, x, .45, z));
  }
  if (lvl >= 2) { // barraca de feira
    g.add(box(1.4, .8, .8, C.wood, -.8, .1, 1.7));
    const r = box(1.7, .06, 1.1, 0xe74c3c, -.8, 1.05, 1.7); g.add(r);
    for (let i = 0; i < 3; i++) g.add(box(.2, .06, 1.1, 0xf8f8f8, -1.5 + i * .55, 1.06, 1.7));
  }
  if (lvl >= 4) { // cozinha
    g.add(box(1.5, 1.1, 1.3, C.wall, 1.2, .1, 1.7));
    g.add(cone(1.1, .6, C.roof, 1.2, 1.2, 1.7, 4).rotateY(Math.PI / 4));
    g.add(cyl(.12, .12, .5, C.stone, 1.6, 1.4, 1.5, 6));
  }
  if (doneToday) g.add(sphere(.18, 0xffcc4d, 0, .9, -1.6, { emissive: 0xffaa00, emissiveIntensity: .5 }));
  if (prog > 0 && lvl >= 1) g.add(scaffold(1.6, 1.0, 1.4, lvl >= 4 ? 1.2 : -.8, 1.7));
  return g;
}
export function buildPersonagem(fit, resting) {
  const g = new THREE.Group();
  const w = .32 + Math.min(fit, 12) * .022, posture = -.35 + Math.min(fit, 12) * .03;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(w * .6, .6, 2, 6), mat(C.shirt)); body.position.y = .95; body.castShadow = true;
  const head = sphere(.2, C.skin, 0, 1.55, 0);
  const legs = [-1, 1].map(s => { const l = cyl(.09, .1, .55, C.pants, s * .13, 0, 0, 6); l.geometry.translate(0, -.275, 0); l.position.y = .55; return l; });
  const arms = [-1, 1].map(s => { const a = cyl(.07 + Math.min(fit, 12) * .008, .06, .55, C.skin, s * (w * .6 + .12), .65, 0, 6); a.rotation.z = s * .25; return a; });
  const torso = new THREE.Group(); torso.add(body, head, ...arms); rosto(torso, 1.55, .2, 0x3b2a1a, 0xf59e0b); torso.rotation.x = posture;
  g.add(torso, ...legs); g.userData.legs = legs;
  if (resting) { g.rotation.z = Math.PI / 2; g.position.y = .55; }
  return g;
}
export function buildRede() {
  const g = new THREE.Group();
  g.add(cyl(.06, .08, 1.3, C.trunk, -1.2, 0, 0, 6)); g.add(cyl(.06, .08, 1.3, C.trunk, 1.2, 0, 0, 6));
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.2, 1.1, 0), new THREE.Vector3(0, .35, 0), new THREE.Vector3(1.2, 1.1, 0));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .18, 6, false), mat(0xf5c542)); tube.scale.z = 2.2; g.add(tube);
  return g;
}
export function buildFogueira() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const l = cyl(.06, .06, .8, C.trunk, 0, 0, 0, 5); l.rotation.z = Math.PI / 2; l.rotation.y = i * Math.PI / 4; l.position.y = .06; g.add(l); }
  const f = cone(.25, .7, C.flame, 0, .1, 0, 6, { emissive: 0xff5500, emissiveIntensity: 1.5 }); f.name = 'flame'; g.add(f);
  const light = new THREE.PointLight(0xff8c3a, 0, 9, 1.6); light.position.y = .8; light.name = 'fire'; g.add(light);
  return g;
}
export function buildMesa() {
  const g = new THREE.Group();
  g.add(box(.9, .06, .6, C.wood, 0, .5, 0)); for (const [x, z] of [[-.4, -.25], [.4, -.25], [-.4, .25], [.4, .25]]) g.add(cyl(.03, .03, .5, C.wood, x, 0, z, 5));
  g.add(cyl(.22, .22, .03, 0xffffff, 0, .56, 0, 12)); g.add(sphere(.09, 0xd9a066, -.06, .64, 0)); g.add(sphere(.09, 0xd9a066, .08, .64, .04));
  g.add(cyl(.02, .02, .35, 0xf1c40f, .35, .56, .2, 6, { emissive: 0xffaa00, emissiveIntensity: 1 }));
  return g;
}
export function buildTV() {
  const g = new THREE.Group();
  g.add(box(.9, .55, .06, 0x111111, 0, .4, 0)); g.add(box(.8, .45, .02, 0x3ea0ff, 0, .45, .04, { emissive: 0x2b7fff, emissiveIntensity: 1.6 }));
  const l = new THREE.PointLight(0x4ea8ff, 1.2, 4); l.position.set(0, .7, .8); l.name = 'tv'; g.add(l);
  return g;
}
// ---------- desbloqueaveis ----------
function farol() { const g = new THREE.Group(); g.add(cyl(.35, .5, 2.6, 0xffffff, 0, 0, 0, 10)); g.add(cyl(.36, .36, .4, C.roof, 0, .9, 0, 10)); g.add(cyl(.36, .36, .4, C.roof, 0, 1.8, 0, 10)); g.add(cyl(.42, .42, .5, 0x222222, 0, 2.6, 0, 10)); g.add(cyl(.3, .3, .45, 0xfff3b0, 0, 2.62, 0, 10, { emissive: 0xffe066, emissiveIntensity: 1 })); g.add(cone(.5, .4, C.roof, 0, 3.1, 0, 10)); return g; }
function ilhaVizinha() { const g = new THREE.Group(); g.add(cyl(3, 3.6, 1.2, C.sand, 0, -1.0, 0, 9)); g.add(cyl(2.4, 2.8, .6, C.grass, 0, 0, 0, 9)); g.add(tree(1.1, .6, .3)); g.add(tree(.8, -.9, -.6)); return g; }
function ponte(len) { const g = new THREE.Group(); for (let i = 0; i < len; i++) g.add(box(.5, .08, 1.1, C.wood, i * .55, .45, 0)); for (const z of [-.55, .55]) for (let i = 0; i <= len; i += 3) g.add(cyl(.04, .04, .9, C.wood, i * .55, 0, z, 5)); return g; }
function navio() { const g = new THREE.Group(); const h = box(3, .9, 1.2, 0x6d4c41, 0, 0, 0); g.add(h); g.add(box(1.6, .5, .9, 0xf1e7d0, -.3, .9, 0)); g.add(cyl(.05, .05, 2.4, C.wood, .6, .9, 0, 6)); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), mat(0xffffff, { side: THREE.DoubleSide })); s.position.set(.6, 2.2, 0); g.add(s); return g; }
function montanha() { const g = new THREE.Group(); g.add(cone(4, 5, 0x6b7a8f, 0, 0, 0, 7)); g.add(cone(1.4, 1.6, 0xffffff, 0, 3.4, 0, 7)); return g; }

// ---------- ceu ----------
const SKY = [[0, 0x0a1630], [5, 0x1c2b5a], [6.5, 0xf29a6b], [8, 0x9fd3ff], [12, 0x7fc4ff], [16.5, 0x86c6ff], [18, 0xffb26b], [19.3, 0x3b2f6d], [20.5, 0x0a1630], [24, 0x0a1630]];

// ===========================================================================
// ILHA GRANDE (v3): a vila do Bob continua no miolo (raio < 16, as coordenadas
// antigas valem), e ao redor cresce o mundo selvagem ate raio ~46: praia,
// mata fechada, serra e um lago. Os bichos vivem la e nao chegam na vila.
// ===========================================================================
const R_VILA = 16, R_ILHA = 46;

// Mata fechada em InstancedMesh: centenas de arvores sem matar o celular.
function florestaDensa(pontos) {
  const g = new THREE.Group();
  const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .26, 1.7, 6), mat(C.trunk), pontos.length);
  const c1 = new THREE.InstancedMesh(new THREE.CylinderGeometry(0, 1.25, 2.3, 7), mat(C.leaf), pontos.length);
  const c2 = new THREE.InstancedMesh(new THREE.CylinderGeometry(0, .92, 1.8, 7), mat(C.grass2), pontos.length);
  for (const m of [tr, c1, c2]) { m.castShadow = true; m.receiveShadow = true; }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  pontos.forEach(([x, y, z, e, rot], i) => {
    q.setFromAxisAngle(up, rot); s.set(e, e, e);
    p.set(x, y + .85 * e, z); tr.setMatrixAt(i, M.compose(p, q, s));
    p.set(x, y + 2.30 * e, z); c1.setMatrixAt(i, M.compose(p, q, s));
    p.set(x, y + 3.50 * e, z); c2.setMatrixAt(i, M.compose(p, q, s));
  });
  g.add(tr, c1, c2); return g;
}

// Serra: picos desalinhados, os altos com neve.
function serra(picos) {
  const g = new THREE.Group();
  for (const [x, z, r, h, rot] of picos) {
    const base = cone(r * 1.45, h * .42, 0x7d8290, x, -.2, z, 6); base.rotation.y = rot + .4; g.add(base);
    const p = cone(r, h, 0x6f7480, x, 0, z, 6); p.rotation.y = rot; g.add(p);
    if (h > 9) { const n = cone(r * .34, h * .26, 0xf3f7ff, x, h * .74, z, 6); n.rotation.y = rot; g.add(n); }
  }
  return g;
}

// Bicho low-poly: corpo, cabeca e 4 patas com pivo (o frame() balanca as patas).
function bicho(cfg) {
  const corpo = cfg.corpo, cabeca = cfg.cabeca || cfg.corpo, esc = cfg.esc || 1;
  const chifre = cfg.chifre || 0, cauda = cfg.cauda || 0, pescoco = cfg.pescoco === undefined ? .3 : cfg.pescoco;
  const g = new THREE.Group(), L = [];
  g.add(box(.5, .42, .95, corpo, 0, .45, 0));
  g.add(box(.34, .32, .4, cabeca, 0, .62 + pescoco, .6));
  g.add(box(.1, .1, .16, 0x2b2b2b, 0, .66 + pescoco, .82));
  for (const sx of [-1, 1]) {
    g.add(box(.1, .16, .1, cabeca, sx * .13, .86 + pescoco, .52));
    if (chifre) { const ch = cyl(.02, .05, chifre, 0xefe6d0, sx * .11, .9 + pescoco, .58, 5); ch.rotation.x = -.5; g.add(ch); }
  }
  for (const par of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pv = new THREE.Group(); pv.position.set(par[0] * .19, .45, par[1] * .3);
    pv.add(box(.12, .46, .12, corpo, 0, -.46, 0)); g.add(pv); L.push(pv);
  }
  if (cauda) { const c = cyl(.03, .06, cauda, corpo, 0, .5, -.5, 5); c.rotation.x = .9; g.add(c); }
  g.scale.setScalar(esc); g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
  return g;
}
// Cada bicho mora numa regiao e nunca entra na vila (raio minimo).
const FAUNA = [
  { id: 'veado1',  corpo: 0xa9764a, cabeca: 0xbb8757, esc: 1.0, chifre: .5, cauda: .25, vel: 1.9, casa: [26, 26], raio: 11 },
  { id: 'veado2',  corpo: 0x9c6b42, cabeca: 0xb07c50, esc: .9,  chifre: .45, cauda: .25, vel: 2.0, casa: [-30, 16], raio: 10 },
  { id: 'javali',  corpo: 0x4f4034, esc: .8, pescoco: .02, cauda: .2, vel: 1.6, casa: [-26, -12], raio: 9 },
  { id: 'javali2', corpo: 0x5a4a3c, esc: .7, pescoco: .02, cauda: .2, vel: 1.5, casa: [22, -16], raio: 9 },
  { id: 'cabra1',  corpo: 0xe8e4dc, cabeca: 0xd9d4ca, esc: .8, chifre: .3, cauda: .18, vel: 1.4, casa: [-12, -27], raio: 7 },
  { id: 'cabra2',  corpo: 0xdcd6cc, cabeca: 0xcac4ba, esc: .75, chifre: .28, cauda: .18, vel: 1.3, casa: [6, -26], raio: 6 },
  { id: 'capivara',corpo: 0x8a6240, esc: .85, pescoco: .05, cauda: 0, vel: 1.0, casa: [30, 21], raio: 5 },
  { id: 'capivara2',corpo: 0x7d5838, esc: .75, pescoco: .05, cauda: 0, vel: .9, casa: [33, 6], raio: 5 },
  { id: 'tartaruga',corpo: 0x4e7c59, cabeca: 0x6f9a6a, esc: .6, pescoco: .05, vel: .35, casa: [-6, 43], raio: 4 },
  { id: 'tartaruga2',corpo: 0x44704e, cabeca: 0x659060, esc: .55, pescoco: .05, vel: .3, casa: [40, -20], raio: 4 },
];

// ---------- obras que ainda nao existiam ----------
export function buildColetorChuva() {
  const g = new THREE.Group();
  const asa = box(2.4, .1, 1.5, 0xbfc3c9, 0, .95, 0); asa.rotation.x = .3; asa.rotation.z = .12; g.add(asa);
  for (const sx of [-1, 1]) g.add(cyl(.06, .08, 1.0, C.wood, sx * .9, 0, 0, 5));
  g.add(cyl(.42, .42, .8, 0x4b5563, .1, 0, .95, 10));
  g.add(cyl(.38, .38, .08, 0x3b9ad6, .1, .74, .95, 10, { emissive: 0x1b4f72, emissiveIntensity: .15 }));
  return g;
}
export function buildFogao() {
  const g = new THREE.Group();
  g.add(box(1.5, .75, 1.0, C.stone, 0, 0, 0));
  g.add(box(1.1, .12, .8, 0x4b5563, 0, .75, 0));
  g.add(cyl(.2, .26, 1.7, C.stone, -.5, .75, -.25, 7));
  const f = cone(.22, .35, C.flame, .25, .58, .1, 5, { emissive: 0xaa3300, emissiveIntensity: .9 }); f.name = 'brasa'; g.add(f);
  g.add(box(.45, .45, .05, 0x2b2b2b, .25, .1, .52));
  return g;
}
export function buildPoco() {
  const g = new THREE.Group();
  g.add(cyl(.72, .78, .75, C.stone, 0, 0, 0, 12));
  g.add(cyl(.6, .6, .06, 0x2f80c7, 0, .7, 0, 12, { emissive: 0x11466e, emissiveIntensity: .25 }));
  for (const sx of [-1, 1]) g.add(cyl(.06, .06, 1.25, C.wood, sx * .62, .75, 0, 5));
  const tel = cone(1.15, .55, C.roof, 0, 2.0, 0, 4); tel.rotation.y = Math.PI / 4; g.add(tel);
  g.add(cyl(.05, .05, .5, C.wood, 0, 1.4, 0, 5));                      // corda
  g.add(box(.3, .3, .3, 0x8b5a2b, 0, 1.15, 0));
  return g;
}
export function buildGalinheiro() {
  const g = new THREE.Group();
  g.add(box(1.7, .9, 1.3, 0xc98a4b, 0, 0, 0));
  const r = cone(1.35, .6, 0x7c4a1e, 0, .9, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, .8); g.add(r);
  g.add(box(.4, .45, .05, 0x5a3517, 0, .05, .68));
  for (let i = 0; i < 7; i++) g.add(cyl(.04, .04, .6, C.wood, -1.5 + i * .5, 0, 1.4, 5));
  for (let i = 0; i < 3; i++) { const x = -1.0 + i * .9;
    g.add(sphere(.17, 0xf5f5f0, x, .72, 1.0)); g.add(sphere(.1, 0xf5f5f0, x + .06, .92, 1.08));
    g.add(box(.05, .06, .05, 0xdc2626, x + .06, 1.0, 1.08)); }
  return g;
}
// Obra em andamento: andaime + o tanto de material que ja subiu.
export function buildAndaime(prog) {
  const g = new THREE.Group();
  const h = 1.0 + prog * 1.6;
  g.add(scaffold(1.9, 1.6, h + .4, 0, 0));
  for (const y of [h * .45, h * .9]) { g.add(box(2.0, .05, .12, C.wood, 0, y, .8)); g.add(box(2.0, .05, .12, C.wood, 0, y, -.8)); }
  const n = Math.round(prog * 6);
  for (let i = 0; i < n; i++) { const row = Math.floor(i / 3), col = i % 3; g.add(box(.55, .28, .95, i % 2 ? C.stone : C.wood, -.6 + col * .6, row * .3, 0)); }
  const pl = box(.5, .34, .04, 0xf59e0b, 0, h + .45, .62, { emissive: 0x7c4a00, emissiveIntensity: .35 }); pl.name = 'placa'; g.add(pl);
  return g;
}

function skyColor(h) {
  for (let i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h <= SKY[i + 1][0]) {
    const t = (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
    return new THREE.Color(SKY[i][1]).lerp(new THREE.Color(SKY[i + 1][1]), t);
  }
  return new THREE.Color(SKY[0][1]);
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 900);
  camera.position.set(52, 38, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0); controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 6; controls.maxDistance = 240; controls.enablePan = false;
  controls.autoRotate = true; controls.autoRotateSpeed = .35;
  canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; clearTimeout(idle); idle = setTimeout(() => controls.autoRotate = true, 15000); });
  let idle;

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3a5a2a, .6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 320 }); scene.add(sun);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0); scene.add(moon);
  const sunMesh = sphere(5, 0xffe27a, 0, 0, 0, { emissive: 0xffd24d, emissiveIntensity: 1.5, fog: false }); sunMesh.castShadow = false; sunMesh.receiveShadow = false; scene.add(sunMesh);
  const moonMesh = sphere(3.4, 0xdfe7ff, 0, 0, 0, { emissive: 0xaebcff, emissiveIntensity: .9, fog: false }); moonMesh.castShadow = false; moonMesh.receiveShadow = false; scene.add(moonMesh);
  // estrelas
  const sg = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 500; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < .05) continue; sp.push(v.x * 300, v.y * 300, v.z * 300); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0 })); scene.add(stars);

  // agua
  const wg = new THREE.PlaneGeometry(620, 620, 90, 90); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: C.water, flatShading: true, roughness: .5, metalness: .1, transparent: true, opacity: .93 }));
  water.receiveShadow = true; scene.add(water);
  const wpos = wg.attributes.position, wbase = Float32Array.from(wpos.array);

  // ilha: o miolo e a vila do Bob (raio 16, coordenadas antigas preservadas);
  // fora dele o mundo selvagem ate raio 46.
  const island = new THREE.Group(); scene.add(island);
  island.add(cyl(R_ILHA + 3.5, R_ILHA + 7, 2.6, C.sand, 0, -2.2, 0, 26));      // praia
  island.add(cyl(R_ILHA, R_ILHA + 2.4, .6, C.grass, 0, -.25, 0, 26));          // campo
  island.add(cyl(R_ILHA - 1.2, R_ILHA - .2, .35, C.grass2, 0, .2, 0, 26));
  island.add(cyl(R_VILA + 1.0, R_VILA + 2.2, .10, 0x6cc46c, 0, .45, 0, 20));   // clareira da vila (topo em .55)
  for (let i = 0; i < 46; i++) { const a = i * .86, r = R_ILHA + 1.5 + Math.random() * 4; const rk = sphere(.3 + Math.random() * .7, C.rock, Math.cos(a) * r, .1, Math.sin(a) * r); rk.rotation.set(Math.random(), Math.random(), 0); island.add(rk); }
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = R_ILHA - 2 + Math.random() * 5; island.add(palm(Math.cos(a) * r, Math.sin(a) * r, Math.random() * 6.28)); }
  island.add(palm(14.4, 6.8, 1), palm(-12.6, 9.2, 2.4), palm(-14.9, -4.9, 4), palm(11.9, -11.3, 5.5), palm(2.2, 15.1, .8), palm(-5.5, -14.5, 3));

  // SERRA — norte/noroeste, bem longe da vila
  const serraG = serra([[-14, -34, 7.5, 15, .3], [-4, -39, 9, 19, .9], [8, -35, 6.5, 13, 1.7], [-25, -27, 6, 11, 2.4], [18, -30, 5, 9.5, .6], [1, -28, 4.2, 7.5, 1.2], [-20, -37, 5.5, 10, 2]]);
  serraG.position.y = .5; island.add(serraG);

  // LAGO — leste
  const LAGO = [30, 14], LAGO_R = 8.5;
  const lago = new THREE.Mesh(new THREE.CylinderGeometry(LAGO_R, LAGO_R * .9, .5, 22), new THREE.MeshStandardMaterial({ color: 0x3b9ad6, flatShading: true, roughness: .35, metalness: .15, transparent: true, opacity: .9 }));
  lago.position.set(LAGO[0], .5, LAGO[1]); lago.receiveShadow = true;
  island.add(cyl(LAGO_R + 1.8, LAGO_R + 2.6, .55, 0xdccf9e, LAGO[0], .16, LAGO[1], 22));
  island.add(lago);

  // MATA FECHADA — anel entre a vila e a costa, desviando da serra e do lago
  const arvores = [];
  for (let k = 0; k < 430; k++) {
    const a = Math.random() * 6.28, r = R_VILA + 3 + Math.random() * (R_ILHA - R_VILA - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z < -20 && x > -31 && x < 23) continue;
    if (Math.hypot(x - LAGO[0], z - LAGO[1]) < LAGO_R + 3.5) continue;
    arvores.push([x, .5, z, .75 + Math.random() * .75, Math.random() * 6.28]);
  }
  island.add(florestaDensa(arvores));

  // BICHOS — cada um anda so na sua regiao, longe do centro urbano do Bob
  const fauna = [];
  for (const cfg of FAUNA) {
    const g = bicho(cfg); g.position.set(cfg.casa[0], .55, cfg.casa[1]); island.add(g);
    fauna.push({ g, cfg, x: cfg.casa[0], z: cfg.casa[1], tx: cfg.casa[0], tz: cfg.casa[1], wait: Math.random() * 6 });
  }

  // A floresta e a pedreira DE TRABALHO ficam perto da vila (Bob vai la todo dia)
  // trilhas do centro pros distritos e pros recursos
  for (const [a, len] of [[0, 4.0], [2.094, 4.5], [4.189, 4.5], [-.75, 5.5], [3.05, 5.0]]) { const t = box(.5, .03, len, 0xd6c9a3, Math.cos(a) * (len / 2 + .6), .55, Math.sin(a) * (len / 2 + .6)); t.rotation.y = -a + Math.PI / 2; island.add(t); }

  function buildTelheiro() {
    const g = new THREE.Group();
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cyl(.07, .09, 1.5, C.wood, sx * 1.6, 0, sz * 1.1, 5));
    const r = box(3.6, .12, 2.6, 0x8b5a2b, 0, 1.5, 0); r.rotation.x = .12; g.add(r);
    g.add(box(3.6, .5, .1, C.wood, 0, 1.0, -1.15));
    return g;
  }

  // DEPOSITO de materiais: toras e pedras acumulam dia a dia; somem quando o andar fecha
  function buildDeposito(toras, pedras, madeiraHoje, pedraHoje) {
    const g = new THREE.Group();
    g.add(box(2.6, .06, 1.6, 0xd6c9a3, 0, 0, 0));
    for (let i = 0; i < Math.min(toras, 14); i++) { const row = Math.floor(i / 5), col = i % 5; const l = cyl(.13, .13, 1.0, C.trunk, -.7 + col * .3 - row * .15, .06 + row * .24, -.35, 7); l.rotation.x = Math.PI / 2; l.position.y = .19 + row * .24; if (madeiraHoje && i === toras - 1) l.material.emissive.set(0x553300); g.add(l); }
    for (let i = 0; i < Math.min(pedras, 14); i++) { const row = Math.floor(i / 5), col = i % 5; const s = sphere(.17, i === pedras - 1 && pedraHoje ? 0xd1d5db : C.rock, -.7 + col * .33 - row * .16, .17 + row * .26, .45); g.add(s); }
    return g;
  }

  // DESTROCOS do aviao (a historia: Bob caiu aqui sozinho). Fica na praia pra sempre.
  function buildAviao() {
    const g = new THREE.Group();
    const fus = cyl(.75, .9, 5.0, 0xd9d9d9, 0, .4, 0, 10); fus.rotation.z = Math.PI / 2 + .12; fus.position.set(0, 1.0, 0); g.add(fus);
    const nose = cone(.75, 1.2, 0xd9d9d9, 0, 0, 0, 10); nose.rotation.z = -Math.PI / 2; nose.position.set(3.1, 1.2, 0); g.add(nose);
    const asa = box(1.3, .12, 4.2, 0xbfc3c9, .3, 1.1, -1.6); asa.rotation.x = .25; g.add(asa);
    const asa2 = box(1.3, .12, 2.2, 0xbfc3c9, -2.4, .2, 1.4); asa2.rotation.z = .5; asa2.rotation.y = .8; g.add(asa2);
    g.add(box(.15, 1.4, 1.1, 0xe74c3c, -2.6, 1.1, 0));
    for (let i = 0; i < 4; i++) g.add(box(.35, .35, .05, 0x3a5a7a, -1.2 + i * .7, 1.35, .86));
    const fogo = cone(.2, .5, C.flame, -.5, 1.9, .2, 5, { emissive: 0x883300, emissiveIntensity: .8 }); fogo.name = 'fumaca'; g.add(fogo);
    return g;
  }
  const aviao = buildAviao(); aviao.position.set(31.5, .35, -28.5); aviao.rotation.y = -.7; island.add(aviao);
  // BARRACA feita com a lona do aviao: primeira casa do Bob (some quando a casa da familia chega)
  function buildBarraca() {
    const g = new THREE.Group();
    const lona = cone(1.3, 1.3, 0xe7e5e4, 0, 0, 0, 4); lona.rotation.y = Math.PI / 4; g.add(lona);
    g.add(box(.6, .7, .05, 0x3b3b3b, 0, 0, .92));
    g.add(cyl(.05, .05, 1.5, C.wood, 0, 0, 0, 5));
    g.add(box(.5, .2, .35, 0x9ca3af, 1.1, 0, .4)); g.add(box(.5, .2, .35, 0x9ca3af, 1.1, .2, .4));
    return g;
  }

  const slots = {}; // grupos substituiveis
  const npcState = {}; // estado persistente dos NPCs entre re-renders
  function put(name, obj, x, z, rotY = 0) {
    if (slots[name]) { island.remove(slots[name]); slots[name].traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    if (!obj) { delete slots[name]; return; }
    obj.position.set(x, .55, z); obj.rotation.y = rotY; island.add(obj); slots[name] = obj;
  }
  // desbloqueaveis (posicoes fixas)
  // o farol saiu daqui: virou obra (ver OBRA_LOTE)
  const unlock = { vizinha: ilhaVizinha(), ponte: ponte(48), navio: navio(), montanha: montanha() };
  unlock.vizinha.position.set(74, 0, 8);
  unlock.ponte.position.set(50, 0, 6);
  unlock.navio.position.set(58, -.3, 36);
  unlock.montanha.position.set(-8, -.5, -104);
  for (const k in unlock) scene.add(unlock[k]);
  const extras = new THREE.Group(); scene.add(extras);
  const arquipelago = []; // 8 ilhas naturais, sempre visiveis
  for (let i = 0; i < 8; i++) { const g = buildIlhaVizinhaNatural(i); const a = .6 + i * .8, r = 76 + (i % 2) * 13; g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.y = -a; scene.add(g); arquipelago.push(g); }
  window.__ilha = { scene, unlock, renderer, camera, controls, npcState, slots };
  let unlockState = {};

  const birds = new THREE.Group(); scene.add(birds);
  for (let i = 0; i < 4; i++) { const b = new THREE.Group(); const w1 = box(.35, .02, .1, 0x222222, -.17, 0, 0), w2 = box(.35, .02, .1, 0x222222, .17, 0, 0); w1.rotation.z = .5; w2.rotation.z = -.5; b.add(w1, w2); b.userData = { r: 34 + i * 5, s: .3 + i * .08, ph: i * 1.7, y: 8 + i * .7 }; birds.add(b); }

  scene.fog = new THREE.FogExp2(0x7fc4ff, .0019);
  let pulses = [];

  let lastDist = 0;
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const want = camera.aspect < 1 ? 118 : 90; if (want !== lastDist) { const dir = camera.position.clone().sub(controls.target).normalize(); camera.position.copy(controls.target).add(dir.multiplyScalar(want)); lastDist = want; } } }

  let view = null;
  loadChars().then(ok => { if (ok && view) apply(view); });
  function apply(v) {
    view = v;
    const night = v.hour < 6 || v.hour > 19;
    // OBRAS: habito nenhum constroi predio proprio. Bob levanta a lista em ordem,
    // com os materiais do deposito. Cada obra tem um lote fixo na ilha.
    const OBRA_LOTE = {
      abrigo:   [1.4, 5.2, Math.PI + .3],  fogueira: [0, .6, 0],        chuva:   [5.0, 2.6, -.6],
      horta:    [-3.6, 5.6, -.6],          deposito: [2.6, -2.8, .4],   cabana:  [1.4, 9.6, Math.PI],
      fogao:    [4.4, 9.2, Math.PI - .3],  poco:     [-1.9, 2.4, 0],    oficina: [-4.4, -5.8, .5],
      curral:   [-8.8, -6.6, .9],          moinho:   [-9.0, 8.6, .6],   radio:   [-6.6, -10.2, 0],
      pier:     [4.0, 44.0, Math.PI],      farol:    [-30.0, 32.0, .4], casa1:   [7.4, 7.4, -2.2],
      praca:    [Math.cos(1.5) * 12.4, Math.sin(1.5) * 12.4, -1.5 - Math.PI / 2],
      posto:    [-9.4, 11.2, -.4],         escola:   [10.6, 10.4, -2.4],
      mercado:  [-12.4, 4.6, 1.3],         camara:   [11.8, -3.2, -1.9],
    };
    const OBRA_BUILD = {
      abrigo:   () => buildBarraca(),
      fogueira: () => buildFogueira(),
      chuva:    () => buildColetorChuva(),
      horta:    () => buildHorta(2, 1, !!v.perfectToday),
      deposito: () => buildTelheiro(),
      cabana:   () => buildCasa(0xe4d3ad),
      fogao:    () => buildFogao(),
      poco:     () => buildPoco(),
      oficina:  () => buildPredio('oficina'),
      curral:   () => buildGalinheiro(),
      moinho:   () => buildMoinho(),
      radio:    () => buildAntena(false),
      pier:     () => buildPredio('porto'),
      farol:    () => farol(),
      casa1:    () => buildCasa(0xf1e7d0),
      praca:    () => buildPredio('praca'),
      posto:    () => buildPredio('hospital'),
      escola:   () => buildPredio('escola'),
      mercado:  () => buildPredio('mercado'),
      camara:   () => buildPredio('prefeitura'),
    };
    const feitas = v.obras || [];
    const temCabana = feitas.includes('cabana');
    for (const id of Object.keys(OBRA_LOTE)) {
      const key = 'obra_' + id;
      // o abrigo de lona some quando a cabana fica pronta
      const mostra = feitas.includes(id) && !(id === 'abrigo' && temCabana);
      if (!mostra) { if (slots[key]) put(key, null, 0, 0); continue; }
      if (slots[key]) continue;                       // ja esta de pe, nao reconstroi
      const L = OBRA_LOTE[id]; put(key, OBRA_BUILD[id](), L[0], L[1], L[2]);
    }
    // a obra em andamento aparece como andaime no proprio lote dela
    const oa = v.obraAtual;
    const lote = oa && OBRA_LOTE[oa.id];
    put('andaime', lote ? buildAndaime(oa.prog) : null, lote ? lote[0] : 0, lote ? lote[1] : 0, lote ? lote[2] : 0);

    const dp = v.deposito || {};
    put('deposito_pilha', buildDeposito(dp.toras || 0, dp.pedras || 0, !!dp.madeiraHoje, !!dp.pedraHoje), 2.6, -1.0, .4);
    const compras = (v.compras || []).map(c => c.toLowerCase()).join(' ');
    v.esfiha = /esfiha|pizza|sorvete|doce|lanche|hamb|comida|jantar/.test(compras); v.tv = /tv|s[eé]rie|filme|jogo|game|netflix/.test(compras);
    put('rede', v.descanso ? buildRede() : null, 4.6, 5.4, .4);
    put('personagem', charsReady() && !v.descanso ? makeChar(SKINS.bob, .9 + Math.min(v.fit, 12) * .012) : buildPersonagem(v.fit, v.descanso), v.descanso ? 4.6 : 3.2, v.descanso ? 5.4 : 3.2, v.descanso ? .4 : Math.PI);
    put('mesa', v.esfiha ? buildMesa() : null, 1.6, -1.2, .3);
    put('tv', v.tv ? buildTV() : null, -1.8, -.2, 2.6);
    // moradores: Bob comecou sozinho; os outros chegam com os marcos
    const hab = v.habitantes || [];
    const temCasa = hab.some(h => h.id === 'casa');   // casa da familia (marco de 120 dias)
    put('casa', temCasa ? buildCasa(0xf1e7d0) : null, 4.6, 12.4, Math.PI);
    put('festa', hab.some(h => h.id === 'festa') ? buildBandeirinhas(14) : null, 0, .6, 0);
    // pontos de interesse (coordenadas da ilha) pras rotinas
    // pontos de interesse das rotinas: o lote de cada obra ja levantada, com a
    // frente dela (2 m a mais em z) pro morador nao ficar dentro da parede.
    const frente = id => { const L = OBRA_LOTE[id]; return [L[0], L[1] + 2.0]; };
    const P = { deposito: [2.6, .6], floresta: [7.0, -4.6], pedreira: [-8.2, 1.2], fogueira: [0, 2.4],
      // o canteiro so entra na rotina se for perto (farol e pier ficam na costa)
      obra: (lote && Math.hypot(lote[0], lote[1]) < 18) ? [lote[0], lote[1] + 2.0] : null };
    for (const id of Object.keys(OBRA_LOTE)) if (feitas.includes(id) && Math.hypot(OBRA_LOTE[id][0], OBRA_LOTE[id][1]) < 18) P[id] = frente(id);
    if (!P.obra) delete P.obra;
    const ondeMora = temCabana ? (P.cabana || [1.4, 11.6]) : (P.abrigo || [1.4, 7.2]);
    const home = temCasa ? [4.6, 14.4] : ondeMora;
    // so entram na rotina os lugares que ja existem
    const rota = (...ids) => { const r = ids.map(i => P[i]).filter(Boolean); return r.length ? r : [P.deposito]; };
    const ROT = {
      bob:     rota('obra', 'floresta', 'deposito', 'pedreira', 'obra', 'oficina'),
      amigo1:  rota('praca', 'mercado', 'deposito', 'poco'),
      amiga1:  rota('horta', 'deposito', 'mercado', 'poco'),
      amor:    [home, ...rota('horta', 'praca', 'fogueira')],
      bebe:    [home, ...rota('praca', 'escola')],
      amigo2:  rota('mercado', 'pier', 'praca', 'oficina'),
      festa:   rota('praca', 'mercado', 'fogueira'),
    };
    const npcAtivos = new Set();
    for (const h of hab) {
      let g = null, escala = 1;
      if (h.tipo === 'pessoa' && h.id !== 'bob') g = charsReady() ? makeChar(SKINS[h.id] || 'skaterMaleA') : buildPessoa(h.cor, 1, [0x3b2a1a, 0x1c1c1c, 0xb45309, 0xf5deb3, 0x6b21a8][h.nome.length % 5]);
      else if (h.tipo === 'crianca') { g = charsReady() ? makeChar(SKINS.bebe, .55) : buildPessoa(h.cor, .6, 0xf5deb3); escala = .6; }
      else if (h.tipo === 'cachorro') g = buildCachorro(h.cor);
      if (!g) continue;
      const name = 'hab_' + h.id; const st = npcState[name] || (npcState[name] = { x: home[0] + (Math.random() - .5) * 2, z: home[1] + 1.5, target: null, wait: Math.random() * 3 });
      put(name, g, st.x, st.z, 0); npcAtivos.add(name);
      st.routine = ROT[h.id] || rota('praca', 'deposito'); st.home = home; st.tipo = h.tipo; st.speed = h.tipo === 'cachorro' ? 2.2 : h.tipo === 'crianca' ? 1.1 : 1.4;
    }
    for (const k of Object.keys(npcState)) if (!npcAtivos.has(k)) delete npcState[k];
    // Bob tambem anda (a menos que esteja na rede)
    const bs = npcState.personagem || (npcState.personagem = { x: 3.2, z: 3.2, target: null, wait: 1 });
    bs.routine = ROT.bob; bs.home = home; bs.tipo = 'bob'; bs.speed = 1.5; bs.resting = !!v.descanso;
    if (!v.descanso) { slots.personagem.position.set(bs.x, .55, bs.z); }
    // ilhas extras (infinito): uma nova a cada 25 dias perfeitos depois do navio
    // ocupacao do arquipelago (a ilha ja existia; Bob constroi cais + casa nela)
    const nOcup = Math.min(v.ilhasExtras || 0, arquipelago.length);
    while (extras.children.length < nOcup) { const i = extras.children.length; const g = buildOcupacao(i); g.position.copy(arquipelago[i].position); g.position.y = .5; g.rotation.copy(arquipelago[i].rotation); extras.add(g); }
    while (extras.children.length > nOcup) extras.remove(extras.children[extras.children.length - 1]);
    // tecnologia (Bob e um genio): moinho, paineis, antena, parabolica, postes
    const tec = v.tecnologias || [];
    put('gerador', tec.includes('gerador') ? buildGerador() : null, 4.4, -1.2, 0);
    put('paineis', tec.includes('solar') ? buildPaineis() : null, 9.4, 3.6, 0);
    put('parabolica', tec.includes('internet') ? buildAntena(true) : null, 13.6, 1.6, 0);
    put('postes', tec.includes('gerador') ? buildPostes(night) : null, 0, 0, 0);
    // (a antiga lista CIDADE virou parte das OBRAS)
    unlockState = v.unlocked;
    for (const k in unlock) { const on = !!v.unlocked[k]; unlock[k].traverse(o => { if (o.isMesh) { o.material.transparent = !on; o.material.opacity = on ? 1 : .1; o.material.depthWrite = on; o.castShadow = on; o.receiveShadow = on; if (!on) { o.material.color.set(0xdfefff); o.material.emissive.set(0); } } }); unlock[k].visible = on || k !== 'montanha' || v.unlocked.navio; }
    birds.visible = !!v.unlocked.birds && v.weather.clear;
  }

  function pulse(name) { const g = slots[name]; if (g) pulses.push({ g, t: 0 }); }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); resize();
    const dt = Math.min((now - last) / 1000, .1); last = now; const t = now / 1000;
    const d = new Date(); const hp = new URLSearchParams(location.search).get('hora'); const hour = hp !== null ? +hp : d.getHours() + d.getMinutes() / 60;
    // ceu e sol
    const sky = skyColor(hour); scene.background = sky;
    const foggy = view && view.weather.fog;
    scene.fog.color.copy(foggy ? new THREE.Color(0x9aa5b1).lerp(sky, .4) : sky); scene.fog.density = foggy ? .013 : .0019;
    const ang = (hour - 6) / 12 * Math.PI; const sunUp = Math.sin(ang);
    sun.position.set(Math.cos(ang) * 120, Math.max(sunUp, .02) * 120, 48); sun.intensity = Math.max(sunUp, 0) * 1.7 * (foggy ? .55 : 1);
    // sol/lua bem longe: tem que parecer ceu, nao um objeto boiando em cima da ilha
    sunMesh.position.set(Math.cos(ang) * 320, Math.max(sunUp, .06) * 300, 120); sunMesh.visible = sunUp > -.05;
    moon.position.set(-Math.cos(ang) * 30, Math.max(-sunUp, .02) * 30, -12); moon.intensity = Math.max(-sunUp, 0) * .35;
    moonMesh.position.set(-Math.cos(ang) * 300, Math.max(-sunUp, .06) * 280, -140); moonMesh.visible = sunUp < .05;
    hemi.intensity = .25 + Math.max(sunUp, 0) * .5; stars.material.opacity = THREE.MathUtils.clamp(-sunUp * 2, 0, 1) * (foggy ? .3 : 1);
    // agua
    for (let i = 0; i < wpos.count; i++) { const x = wbase[i * 3], z = wbase[i * 3 + 2]; wpos.array[i * 3 + 1] = Math.sin(x * .4 + t * 1.2) * .12 + Math.cos(z * .5 + t * .9) * .12; }
    wpos.needsUpdate = true; wg.computeVertexNormals();
    // fogueira
    const fg = slots.obra_fogueira; if (fg) { const on = view && view.perfectToday && sunUp < .15; const fl = fg.getObjectByName('flame'), li = fg.getObjectByName('fire'); fl.visible = on; li.intensity = on ? 2.5 + Math.sin(t * 17) * .6 + Math.sin(t * 31) * .4 : 0; if (on) fl.scale.set(1 + Math.sin(t * 13) * .12, 1 + Math.sin(t * 9) * .18, 1); }
    // farol, moinho, fumaca do aviao
    if (slots.obra_farol) slots.obra_farol.rotation.y = .4 + t * .8;
    if (slots.obra_moinho) slots.obra_moinho.getObjectByName('pas').rotation.z = t * (view && view.weather.clear ? 1.6 : .7);
    const fum = aviao.getObjectByName('fumaca'); fum.position.y = 1.9 + (t % 3) * .5; fum.scale.setScalar(1 + (t % 3) * .35); fum.material.opacity = 1 - (t % 3) / 3; fum.material.transparent = true;
    if (unlock.navio.visible) { unlock.navio.position.y = -.3 + Math.sin(t * .8) * .12; unlock.navio.rotation.z = Math.sin(t * .6) * .04; }
    // passaros
    birds.children.forEach(b => { const u = b.userData; const a = t * u.s + u.ph; b.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 2 + u.ph) * .3, Math.sin(a) * u.r); b.rotation.y = -a; b.children[0].rotation.z = .5 + Math.sin(t * 9) * .4; b.children[1].rotation.z = -.5 - Math.sin(t * 9) * .4; });
    // NPCs: rotinas (dia: pontos de interesse; noite: fogueira ou casa)
    const noite = hour < 6 || hour >= 20;
    for (const name of Object.keys(npcState)) {
      const st = npcState[name], g = slots[name]; if (!g || st.resting) continue;
      let tgt = st.target;
      if (name === 'hab_rex') { const b = npcState.personagem; tgt = [b.x + .9, b.z + .5]; }
      else if (noite) { const fog = view && view.perfectToday && hour >= 19.5 && hour < 23.5; tgt = fog ? [Math.cos(st.ang || (st.ang = Math.random() * 6.28)) * 2.1, .6 + Math.sin(st.ang) * 2.1] : st.home; }
      else if (!tgt) { if (st.wait > 0) { st.wait -= dt; } else { st.target = tgt = st.routine[Math.floor(Math.random() * st.routine.length)]; } }
      let moving = false;
      if (tgt) {
        const dx = tgt[0] - st.x, dz = tgt[1] - st.z, dist = Math.hypot(dx, dz);
        if (dist > .25) { const s = Math.min(st.speed * dt, dist); st.x += dx / dist * s; st.z += dz / dist * s; g.rotation.y = Math.atan2(dx, dz); moving = true; }
        else if (!noite && name !== 'hab_rex') { st.target = null; st.wait = 2 + Math.random() * 5; }
      }
      g.position.x = st.x; g.position.z = st.z;
      const legs = g.userData.legs; if (legs) { const sw = moving ? Math.sin(t * 9) * .55 : 0; legs[0].rotation.x = sw; legs[1].rotation.x = -sw; }
      const ch = g.userData.char; if (ch) { ch.setMoving(moving); ch.update(dt); }
      if (name === 'hab_rex') g.position.y = .55 + (moving ? Math.abs(Math.sin(t * 12)) * .12 : 0);
      if (!moving && !noite && name !== 'hab_rex') g.rotation.y += Math.sin(t * .7) * .002; // "trabalhando"
    }    // BICHOS: cada um perambula so dentro da sua regiao, longe da vila do Bob
    for (const b of fauna) {
      const dx = b.tx - b.x, dz = b.tz - b.z, dist = Math.hypot(dx, dz);
      let andando = false;
      if (dist > .4) {
        const s = Math.min(b.cfg.vel * dt, dist);
        b.x += dx / dist * s; b.z += dz / dist * s;
        b.g.rotation.y = Math.atan2(dx, dz); andando = true;
      } else if (b.wait > 0) { b.wait -= dt; }
      else {
        const a = Math.random() * 6.28, r = Math.random() * b.cfg.raio;
        b.tx = b.cfg.casa[0] + Math.cos(a) * r; b.tz = b.cfg.casa[1] + Math.sin(a) * r;
        b.wait = 2 + Math.random() * 7;
      }
      b.g.position.set(b.x, .55, b.z);
      const sw = andando ? Math.sin(t * 7 * b.cfg.vel) * .5 : 0;
      b.g.userData.legs[0].rotation.x = sw;  b.g.userData.legs[1].rotation.x = sw;
      b.g.userData.legs2[0].rotation.x = -sw; b.g.userData.legs2[1].rotation.x = -sw;
    }
    // brasa do fogao
    if (slots.obra_fogao) { const br = slots.obra_fogao.getObjectByName('brasa'); if (br) br.scale.setScalar(1 + Math.sin(t * 8) * .12); }
    // pulsos de feedback
    pulses = pulses.filter(p => { p.t += dt * 2.2; const s = 1 + Math.sin(Math.min(p.t, 1) * Math.PI) * .18; p.g.scale.set(s, s, s); if (p.g === slots.personagem) p.g.position.y = .55 + Math.sin(Math.min(p.t, 1) * Math.PI) * .9; return p.t < 1; });
    controls.update(); renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  function snapshot() {
    const w = 640, h = Math.round(640 * canvas.height / canvas.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(canvas, 0, 0, w, h);
    return c.toDataURL('image/jpeg', .72);
  }
  return { apply, pulse, snapshot };
}
