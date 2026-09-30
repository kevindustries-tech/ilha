// Ilha 3D low-poly procedural. Tudo gerado por codigo, sem assets externos.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { fundirEstatico, JANELA } from './fundir.js';
import { loadChars, charsReady, makeChar, SKINS, skinDoAvatar } from './chars.js';
import { criarGrade } from './rotas.js';
import { criarMar, materialRio, materialCachoeira, materialLago, criarNevoa, atualizarAgua } from './agua.js';
import { CONSTRUTORES, criarAraras, criarVidaMarinha, criarNavios } from './vida.js';
import { criarArvores, criarCoqueiros, criarMacacos, criarVagalumes, tempo as tempoVento, vento, TOPO_COPA, CORES } from './natureza.js';

// Qualidade grafica por aparelho: 'leve' corta mata e bichos pela metade. Automatico
// pela memoria do aparelho; da pra trocar no config (fica so neste aparelho).
export const QUALIDADE = (() => { try { const q = localStorage.getItem('ilha.qualidade'); if (q) return q; } catch {} return navigator.deviceMemory && navigator.deviceMemory <= 4 ? 'leve' : 'alta'; })();
const DENS = QUALIDADE === 'leve' ? .5 : 1;

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
// Cachorro montado de frente pra +z, que e pra onde a cena gira quem anda. O antigo
// era montado de frente pra +x e andava de lado, "igual siri".
export function buildCachorro(cor) {
  const g = new THREE.Group(), L = [];
  g.add(box(.25, .26, .56, cor, 0, .27, 0));                               // corpo
  g.add(box(.22, .22, .26, cor, 0, .42, .36));                              // cabeca
  g.add(box(.12, .1, .14, cor, 0, .42, .54)); g.add(box(.06, .05, .04, 0x1c1c1c, 0, .5, .61));   // focinho
  [-1, 1].forEach(sx => { g.add(box(.06, .1, .05, 0x3b2a1a, sx * .08, .62, .32)); g.add(box(.04, .04, .02, 0x111111, sx * .06, .52, .49)); });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pv = new THREE.Group(); pv.position.set(sx * .08, .3, sz * .19);
    pv.add(box(.07, .28, .07, cor, 0, -.28, 0)); g.add(pv); L.push(pv);
  }
  const rabo = new THREE.Group(); rabo.position.set(0, .4, -.28); rabo.name = 'rabo';
  const t = cyl(.025, .035, .28, cor, 0, 0, 0, 5); t.rotation.x = -.9; rabo.add(t); g.add(rabo);
  g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
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
// ESCALAS. A ilha cresceu 1,6x (K) e a vila 2x (EV). A vila dobrou porque as casas
// eram do tamanho das pessoas: cabana com 2,2 de altura contando o telhado, pessoa com
// 1,8 -- a parede batia no ombro. Tudo continua escrito nas unidades antigas e e
// multiplicado aqui, pra mudar o tamanho de novo com um numero so.
const K = 1.6, EV = 2;
const R_VILA = 16 * EV, R_ILHA = 78 * K;

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
  { id: 'veado1',  corpo: 0xa9764a, cabeca: 0xbb8757, esc: 1.0, chifre: .5, cauda: .25, vel: 1.9, casa: [40, 44], raio: 16 },
  { id: 'veado2',  corpo: 0x9c6b42, cabeca: 0xb07c50, esc: .9,  chifre: .45, cauda: .25, vel: 2.0, casa: [-48, 26], raio: 15 },
  { id: 'veado3',  corpo: 0xb27f52, cabeca: 0xc28f60, esc: .95, chifre: .48, cauda: .25, vel: 1.9, casa: [-20, 52], raio: 14 },
  { id: 'javali',  corpo: 0x4f4034, esc: .8, pescoco: .02, cauda: .2, vel: 1.6, casa: [-44, -18], raio: 13 },
  { id: 'javali2', corpo: 0x5a4a3c, esc: .7, pescoco: .02, cauda: .2, vel: 1.5, casa: [40, -22], raio: 13 },
  { id: 'cabra1',  corpo: 0xe8e4dc, cabeca: 0xd9d4ca, esc: .8, chifre: .3, cauda: .18, vel: 1.4, casa: [-16, -40], raio: 10 },
  { id: 'cabra2',  corpo: 0xdcd6cc, cabeca: 0xcac4ba, esc: .75, chifre: .28, cauda: .18, vel: 1.3, casa: [8, -38], raio: 9 },
  { id: 'capivara',corpo: 0x8a6240, esc: .85, pescoco: .05, cauda: 0, vel: 1.0, casa: [34, 34], raio: 7 },
  { id: 'capivara2',corpo: 0x7d5838, esc: .75, pescoco: .05, cauda: 0, vel: .9, casa: [44, 18], raio: 7 },
  { id: 'tartaruga',corpo: 0x4e7c59, cabeca: 0x6f9a6a, esc: .6, pescoco: .05, vel: .35, casa: [-8, 70], raio: 5 },
  { id: 'tartaruga2',corpo: 0x44704e, cabeca: 0x659060, esc: .55, pescoco: .05, vel: .3, casa: [64, -30], raio: 5 },
  // O PREDADOR. 'casa' e so o ponto de partida: no frame() ele e puxado pra perto da
  // clareira quando a fogueira nao acende, e empurrado pra mata quando acende.
  { id: 'onca', tipo: 'onca', semente: 7, esc: 1.1, vel: 2.4, casa: [-40, 40], raio: 13, predador: true },
  // bichos novos (vida.js). 'casa' em unidades antigas, como os de cima.
  { id: 'onca2',    tipo: 'onca', semente: 31, esc: 1.0, vel: 2.0, casa: [-58, -8], raio: 12 },      // a segunda so perambula no fundo da mata
  { id: 'tamandua', tipo: 'tamandua', esc: 1.1, vel: .9, casa: [22, 50], raio: 12 },
  { id: 'anta',     tipo: 'anta', esc: 1.2, vel: 1.1, casa: [24, 38], raio: 9 },
  { id: 'tatu1',    tipo: 'tatu', vel: .8, casa: [-10, 44], raio: 8 },
  { id: 'tatu2',    tipo: 'tatu', vel: .8, casa: [46, -8], raio: 8 },
  { id: 'jacare',   tipo: 'jacare', esc: 1.3, vel: .45, casa: [41.8, 35.8], raio: 3 },                // na beira do lago
  { id: 'garca1',   tipo: 'garca', vel: .35, casa: [23.5, 22], raio: 2 },                            // lago
  { id: 'garca2',   tipo: 'garca', vel: .35, casa: [5.5, -40], raio: 1.5 },                          // poco da cachoeira
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
export function buildArmadilha() {
  const g = new THREE.Group();
  const cx = box(1.1, .75, 1.1, 0x8b5a2b, 0, .35, 0);            // caixote escorado
  cx.rotation.z = -.42; cx.rotation.y = .3; g.add(cx);
  g.add(cyl(.045, .055, .8, C.wood, .52, 0, .1, 5));              // graveto que escora
  for (let i = 0; i < 5; i++) g.add(sphere(.07, 0xd9a441, -.35 + i * .16, .05, .45));   // isca
  g.add(box(.9, .03, .06, C.wood, -.1, .0, -.7));
  return g;
}
export function buildPalicada() {
  const g = new THREE.Group();
  for (let i = 0; i < 17; i++) {                                   // estacas apontadas
    const a = -1.15 + i * .145, r = 5.4;
    const e = cyl(.0, .15, 1.9, 0x7c4a1e, Math.cos(a) * r, 0, Math.sin(a) * r, 6);
    e.rotation.z = Math.sin(a) * .09; e.rotation.x = -Math.cos(a) * .09; g.add(e);
  }
  for (const h of [.55, 1.25]) for (let i = 0; i < 16; i++) {      // travessas
    const a = -1.15 + i * .145 + .072, r = 5.4;
    const tr = box(.9, .09, .07, C.wood, Math.cos(a) * r, h, Math.sin(a) * r);
    tr.rotation.y = -a; g.add(tr);
  }
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

// ===========================================================================
// TERRENO
// A ilha deixou de ser uma pilha de cilindros: agora e uma malha gerada por uma
// funcao de altura, com costa irregular, colinas e serra. A vila do Bob fica num
// planalto chapado em y = .55, entao todas as coordenadas antigas continuam
// valendo e as obras assentam certo.
// ===========================================================================
function ruidoSuave(x, z) {
  return Math.sin(x * .085 + Math.cos(z * .062) * 2.1) * Math.cos(z * .073 + Math.sin(x * .049) * 1.7)
       + Math.sin(x * .031 + 1.7) * Math.cos(z * .028 - .8) * .8;
}
// Raio da costa por angulo: e isso que tira a cara de disco.
function costaEm(a, R, s) {
  return R * (1 + Math.sin(a * 2 + s) * .14 + Math.sin(a * 3.3 + s * 2.1) * .085
                + Math.sin(a * 5.1 + s * .7) * .05 + Math.sin(a * 7.7 + s * 3.3) * .028);
}
// Serra: tres cumes ao norte, dentro do proprio relevo (a serra antiga, escalada).
const CUMES = [[-10, -54, 30, 25], [14, -48, 24, 19], [-34, -40, 20, 14]].map(([x, z, r, h]) => [x * K, z * K, r * K, h * 1.3]);
const LAGO = [34 * K, 26 * K], LAGO_R = 11 * K;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// CHAPADA: ao norte, entre a vila e a serra, o chao sobe de uma vez num paredao de 15.
// O rio que nasce na serra corre por cima dela e despenca no POCO -- a cachoeira.
// Nas pontas o paredao some aos poucos, entao da pra subir a chapada pelos lados.
const CHAPADA = { r: 74, a: -Math.PI / 2, meia: .5, fade: .24, alt: 15 };
const POCO = { x: 0, z: -64.5, r: 7 };
const RIO = [[-7, -86], [0, -74.8]];            // olho d'agua na serra -> beira do paredao
function fatorChapada(x, z) {
  let da = Math.atan2(z, x) - CHAPADA.a; da = Math.atan2(Math.sin(da), Math.cos(da));
  return (1 - suave(CHAPADA.meia, CHAPADA.meia + CHAPADA.fade, Math.abs(da))) * suave(CHAPADA.r - 1.1, CHAPADA.r + 1.1, Math.hypot(x, z));
}
function distSegmento(x, z, [ax, az], [bx, bz]) {
  const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return [Math.hypot(x - ax - vx * t, z - az - vz * t), t];
}
function alturaBruta(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  const costa = costaEm(a, R_ILHA, 0);
  if (r >= costa) return -.9 - (r - costa) * .09;          // vai pro fundo do mar
  const dentro = Math.min(1, (costa - r) / 10);             // 0 na beira, 1 depois da areia
  // o ruido anda em x/K: o mesmo desenho de morros da ilha antiga, so que maior
  let h = dentro * dentro * 2.4 + (ruidoSuave(x / K, z / K) + 1.4) * 1.5 * dentro;
  for (const [cx, cz, raio, alt] of CUMES) {
    const d = Math.hypot(x - cx, z - cz);
    if (d < raio) h += Math.pow(1 - d / raio, 2.2) * alt;
  }
  h += CHAPADA.alt * fatorChapada(x, z) * Math.min(1, dentro * 1.6);
  const dl = Math.hypot(x - LAGO[0], z - LAGO[1]);          // bacia do lago
  if (dl < LAGO_R + 6) h -= Math.pow(Math.max(0, 1 - dl / (LAGO_R + 6)), 1.6) * (h + 3.2);
  // planalto da vila: chapado, com transicao suave ate o relevo
  if (r < R_VILA + 20) {
    const k = Math.min(1, Math.max(0, (r - R_VILA) / 20));
    h = .55 * (1 - k * k) + h * (k * k);
  }
  return h;
}
// superficie do poco: um pouco abaixo da borda do lado da vila (calculada uma vez)
let _nivelPoco = null;
const nivelPoco = () => _nivelPoco ?? (_nivelPoco = alturaBruta(POCO.x, POCO.z + POCO.r) - .45);
function alturaIlha(x, z) {
  let h = alturaBruta(x, z);
  // canal do rio em cima da chapada (raso, so pra agua ter onde correr)
  if (fatorChapada(x, z) > .3) {
    const [d] = distSegmento(x, z, RIO[0], RIO[1]);
    if (d < 3.4) h -= 1.1 * (1 - suave(1.5, 3.4, d));
  }
  // poco da cachoeira, cavado no pe do paredao
  const dp = Math.hypot(x - POCO.x, z - POCO.z);
  if (dp < POCO.r + 3) {
    const fundo = nivelPoco() - .5 - 1.5 * (1 - Math.min(1, dp / POCO.r));
    h = fundo + (Math.max(h, fundo) - fundo) * suave(POCO.r, POCO.r + 3, dp);
  }
  return h;
}
// MATA FECHADA: a oeste, floresta densa e escura -- arvores altas, sub-bosque, macacos.
// O contorno sai de um ruido, pra nao virar uma fatia de pizza.
const MATA_FECHADA = { a: 3.2, meia: .62, fade: .3 };
function fatorMataFechada(x, z) {
  let da = Math.atan2(z, x) - MATA_FECHADA.a; da = Math.atan2(Math.sin(da), Math.cos(da));
  const ang = 1 - suave(MATA_FECHADA.meia, MATA_FECHADA.meia + MATA_FECHADA.fade, Math.abs(da));
  const contorno = suave(-.35, .25, ruidoSuave(x * .9 / K + 40, z * .9 / K));
  return ang * suave(R_VILA + 22, R_VILA + 36, Math.hypot(x, z)) * (.35 + .65 * contorno);
}
// Ponto na beira d'agua numa direcao: vem do mar pra terra ate o chao passar de 'alvo'.
// Avião, píer e farol usam isso -- com coordenada escrita a mao eles ficaram enterrados
// da ultima vez que o terreno mudou.
function naBeira(a, alvo = .35) {
  for (let r = costaEm(a, R_ILHA, 0) + 4; r > 10; r -= .2) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (alturaIlha(x, z) >= alvo) return [x, z];
  }
  return [0, 0];
}

function corDoTerreno(alt, dentro, inclin = 0) {
  const c = new THREE.Color();
  if (dentro < .30) return c.setHex(0xe3d5a2);                       // areia
  if (inclin > 1.1) return c.setHex(0x8a7e72).lerp(new THREE.Color(0x6f675f), Math.min(1, (inclin - 1.1) / 1.5));   // paredao: rocha
  if (dentro < .42) return c.setHex(0xe3d5a2).lerp(new THREE.Color(0x63b263), (dentro - .30) / .12);
  // faixas pensadas pra ilha maior: a chapada (topo ~30) e verde; so os cumes tem neve
  if (alt > 46) return c.setHex(0xf2f6fb);                           // neve
  if (alt > 38) return c.setHex(0x8b8f99).lerp(new THREE.Color(0xf2f6fb), (alt - 38) / 8);
  if (alt > 30) return c.setHex(0x4e8a4e).lerp(new THREE.Color(0x8b8f99), (alt - 30) / 8);
  return c.setHex(0x63b263).lerp(new THREE.Color(0x4e8a4e), Math.min(1, alt / 22));
}

// Malha em grade polar: aneis x setores. Devolve um Mesh com cor por vertice.
function malhaTerreno(R, semente, fAlt, nseg = 128, nring = 56) {
  const pos = [], cor = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= nring; i++) {
    for (let j = 0; j < nseg; j++) {
      const a = j / nseg * Math.PI * 2;
      const borda = costaEm(a, R, semente) * 1.18;
      const r = borda * (i / nring);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = fAlt(x, z);
      const dentro = Math.min(1, Math.max(0, (costaEm(a, R, semente) - r) / 7.5));
      pos.push(x, y, z);
      const inclin = Math.hypot(fAlt(x + .6, z) - fAlt(x - .6, z), fAlt(x, z + .6) - fAlt(x, z - .6)) / 1.2;
      const k = corDoTerreno(y, dentro, inclin); cor.push(k.r, k.g, k.b);
    }
  }
  for (let i = 0; i < nring; i++) for (let j = 0; j < nseg; j++) {
    const j2 = (j + 1) % nseg;
    const p = i * nseg, q = (i + 1) * nseg;
    // sentido invertido de proposito: com a ordem 'natural' da grade polar as normais
    // apontam pra baixo e o terreno some (o material descarta faces de costas)
    idx.push(p + j, q + j2, q + j, p + j, p + j2, q + j2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Ilha vizinha de verdade: mesmo gerador, menor, com o proprio relevo e mata.
function ilhaVizinhaGrande(i) {
  const g = new THREE.Group();
  const R = 20 + (i % 3) * 5, s = i * 1.7 + .4;
  const alt = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x), costa = costaEm(a, R, s);
    if (r >= costa) return -.9 - (r - costa) * .09;
    const dentro = Math.min(1, (costa - r) / 6.5);
    return dentro * dentro * 2.2 + (ruidoSuave(x * 1.7 + i * 40, z * 1.7) + 1.4) * (1.6 + (i % 2) * 2.4) * dentro;
  };
  g.add(malhaTerreno(R, s, alt, 72, 30));
  const arv = [];
  for (let k = 0; k < 70; k++) {
    const a = Math.random() * 6.28, r = Math.random() * R * .82;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alt(x, z);
    if (y > 1.1) arv.push([x, y - .2, z, .7 + Math.random() * .6, Math.random() * 6.28]);
  }
  if (arv.length) g.add(florestaDensa(arv));
  for (let k = 0; k < 5; k++) {
    const a = Math.random() * 6.28, r = R * (.72 + Math.random() * .2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alt(x, z);
    if (y > .2) { const p = palm(x, z, Math.random() * 6.28); p.position.y = y - .1; g.add(p); }
  }
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // tira o 'lavado' das cores chapadas
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 1600);
  // BRILHO (bloom): fogueira, postes, farol, janelas e vagalumes brilham de noite. De dia
  // fica quase desligado. No modo 'leve' nem existe -- sao varias passadas a mais na GPU.
  let composer = null, bloom = null;
  if (QUALIDADE !== 'leve') {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .1, .55, .82); composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  camera.position.set(52 * EV, 38 * EV, 60 * EV);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.maxPolarAngle = 1.44;              // ~82 graus: vista de quem esta na ilha, sem raspar
  controls.minDistance = 7; controls.maxDistance = 470;
  controls.enablePan = true;
  controls.screenSpacePanning = false;        // o pan corre pelo chao: parece avancar, nao flutuar
  controls.panSpeed = 1.3; controls.rotateSpeed = .75; controls.zoomSpeed = .9;
  controls.zoomToCursor = true;               // a pinca aproxima do que voce esta olhando
  // 1 dedo = so gira em volta da ilha. 2 dedos = avanca na direcao arrastada
  // (e pinca pra aproximar/afastar). No PC: botao esquerdo gira, direito avanca.
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.autoRotate = true; controls.autoRotateSpeed = .35;

  // ----- toque duplo recentra na vila -----
  // CUIDADO: dois dedos disparam dois 'pointerup' quase juntos. A versao antiga lia isso
  // como toque duplo, entao TODO gesto de 2 dedos resetava a camera. Agora so conta como
  // toque quando foi um dedo so, curto e sem arrastar.
  let idle, dedos = 0, houveMulti = false, tIni = 0, xIni = 0, yIni = 0, ultimoTap = 0;
  canvas.addEventListener('pointerdown', e => {
    mexeu = true;
    dedos++;
    if (dedos > 1) houveMulti = true;
    if (dedos === 1) { tIni = performance.now(); xIni = e.clientX; yIni = e.clientY; }
    controls.autoRotate = false; clearTimeout(idle);   // assumiu a camera, ela e sua
  });
  canvas.addEventListener('pointercancel', () => { dedos = 0; houveMulti = false; });
  canvas.addEventListener('pointerup', e => {
    dedos = Math.max(0, dedos - 1);
    if (dedos > 0) return;                                   // ainda tem dedo na tela
    const curto = performance.now() - tIni < 250;
    const parado = Math.hypot(e.clientX - xIni, e.clientY - yIni) < 12;
    const foiTap = !houveMulti && curto && parado;
    houveMulti = false;
    if (!foiTap) { ultimoTap = 0; return; }
    const agora = performance.now();
    if (agora - ultimoTap < 320) { controls.target.set(0, 1, 0); enquadrar(); ultimoTap = 0; }
    else ultimoTap = agora;
  });

  // Cupula de ceu: gradiente do horizonte ao zenite. Fica atras de tudo (renderOrder -1,
  // sem escrever profundidade), entao sol, lua e estrelas continuam aparecendo por cima.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zenite: { value: new THREE.Color(0x2f6fb5) }, horizonte: { value: new THREE.Color(0x9fd0f5) }, uLinear: { value: 0 } },
    vertexShader: 'varying float alt; void main(){ alt = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // uLinear = 1 quando ha pos-processamento: ai a saida ainda vai ser convertida pra sRGB,
    // entao o ceu entrega a cor ja linearizada (senao a noite fica cinza-claro la no alto)
    fragmentShader: 'uniform vec3 zenite; uniform vec3 horizonte; uniform float uLinear; varying float alt;' +
      'void main(){ vec3 c = mix(horizonte, zenite, smoothstep(-0.08, 0.62, alt)); if (uLinear > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.0); }',
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 18), skyMat);
  skyDome.renderOrder = -1; skyDome.frustumCulled = false; scene.add(skyDome);
  skyMat.uniforms.uLinear.value = composer ? 1 : 0;

  // Nuvens fofas: bolhas lisas fundidas numa geometria so por nuvem (um desenho cada).
  // As antigas eram icosaedros facetados cinza e, de longe, pareciam pedra voando.
  const nuvens = new THREE.Group(); scene.add(nuvens);
  const matNuvem = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x6b7c90, emissiveIntensity: .28, transparent: true, opacity: .96 });
  for (let i = 0; i < Math.round(18 * DENS + 4); i++) {
    const partes = [], larg = 9 + Math.random() * 10, base = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < base; k++) {                                  // fileira de baixo, larga e achatada
      const gg = new THREE.IcosahedronGeometry(3 + Math.random() * 1.8, 2);
      gg.scale(1, .62, .9); gg.translate(-larg / 2 + k * larg / (base - 1), 0, (Math.random() - .5) * 3); partes.push(gg);
    }
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {     // tufos por cima
      const gg = new THREE.IcosahedronGeometry(2.4 + Math.random() * 2, 2);
      gg.scale(1, .8, .9); gg.translate((Math.random() - .5) * larg * .6, 1.6 + Math.random() * 1.2, (Math.random() - .5) * 2); partes.push(gg);
    }
    const n = new THREE.Mesh(mergeGeometries(partes), matNuvem);
    // acima da camera: enquadrando a ilha inteira ela chega a ~70 de altura, e nuvem a
    // essa altura passava na frente da tela
    n.userData = { r: (62 + Math.random() * 110) * K, a: Math.random() * 6.28, y: 112 + Math.random() * 40, v: .004 + Math.random() * .008 };
    n.scale.setScalar(1.5);
    nuvens.add(n);
  }

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3a5a2a, .6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06;   // ilha grande = texel grande = acne de sombra
  // A sombra acompanha pra onde a camera olha: cobrir a ilha inteira (maior agora) com
  // um shadow map so deixaria cada texel enorme e a sombra borrada/listrada.
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 520 }); scene.add(sun); scene.add(sun.target);
  const moon = new THREE.DirectionalLight(0x9db4ff, 0); scene.add(moon);
  const sunMesh = sphere(5, 0xffe27a, 0, 0, 0, { emissive: 0xffd24d, emissiveIntensity: 1.5, fog: false }); sunMesh.castShadow = false; sunMesh.receiveShadow = false; scene.add(sunMesh);
  const moonMesh = sphere(3.4, 0xdfe7ff, 0, 0, 0, { emissive: 0xaebcff, emissiveIntensity: .9, fog: false }); moonMesh.castShadow = false; moonMesh.receiveShadow = false; scene.add(moonMesh);
  // estrelas
  const sg = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 500; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < .05) continue; sp.push(v.x * 560, v.y * 560, v.z * 560); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0 })); scene.add(stars);

  // (o mar e criado depois do arquipelago: a agua rasa precisa saber onde ficam as ilhas)
  const aguasCorrentes = [];

  // A ilha e uma malha gerada (ver alturaIlha): costa irregular, colinas, serra e
  // um planalto chapado no miolo onde fica a vila do Bob.
  const island = new THREE.Group(); scene.add(island);
  island.add(malhaTerreno(R_ILHA, 0, alturaIlha, 230, 104));

  // LAGO, assentado na bacia que a funcao de altura cavou
  const lago = new THREE.Mesh(new THREE.CylinderGeometry(LAGO_R, LAGO_R * .88, .4, 28), materialLago());
  lago.position.set(LAGO[0], .55, LAGO[1]); lago.receiveShadow = true; island.add(lago);

  // POCO + RIO + CACHOEIRA
  let nevoa = null;
  const poco = new THREE.Mesh(new THREE.CircleGeometry(POCO.r + .6, 28), materialLago(0x39a8d6));
  poco.rotation.x = -Math.PI / 2; poco.position.set(POCO.x, nivelPoco(), POCO.z); poco.name = 'poco'; island.add(poco);
  {
    // fita de agua seguindo o canal, do olho d'agua ate a beira
    const n = 24, pts = [], uvs = [], idx = [];
    const [a, b] = RIO, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), px = -dz / L, pz = dx / L;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a[0] + dx * t, z = a[1] + dz * t, y = alturaIlha(x, z) + .5, w = 1.5 + t * .5;
      pts.push(x - px * w, y, z - pz * w, x + px * w, y, z + pz * w); uvs.push(0, t * L / 5, 1, t * L / 5);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.setIndex(idx); rg.computeVertexNormals();
    const rio = new THREE.Mesh(rg, materialRio()); rio.name = 'rio'; island.add(rio); aguasCorrentes.push(rio.material);
    // a queda: da beira do paredao ate o poco, alargando embaixo
    const topo = alturaIlha(b[0], b[1]) + .5, pe = nivelPoco(), q = [], qu = [], qi = [], m = 16;
    for (let i = 0; i <= m; i++) {
      // arco de agua de verdade: sai da beirada e vai se afastando (distancia ~ raiz da
      // queda). Colada no paredao ela sumia atras da rocha antes de chegar no poco.
      const t = i / m, y = topo + (pe - topo) * t, z = b[1] + .3 + 3.6 * Math.sqrt(t), w = 2.0 + t * 1.6;
      q.push(b[0] - w, y, z, b[0] + w, y, z); qu.push(0, t * (topo - pe) / 7, 1, t * (topo - pe) / 7);
      if (i < m) { const k = i * 2; qi.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const qg = new THREE.BufferGeometry(); qg.setAttribute('position', new THREE.Float32BufferAttribute(q, 3)); qg.setAttribute('uv', new THREE.Float32BufferAttribute(qu, 2)); qg.setIndex(qi); qg.computeVertexNormals();
    const queda = new THREE.Mesh(qg, materialCachoeira()); queda.name = 'cachoeira'; island.add(queda); aguasCorrentes.push(queda.material);
    nevoa = criarNevoa(b[0], pe, b[1] + 4.0, 3.2); island.add(nevoa);
  }

  // PEDRAS espalhadas pela costa, assentadas no relevo
  // (instanciadas: cada pedra solta era uma chamada de desenho)
  const pedras = [];
  for (let i = 0; i < 110; i++) {
    const a = Math.random() * 6.28, r = costaEm(a, R_ILHA, 0) * (.95 + Math.random() * .09);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    pedras.push([x, alturaIlha(x, z) + .1, z, .35 + Math.random() * .9]);
  }
  // COQUEIROS na faixa de areia
  const coqueiros = [];
  for (let i = 0; i < 110 * DENS; i++) {
    const a = Math.random() * 6.28, r = costaEm(a, R_ILHA, 0) * (.9 + Math.random() * .06);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alturaIlha(x, z);
    if (y < .1 || y > 4) continue;
    coqueiros.push({ x, y: y - .1, z, rot: a + Math.PI + (Math.random() - .5) * 1.2, incl: .1 + Math.random() * .2 });   // inclina pro mar
  }
  island.add(criarCoqueiros(coqueiros));

  // MATA: acompanha o relevo, evita praia, serra alta, lago e a clareira da vila
  const arvores = [], copasMata = [];
  const escolheTipo = (y, mf) => {
    const r = Math.random();
    if (y > 26) return r < .75 ? 'pinheiro' : 'folhosa';                       // chapada e encosta: mais pinheiro
    if (mf > .5) return r < .35 ? 'emergente' : r < .97 ? 'folhosa' : 'ipe';  // mata fechada
    return r < .46 ? 'folhosa' : r < .88 ? 'pinheiro' : r < .95 ? 'ipe' : 'emergente';
  };
  const ESC = { pinheiro: [.75, .8], folhosa: [.8, .6], emergente: [1.0, .45], ipe: [.8, .4] };
  const planta = (x, y, z, tipo, mf) => {
    const [e0, de] = ESC[tipo], e = e0 + Math.random() * de;
    const a = { tipo, x, y: y - .25, z, e, rot: Math.random() * 6.28 };
    if (mf > .5 && tipo === 'folhosa') a.cor = CORES.emergente[arvores.length % 4];   // mata fechada e mais escura
    arvores.push(a);
    if (mf > .5 && (tipo === 'folhosa' || tipo === 'emergente')) copasMata.push([x, a.y + TOPO_COPA[tipo] * e, z]);
  };
  const lugarDeArvore = (x, z, y) => !(y < 1.0 || y > 40
    || Math.hypot(x - LAGO[0], z - LAGO[1]) < LAGO_R + 4
    || Math.hypot(x - POCO.x, z - POCO.z) < POCO.r + 3 || distSegmento(x, z, RIO[0], RIO[1])[0] < 3.5
    || Math.hypot(alturaIlha(x + .8, z) - alturaIlha(x - .8, z), alturaIlha(x, z + .8) - alturaIlha(x, z - .8)) > 2.2);   // nada pendurado no paredao
  for (let k = 0; k < 3000 * DENS; k++) {
    const a = Math.random() * 6.28, r = R_VILA + 16 + Math.random() * (R_ILHA * 1.25 - R_VILA - 16);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alturaIlha(x, z);
    if (!lugarDeArvore(x, z, y)) continue;
    const mf = fatorMataFechada(x, z);
    if (mf < .5 && Math.random() < .2) continue;                                // mata comum um pouco mais aberta
    planta(x, y, z, escolheTipo(y, mf), mf);
  }
  // MATA FECHADA: mais arvore e sub-bosque (arbusto) no trecho oeste
  for (let k = 0; k < 2400 * DENS; k++) {
    const a = MATA_FECHADA.a + (Math.random() - .5) * 2 * (MATA_FECHADA.meia + .1), r = R_VILA + 30 + Math.random() * (R_ILHA * 1.2 - R_VILA - 30);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alturaIlha(x, z), mf = fatorMataFechada(x, z);
    if (mf < .55 || !lugarDeArvore(x, z, y)) continue;
    if (Math.random() < .45) arvores.push({ tipo: 'arbusto', x, y: y - .1, z, e: .7 + Math.random() * .7, rot: Math.random() * 6.28 });
    else planta(x, y, z, escolheTipo(y, mf), mf);
  }

  // BORDA DA MATA: arvores soltas e arbustos entre a clareira e a mata fechada,
  // pra nao existir uma linha reta separando vila de floresta.
  const borda = [];
  for (let k = 0; k < 260; k++) {
    const a = Math.random() * 6.28;
    const d = Math.pow(Math.random(), .65);                 // adensa perto da mata
    const r = R_VILA + 3 + d * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = alturaIlha(x, z);
    const t = Math.random();
    borda.push({ tipo: t < .5 ? 'folhosa' : t < .9 ? 'pinheiro' : 'ipe', x, y: y - .2, z, e: .5 + Math.random() * .55, rot: Math.random() * 6.28 });
  }
  const arvoresDaBorda = borda;
  for (let k = 0; k < 110; k++) {
    const a = Math.random() * 6.28, r = R_VILA + 2 + Math.random() * 18;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    borda.push({ tipo: 'arbusto', x, y: alturaIlha(x, z) - .05, z, e: .45 + Math.random() * .5, rot: Math.random() * 6.28 });
  }
  island.add(criarArvores([...arvores, ...borda]));
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * 6.28, r = R_VILA + 4 + Math.random() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    pedras.push([x, alturaIlha(x, z) + .12, z, .3 + Math.random() * .55]);
  }
  {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), pedras.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    pedras.forEach(([x, y, z, r], i) => { e.set(Math.random() * 3, Math.random() * 3, 0); m.setMatrixAt(i, M.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e), new THREE.Vector3(r, r * (.7 + Math.random() * .3), r))); m.setColorAt(i, c.setHex(C.rock).offsetHSL(0, 0, Math.random() * .08 - .04)); });
    m.castShadow = true; m.receiveShadow = true; island.add(m);
  }
  // VAGALUMES: beira da mata em volta da vila e trecho da mata fechada
  const pontosVagalume = [];
  for (let i = 0; i < 220 * DENS; i++) {
    const naMata = i % 3 === 0, a = naMata ? MATA_FECHADA.a + (Math.random() - .5) * 1.1 : Math.random() * 6.28;
    const r = naMata ? R_VILA + 34 + Math.random() * 50 : R_VILA + 2 + Math.random() * 26, x = Math.cos(a) * r, z = Math.sin(a) * r;
    pontosVagalume.push([x, Math.max(.4, alturaIlha(x, z)) + .5 + Math.random() * 2.2, z]);
  }
  const vagalumes = criarVagalumes(pontosVagalume); island.add(vagalumes.pontos);
  // MACACOS: pulam de copa em copa na mata fechada
  const macacos = criarMacacos(copasMata, Math.round(9 * DENS)); island.add(macacos.grupo);

  // BICHOS — cada um anda so na sua regiao, longe do centro urbano do Bob
  const fauna = [];
  for (const cfg of FAUNA) {
    const c = { ...cfg, casa: [cfg.casa[0] * K, cfg.casa[1] * K], raio: cfg.raio * K };
    const g = c.tipo ? CONSTRUTORES[c.tipo](c) : bicho(c);
    if (c.tipo && c.esc) g.scale.setScalar(c.esc);
    fundirEstatico(g);
    g.position.set(c.casa[0], alturaIlha(c.casa[0], c.casa[1]), c.casa[1]); island.add(g);
    fauna.push({ g, cfg: c, x: c.casa[0], z: c.casa[1], tx: c.casa[0], tz: c.casa[1], wait: Math.random() * 6, rabo: g.getObjectByName('rabo') });
  }
  // CARANGUEJOS na areia (andam de lado de proposito) -- perambulam perto de casa, na praia
  for (let i = 0; i < 12 * DENS; i++) {
    const a = Math.random() * 6.28, [x, z] = naBeira(a, .25), g = fundirEstatico(CONSTRUTORES.caranguejo()); g.scale.setScalar(1.3);
    g.position.set(x, alturaIlha(x, z), z); island.add(g);
    fauna.push({ g, cfg: { casa: [x, z], raio: 2.5, vel: .7, caranguejo: true }, x, z, tx: x, tz: z, wait: Math.random() * 4 });
  }
  // ARARAS voando em bando sobre a mata fechada
  const araras = criarAraras([Math.cos(MATA_FECHADA.a) * 95, Math.sin(MATA_FECHADA.a) * 95], 38); scene.add(araras.grupo);
  // MAR: cardumes na agua rasa (da pra ver pela agua translucida), peixe pulando, baleias ao largo
  const pontosRasos = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + Math.random() * .2, r = costaEm(a, R_ILHA, 0) + 7 + Math.random() * 6; pontosRasos.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const marinha = criarVidaMarinha(pontosRasos, R_ILHA, QUALIDADE === 'leve' ? 2 : 3); scene.add(marinha.grupo);
  // NAVIOS passando bem longe, quase na borda do mar
  const navios = criarNavios(480); scene.add(navios.grupo);
  // PESCA: o Bob desce pra beira do lago no fim da tarde pra pescar o jantar
  const PESCA = [LAGO[0] - (LAGO[0] / Math.hypot(...LAGO)) * (LAGO_R + 1.2), LAGO[1] - (LAGO[1] / Math.hypot(...LAGO)) * (LAGO_R + 1.2)];
  const vara = new THREE.Group(); {
    // cabo na mao (origem do grupo), ponta la na frente e no alto; a linha desce da ponta
    const cana = cyl(.02, .035, 2.4, 0x8b5a2b); cana.position.set(0, .75, .94); cana.rotation.x = .9; vara.add(cana);
    const linha = cyl(.006, .006, 2.2, 0xeeeeee); linha.position.set(0, .4, 1.88); vara.add(linha);
    vara.visible = false; island.add(vara);
  }
  const fisgado = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 5).rotateX(Math.PI / 2), mat(0xc0c8d0, { metalness: .3, roughness: .4 })); fisgado.visible = false; island.add(fisgado);
  let pesca = { t: 99, prox: 4 };

  // A floresta e a pedreira DE TRABALHO ficam perto da vila (Bob vai la todo dia)
  // trilhas de terra batida: so pros dois lugares onde o Bob realmente vai
  for (const [x, z] of [[7.0 * EV, -4.6 * EV], [-8.2 * EV, 1.2 * EV]]) {
    const len = Math.hypot(x, z) - 1.6 * EV, a = Math.atan2(z, x);
    const tr = box(1.7, .02, len, 0x7fb56a, Math.cos(a) * (len / 2 + 1.4 * EV), .55, Math.sin(a) * (len / 2 + 1.4 * EV));
    tr.rotation.y = -a + Math.PI / 2; tr.receiveShadow = true; tr.castShadow = false; island.add(tr);
  }

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
  // Destrocos na praia nordeste. O y vem do terreno: com y fixo o aviao ficou 5 m
  // enterrado quando a ilha virou malha gerada (antes o mapa era um disco chapado).
  const AVIAO = naBeira(-.735);
  const aviao = fundirEstatico(buildAviao()); aviao.scale.setScalar(1.6); aviao.position.set(AVIAO[0], alturaIlha(AVIAO[0], AVIAO[1]) - .2, AVIAO[1]); aviao.rotation.y = -.7; island.add(aviao);
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
  // Tamanho de cada coisa que o put() assenta. Construcao cresce EV (casa do tamanho de
  // gente); pessoa e bicho ficam como estao; fogueira e pilha do deposito crescem menos.
  // [largura, altura]: radio e moinho ganham altura extra (pedido do Kevin).
  const ESCALA_SLOT = { obra_fogueira: [1.4, 1.4], obra_armadilha: [1.4, 1.4], deposito_pilha: [1.4, 1.4], rede: [1.3, 1.3],
    obra_radio: [EV, EV * 1.7], obra_moinho: [EV, EV * 1.35], personagem: [1, 1] };
  const escalaDe = n => n.startsWith('hab_') || n.startsWith('vila_') ? [1, 1] : (ESCALA_SLOT[n] || [EV, EV]);
  function put(name, obj, x, z, rotY = 0) {
    if (slots[name]) { island.remove(slots[name]); slots[name].traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    if (!obj) { delete slots[name]; return; }
    // pecas paradas viram uma malha so (menos gente: personagem animado nao se funde)
    if (name !== 'personagem' && !name.startsWith('hab_') && !name.startsWith('vila_')) fundirEstatico(obj);
    const [e, ey] = escalaDe(name); obj.scale.multiply(new THREE.Vector3(e, ey, e)); obj.userData.esc = obj.scale.clone();
    // y do terreno: dentro do planalto da vila alturaIlha devolve .55 exato, entao a vila
    // nao se mexe. Com y fixo, lote fora do planalto (pier, farol) ficava enterrado.
    obj.position.set(x, alturaIlha(x, z), z); obj.rotation.y = rotY; island.add(obj); slots[name] = obj;
  }
  // Grade de rotas da vila (ver rotas.js). Refeita so quando muda o que esta de pe.
  const grade = criarGrade(R_VILA + 24, .6);
  let assinaturaGrade = '';
  function refazGrade() {
    const nomes = Object.keys(slots).filter(n => n !== 'personagem' && !n.startsWith('hab_') && !n.startsWith('vila_')).sort();
    const sig = nomes.join('|'); if (sig === assinaturaGrade) return; assinaturaGrade = sig;
    grade.limpar();
    const bb = new THREE.Box3();
    const marca = () => {
      const chao = alturaIlha((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2);
      if (bb.min.y > chao + 1.7) return;                     // bandeirinha, telhado alto: passa por baixo
      if (bb.max.y < chao + .12) return;                     // tapete, trilha: pisa em cima
      grade.marcarCaixa(bb.min.x - .35, bb.min.z - .35, bb.max.x + .35, bb.max.z + .35);
    };
    for (const n of nomes) {
      const g = slots[n]; g.updateMatrixWorld(true);
      // a malha fundida vira uma caixa so, enorme (a palicada inteira, a praca inteira):
      // pra rota valem as caixas das pecas originais, guardadas na fusao
      for (const c of g.userData.caixas || []) { bb.copy(c).applyMatrix4(g.matrixWorld); marca(); }
      g.traverse(o => { if (!o.isMesh || o.userData.fundido) return; bb.setFromObject(o); marca(); });
    }
    for (const a of arvoresDaBorda) if (a.tipo !== 'arbusto') grade.marcarCirculo(a.x, a.z, .55);
  }
  // desbloqueaveis (posicoes fixas)
  // o farol saiu daqui: virou obra (ver OBRA_LOTE)
  const unlock = { vizinha: ilhaVizinha(), ponte: ponte(90), navio: navio(), montanha: montanha() };
  // A leste a costa fica exatamente em R_ILHA (todos os senos de costaEm zeram em a = 0).
  unlock.ponte.position.set(R_ILHA + 4, 0, 6);
  unlock.vizinha.position.set(R_ILHA + 4 + 90 * .55 + 3, 0, 12);
  { const a = .54, r = costaEm(a, R_ILHA, 0) + 34; unlock.navio.position.set(Math.cos(a) * r, -.3, Math.sin(a) * r); }
  { const a = -1.63, r = costaEm(a, R_ILHA, 0) + 110; unlock.montanha.position.set(Math.cos(a) * r, -.5, Math.sin(a) * r); unlock.montanha.scale.setScalar(K * 1.5); }
  for (const k in unlock) { fundirEstatico(unlock[k], { materialProprio: true }); scene.add(unlock[k]); }
  const extras = new THREE.Group(); scene.add(extras);
  const arquipelago = []; // 8 ilhas naturais, sempre visiveis
  for (let i = 0; i < 8; i++) { const g = fundirEstatico(ilhaVizinhaGrande(i)); const a = .55 + i * .79, r = costaEm(a, R_ILHA, 0) + 62 + (i % 3) * 30; g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.y = -a; scene.add(g); arquipelago.push(g); }
  const mar = criarMar(R_ILHA, [...arquipelago.map((g, i) => [g.position.x, g.position.z, (20 + (i % 3) * 5) * 1.05]), [unlock.vizinha.position.x, unlock.vizinha.position.z, 4.5]]);
  scene.add(mar);
  window.__ilha = { scene, unlock, renderer, camera, controls, npcState, slots };
  let unlockState = {};

  const birds = new THREE.Group(); scene.add(birds);
  for (let i = 0; i < 4; i++) { const b = new THREE.Group(); const w1 = box(.35, .02, .1, 0x222222, -.17, 0, 0), w2 = box(.35, .02, .1, 0x222222, .17, 0, 0); w1.rotation.z = .5; w2.rotation.z = -.5; b.add(w1, w2); b.userData = { r: (52 + i * 8) * K, s: .22 + i * .06, ph: i * 1.7, y: 14 + i * 1.2 }; b.scale.setScalar(1.6); birds.add(b); }

  scene.fog = new THREE.FogExp2(0x7fc4ff, .0013);
  let pulses = [];

  // Distancia de camera: no comeco a vila e tudo o que existe, entao ela fica perto.
  // Cada obra levantada afasta um pouco, ate abrir a ilha inteira no fim.
  let nObras = -1, enquadrou = false, lastAspect = 0, mexeu = false;
  // Le o tamanho do canvas na hora, em vez de confiar no camera.aspect: nos primeiros
  // frames o canvas ainda nao tem tamanho e o aspect fica no valor do construtor (1),
  // o que fazia a ilha abrir na distancia de modo paisagem no celular.
  function distDesejada() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    return (w < h ? 78 : 62) + Math.min(Math.max(nObras, 0), 20) * 5.4;
  }
  function enquadrar() {
    const dir = new THREE.Vector3(.60, .42, .72).normalize();   // ~24 graus acima do horizonte
    camera.position.copy(controls.target).add(dir.multiplyScalar(distDesejada()));
    camera.updateProjectionMatrix();
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const mudou = canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio();
    if (mudou) { renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } }
    // o aspect precisa ser aplicado SEMPRE, nao so quando o canvas muda de tamanho:
    // na primeira carga ele ja nasce do tamanho certo, 'mudou' e falso, e o aspect
    // ficava em 1 (o valor do construtor) -- que era o que fazia a ilha abrir na
    // distancia de modo paisagem no celular.
    if (camera.aspect !== w / h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    // Reenquadra na primeira vez e quando a tela gira. Depois disso a camera e do
    // usuario. IMPORTANTE: nao pode depender do 'mudou' -- quando o canvas ja nasce
    // do tamanho certo, o resize nunca dispara e a ilha abria longe demais.
    const retrato = camera.aspect < 1;
    if (!enquadrou || retrato !== lastAspect) { enquadrou = true; lastAspect = retrato; enquadrar(); }
  }

  // lotes que ficam na beira d'agua (em coordenada do mundo, calculados no terreno atual)
  const LOTE_PIER = [...naBeira(1.48, .05), Math.PI / 2], LOTE_FAROL = [...naBeira(2.32, .5), .4];
  let view = null;
  loadChars().then(ok => { if (ok && view) apply(view); });
  function apply(v) {
    view = v;
    const night = v.hour < 6 || v.hour > 19;
    // OBRAS: habito nenhum constroi predio proprio. Bob levanta a lista em ordem,
    // com os materiais do deposito. Cada obra tem um lote fixo na ilha.
    const OBRA_LOTE = {
      abrigo:   [1.4, 5.2, Math.PI + .3],  fogueira: [0, .6, 0],        chuva:   [5.0, 2.6, -.6],
      armadilha:[-7.4, 2.2, .9],           palicada: [1.0, -1.0, -1.15],
      horta:    [-3.6, 5.6, -.6],          deposito: [2.6, -2.8, .4],   cabana:  [1.4, 9.6, Math.PI],
      fogao:    [4.4, 9.2, Math.PI - .3],  poco:     [-1.9, 2.4, 0],    oficina: [-4.4, -5.8, .5],
      curral:   [-8.8, -6.6, .9],          moinho:   [-9.0, 8.6, .6],   radio:   [-6.6, -10.2, 0],
      pier:     [...LOTE_PIER, true],     farol:    [...LOTE_FAROL, true], casa1:   [7.4, 7.4, -2.2],
      praca:    [Math.cos(1.5) * 12.4, Math.sin(1.5) * 12.4, -1.5 - Math.PI / 2],
      posto:    [-9.4, 11.2, -.4],         escola:   [10.6, 10.4, -2.4],
      mercado:  [-12.4, 4.6, 1.3],         camara:   [11.8, -3.2, -1.9],
    };
    const OBRA_BUILD = {
      abrigo:   () => buildBarraca(),
      fogueira: () => buildFogueira(),
      chuva:    () => buildColetorChuva(),
      armadilha:() => buildArmadilha(),
      palicada: () => buildPalicada(),
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
    // lote em unidades antigas -> mundo (x EV). Pier e farol ja vem em coordenada do mundo.
    const loteDe = id => { const L = OBRA_LOTE[id]; return L[3] ? L : [L[0] * EV, L[1] * EV, L[2]]; };
    // Festa so quando a obra fica pronta de verdade: nao no primeiro desenho da ilha e
    // nao quando a cena troca de dono (visitar amigo "construiria" tudo de uma vez).
    const dono = v.dono || 'eu', celebrar = donoAnterior === dono; donoAnterior = dono;
    const feitas = v.obras || [];
    if (nObras !== feitas.length && !mexeu) { nObras = feitas.length; enquadrar(); }
    const temCabana = feitas.includes('cabana');
    for (const id of Object.keys(OBRA_LOTE)) {
      const key = 'obra_' + id;
      // o abrigo de lona some quando a cabana fica pronta
      const mostra = feitas.includes(id) && !(id === 'abrigo' && temCabana);
      if (!mostra) { if (slots[key]) put(key, null, 0, 0); continue; }
      if (slots[key]) continue;                       // ja esta de pe, nao reconstroi
      const L = loteDe(id); put(key, OBRA_BUILD[id](), L[0], L[1], L[2]);
      if (celebrar) festejar(slots[key]);
    }
    // a obra em andamento aparece como andaime no proprio lote dela
    const oa = v.obraAtual;
    const lote = oa && OBRA_LOTE[oa.id] && loteDe(oa.id);
    put('andaime', lote ? buildAndaime(oa.prog) : null, lote ? lote[0] : 0, lote ? lote[1] : 0, lote ? lote[2] : 0);

    const dp = v.deposito || {};
    put('deposito_pilha', buildDeposito(dp.toras || 0, dp.pedras || 0, !!dp.madeiraHoje, !!dp.pedraHoje), 2.6 * EV, -1.0 * EV, .4);
    // Compra nao aparece na ilha. Ja foi: um regex no nome da recompensa decidia
    // entre mesa posta e luz da TV. Recompensa e coisa da vida de quem usa e nao
    // tem fim — nao da pra ter um objeto 3D pra cada, nem catalogada em categoria.
    // A ilha reflete habito e sequencia; a rede continua, mas vem da folga (v.descanso).
    put('rede', v.descanso ? buildRede() : null, 4.6 * EV, 5.4 * EV, .4);
    put('personagem', charsReady() && !v.descanso ? makeChar(skinDoAvatar(v.avatar), .9 + Math.min(v.fit, 12) * .012) : buildPersonagem(v.fit, v.descanso), (v.descanso ? 4.6 : 3.2) * EV, (v.descanso ? 5.4 : 3.2) * EV, v.descanso ? .4 : Math.PI);
    // moradores: Bob comecou sozinho; os outros chegam com os marcos
    const hab = v.habitantes || [];
    const temCasa = hab.some(h => h.id === 'casa');   // casa da familia (marco de 120 dias)
    put('casa', temCasa ? buildCasa(0xf1e7d0) : null, 4.6 * EV, 12.4 * EV, Math.PI);
    put('festa', hab.some(h => h.id === 'festa') ? buildBandeirinhas(14) : null, 0, .6 * EV, 0);
    // pontos de interesse (coordenadas da ilha) pras rotinas
    // pontos de interesse das rotinas: o lote de cada obra ja levantada, com a
    // frente dela (2 m a mais em z) pro morador nao ficar dentro da parede.
    const frente = id => { const L = loteDe(id); return [L[0], L[1] + 2.0 * EV]; };
    const P = { deposito: [2.6 * EV, .6 * EV], floresta: [7.0 * EV, -4.6 * EV], pedreira: [-8.2 * EV, 1.2 * EV], fogueira: [0, 2.4 * EV],
      // o canteiro so entra na rotina se for perto (farol e pier ficam na costa)
      obra: (lote && Math.hypot(lote[0], lote[1]) < 18 * EV) ? [lote[0], lote[1] + 2.0 * EV] : null };
    for (const id of Object.keys(OBRA_LOTE)) if (feitas.includes(id) && Math.hypot(OBRA_LOTE[id][0], OBRA_LOTE[id][1]) < 18) P[id] = frente(id);
    if (!P.obra) delete P.obra;
    const ondeMora = temCabana ? (P.cabana || [1.4 * EV, 11.6 * EV]) : (P.abrigo || [1.4 * EV, 7.2 * EV]);
    const home = temCasa ? [4.6 * EV, 14.4 * EV] : ondeMora;
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
    // A VILA VIRA CIDADE: casa nova traz uma familia, escola traz criancas e professora,
    // mercado traz a feirante, enfermaria traz a enfermeira. Criancas vao pra escola de dia.
    const MORADORES_DA_VILA = [
      { id: 'moradora',   obra: 'casa1',   skin: 'survivorFemaleA', rota: ['casa1', 'praca', 'mercado', 'poco', 'horta'] },
      { id: 'menina',     obra: 'casa1',   skin: 'skaterFemaleA', crianca: true, rota: ['casa1', 'escola', 'praca', 'escola', 'fogueira'] },
      { id: 'menino',     obra: 'escola',  skin: 'skaterMaleA',   crianca: true, rota: ['escola', 'praca', 'escola', 'poco'] },
      { id: 'menina2',    obra: 'escola',  skin: 'survivorFemaleA', crianca: true, rota: ['escola', 'horta', 'escola', 'praca'] },
      { id: 'professora', obra: 'escola',  skin: 'cyborgFemaleA', rota: ['escola', 'praca', 'escola', 'camara'] },
      { id: 'feirante',   obra: 'mercado', skin: 'skaterFemaleA', rota: ['mercado', 'horta', 'mercado', 'deposito'] },
      { id: 'enfermeira', obra: 'posto',   skin: 'survivorFemaleA', rota: ['posto', 'praca', 'posto', 'poco'] },
    ];
    for (const m of MORADORES_DA_VILA) {
      if (!feitas.includes(m.obra)) continue;
      const name = 'vila_' + m.id, casa = P[m.obra] || home, esc = m.crianca ? .62 : 1;
      if (!slots[name]) {
        const g = charsReady() ? makeChar(m.skin, esc) : buildPessoa(0xe879a0, esc, 0x3b2a1a);
        const st = npcState[name] || (npcState[name] = { x: casa[0] + (Math.random() - .5) * 2, z: casa[1] + 1, target: null, wait: Math.random() * 4 });
        put(name, g, st.x, st.z, 0);
      }
      const st = npcState[name]; npcAtivos.add(name);
      st.routine = rota(...m.rota); st.home = casa; st.tipo = m.crianca ? 'crianca' : 'pessoa'; st.speed = m.crianca ? 1.6 : 1.3;
    }
    for (const k of Object.keys(npcState)) if (k !== 'personagem' && !npcAtivos.has(k)) { delete npcState[k]; if (slots[k]) put(k, null, 0, 0); }
    // Bob tambem anda (a menos que esteja na rede)
    const bs = npcState.personagem || (npcState.personagem = { x: 3.2 * EV, z: 3.2 * EV, target: null, wait: 1 });
    bs.routine = ROT.bob; bs.home = home; bs.tipo = 'bob'; bs.speed = 1.5; bs.resting = !!v.descanso;
    if (!v.descanso) { slots.personagem.position.set(bs.x, .55, bs.z); }
    // ilhas extras (infinito): uma nova a cada 25 dias perfeitos depois do navio
    // ocupacao do arquipelago (a ilha ja existia; Bob constroi cais + casa nela)
    const nOcup = Math.min(v.ilhasExtras || 0, arquipelago.length);
    while (extras.children.length < nOcup) { const i = extras.children.length; const g = fundirEstatico(buildOcupacao(i)); g.position.copy(arquipelago[i].position); g.position.y = .5; g.rotation.copy(arquipelago[i].rotation); extras.add(g); }
    while (extras.children.length > nOcup) extras.remove(extras.children[extras.children.length - 1]);
    // tecnologia (Bob e um genio): moinho, paineis, antena, parabolica, postes
    const tec = v.tecnologias || [];
    const temEnergia = feitas.includes('moinho');
    put('gerador', temEnergia ? buildGerador() : null, 4.4 * EV, -1.2 * EV, 0);
    put('paineis', temEnergia && tec.includes('solar') ? buildPaineis() : null, 9.4 * EV, 3.6 * EV, 0);
    put('parabolica', tec.includes('internet') ? buildAntena(true) : null, 13.6 * EV, 1.6 * EV, 0);
    put('postes', temEnergia ? buildPostes(night) : null, 0, 0, 0);
    // (a antiga lista CIDADE virou parte das OBRAS)
    unlockState = v.unlocked;
    // silhueta = cor clara e transparente. A cor original fica guardada: visitando um amigo
    // menos adiantado, o farol vira silhueta e precisa voltar colorido na minha ilha.
    for (const k in unlock) { const on = !!v.unlocked[k]; unlock[k].traverse(o => { if (o.isMesh) {
      if (!o.userData.cor) o.userData.cor = { c: o.material.color.getHex(), e: o.material.emissive.getHex() };
      o.material.transparent = !on; o.material.opacity = on ? 1 : .1; o.material.depthWrite = on; o.castShadow = on; o.receiveShadow = on;
      if (on) { o.material.color.setHex(o.userData.cor.c); o.material.emissive.setHex(o.userData.cor.e); } else { o.material.color.set(0xdfefff); o.material.emissive.set(0); } } });
      unlock[k].visible = on || k !== 'montanha' || v.unlocked.navio; }
    birds.visible = !!v.unlocked.birds && v.weather.clear;
    refazGrade();
  }

  function pulse(name) { const g = slots[name]; if (g) pulses.push({ g, t: 0 }); }

  // OBRA CONCLUIDA: brota do chao com um pop elastico, levanta poeira e solta confete.
  let donoAnterior = null, festas = [];
  const matPoeira = new THREE.MeshStandardMaterial({ color: 0xcbb38b, roughness: 1, transparent: true, depthWrite: false });
  const CORES_CONFETE = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xffffff];
  function festejar(g) {
    if (!g) return;
    const fx = new THREE.Group(); fx.position.copy(g.position); island.add(fx);
    const raio = Math.max(2.5, (g.userData.esc ? g.userData.esc.x : 1) * 1.6);
    const poeira = [], confete = [];
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * 6.28, m = new THREE.Mesh(new THREE.IcosahedronGeometry(.6 + Math.random() * .5, 0), matPoeira.clone());
      m.userData = { a, v: 2.5 + Math.random() * 2 }; m.position.set(Math.cos(a) * raio * .5, .3, Math.sin(a) * raio * .5); fx.add(m); poeira.push(m);
    }
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.18, .04, .12), new THREE.MeshStandardMaterial({ color: CORES_CONFETE[i % 6], emissive: CORES_CONFETE[i % 6], emissiveIntensity: .25 }));
      const a = Math.random() * 6.28, v = 3 + Math.random() * 4;
      m.userData = { vx: Math.cos(a) * v * .5, vy: 7 + Math.random() * 5, vz: Math.sin(a) * v * .5, gx: Math.random() * 9, gz: Math.random() * 9 };
      m.position.set(0, raio * .8, 0); fx.add(m); confete.push(m);
    }
    festas.push({ g, fx, t: 0, esc: g.userData.esc.clone(), poeira, confete, raio });
    g.scale.copy(g.userData.esc).multiplyScalar(.05);
  }
  function atualizarFestas(dt) {
    festas = festas.filter(f => {
      f.t += dt;
      // pop: sobe passando um pouco do tamanho e volta (ease-out-back)
      const k = Math.min(1, f.t / .55), c = 1.9, pop = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
      f.g.scale.copy(f.esc).multiplyScalar(Math.max(.05, pop));
      for (const m of f.poeira) { const u = m.userData, r = f.raio * .5 + f.t * u.v; m.position.set(Math.cos(u.a) * r, .3 + f.t * 1.2, Math.sin(u.a) * r); m.scale.setScalar(1 + f.t * 1.6); m.material.opacity = Math.max(0, .65 * (1 - f.t / 1.6)); }
      for (const m of f.confete) { const u = m.userData; u.vy -= 14 * dt; m.position.x += u.vx * dt; m.position.y = Math.max(.05, m.position.y + u.vy * dt); m.position.z += u.vz * dt; m.rotation.x += u.gx * dt; m.rotation.z += u.gz * dt; }
      if (f.t > 2.6) { island.remove(f.fx); f.fx.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); f.g.scale.copy(f.esc); return false; }
      return true;
    });
  }

  const BRANCO = new THREE.Color(0xffffff);
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); resize();
    const dt = Math.min((now - last) / 1000, .1); last = now; const t = now / 1000;
    const d = new Date(); const hp = new URLSearchParams(location.search).get('hora'); const hour = hp !== null ? +hp : d.getHours() + d.getMinutes() / 60;
    // ceu e sol
    const sky = skyColor(hour); scene.background = sky;
    // horizonte mais claro, zenite mais fundo: e isso que da profundidade ao ceu
    // o horizonte clareia de dia; de noite quase nada (com 28% fixo a noite ficava cinza)
    skyMat.uniforms.horizonte.value.copy(sky).lerp(BRANCO, .05 + .23 * Math.max(Math.sin((hour - 6) / 12 * Math.PI), 0));
    skyMat.uniforms.zenite.value.copy(sky).multiplyScalar(.62);
    skyDome.position.copy(camera.position);
    const foggy = view && view.weather.fog;
    scene.fog.color.copy(foggy ? new THREE.Color(0x9aa5b1).lerp(sky, .4) : sky); scene.fog.density = foggy ? .010 : .0013;
    const ang = (hour - 6) / 12 * Math.PI; const sunUp = Math.sin(ang);
    sun.position.set(Math.cos(ang) * 120, Math.max(sunUp, .02) * 120, 48); sun.intensity = Math.max(sunUp, 0) * 1.7 * (foggy ? .55 : 1);
    // sol/lua bem longe: tem que parecer ceu, nao um objeto boiando em cima da ilha
    sunMesh.position.set(Math.cos(ang) * 320, Math.max(sunUp, .06) * 300, 120); sunMesh.visible = sunUp > -.05;
    moon.position.set(-Math.cos(ang) * 30, Math.max(-sunUp, .02) * 30, -12); moon.intensity = Math.max(-sunUp, 0) * .35;
    moonMesh.position.set(-Math.cos(ang) * 300, Math.max(-sunUp, .06) * 280, -140); moonMesh.visible = sunUp < .05;
    hemi.intensity = .25 + Math.max(sunUp, 0) * .5; stars.material.opacity = THREE.MathUtils.clamp(-sunUp * 2, 0, 1) * (foggy ? .3 : 1);
    // agua: onda no shader, correnteza rolando a textura, nevoa da cachoeira
    atualizarAgua(t, dt, aguasCorrentes); if (nevoa) nevoa.userData.atualizar(t);
    // fogueira
    const fg = slots.obra_fogueira; if (fg) { const on = view && view.perfectToday && sunUp < .15; const fl = fg.getObjectByName('flame'), li = fg.getObjectByName('fire'); fl.visible = on; li.intensity = on ? 2.5 + Math.sin(t * 17) * .6 + Math.sin(t * 31) * .4 : 0; if (on) fl.scale.set(1 + Math.sin(t * 13) * .12, 1 + Math.sin(t * 9) * .18, 1); }
    // farol, moinho, fumaca do aviao
    if (slots.obra_farol) slots.obra_farol.rotation.y = .4 + t * .8;
    if (slots.obra_moinho) slots.obra_moinho.getObjectByName('pas').rotation.z = t * (view && view.weather.clear ? 1.6 : .7);
    const fum = aviao.getObjectByName('fumaca'); fum.position.y = 1.9 + (t % 3) * .5; fum.scale.setScalar(1 + (t % 3) * .35); fum.material.opacity = 1 - (t % 3) / 3; fum.material.transparent = true;
    if (unlock.navio.visible) { unlock.navio.position.y = -.3 + Math.sin(t * .8) * .12; unlock.navio.rotation.z = Math.sin(t * .6) * .04; }
    // vento nas arvores (GPU) e macacos
    tempoVento.value = t; vento.value = view && view.weather && view.weather.fog ? 1.8 : 1;
    macacos.atualizar(dt, t);
    // nuvens andando com o vento (o brilho proprio some de noite, senao elas acendem)
    matNuvem.emissiveIntensity = .06 + Math.max(sunUp, 0) * .26;
    nuvens.children.forEach(n => {
      const u = n.userData; u.a += u.v * dt;
      n.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
      n.rotation.y = -u.a;
    });
    // passaros
    birds.children.forEach(b => { const u = b.userData; const a = t * u.s + u.ph; b.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 2 + u.ph) * .3, Math.sin(a) * u.r); b.rotation.y = -a; b.children[0].rotation.z = .5 + Math.sin(t * 9) * .4; b.children[1].rotation.z = -.5 - Math.sin(t * 9) * .4; });
    // NPCs: rotinas (dia: pontos de interesse; noite: fogueira ou casa)
    const noite = hour < 6 || hour >= 20;
    const fogueiraAcesa = view && view.perfectToday && hour >= 19.5 && hour < 23.5;
    for (const name of Object.keys(npcState)) {
      const st = npcState[name], g = slots[name]; if (!g || st.resting) continue;
      const cao = st.tipo === 'cachorro';
      let dest = st.target, vel = st.speed;
      if (cao) {
        // Segue o Bob com folga: vai atras quando ele se afasta (>3,2), para quando chega
        // perto (<1,8) e, parado, fareja em volta. O antigo corria atras de um ponto grudado
        // no Bob: parava e arrancava o tempo todo, e cada arrancada era um pulinho.
        const b = npcState.personagem;
        if (b) {
          const longe = Math.hypot(b.x - st.x, b.z - st.z);
          if (st.seguindo && longe < 1.8) { st.seguindo = false; st.farejo = 0; }
          else if (!st.seguindo && longe > 3.2) st.seguindo = true;
          if (st.seguindo) { dest = [b.x + .8, b.z - .5]; vel = 2.8; }
          else { if ((st.farejo -= dt) <= 0) { st.farejo = 3 + Math.random() * 5; const a = Math.random() * 6.28; st.alvoFarejo = [b.x + Math.cos(a) * 1.7, b.z + Math.sin(a) * 1.7]; } dest = st.alvoFarejo; vel = .9; }
        }
      } else if (noite) {
        dest = fogueiraAcesa ? [Math.cos(st.ang ?? (st.ang = Math.random() * 6.28)) * 3.3, .6 * EV + Math.sin(st.ang) * 3.3] : st.home;
      } else if (name === 'personagem' && hour >= 16.5 && hour < 18.5) {
        dest = PESCA; st.target = null;                                      // fim de tarde: vai pescar o jantar
      } else if (!dest) { if (st.wait > 0) st.wait -= dt; else st.target = dest = st.routine[Math.floor(Math.random() * st.routine.length)]; }
      // rota: recalculada quando o destino muda (o cachorro no maximo 2x por segundo)
      if (dest) {
        const mudou = !st.dest || Math.hypot(dest[0] - st.dest[0], dest[1] - st.dest[1]) > .6;
        if (mudou && (!cao || !(st.recalc > 0))) { st.dest = dest; st.path = grade.rota(st.x, st.z, dest[0], dest[1]); st.recalc = .5; }
      } else { st.dest = null; st.path = null; }
      st.recalc = (st.recalc || 0) - dt;
      let moving = false;
      if (st.path && st.path.length) {
        const wp = st.path[0], dx = wp[0] - st.x, dz = wp[1] - st.z, dist = Math.hypot(dx, dz);
        if (dist > .15) {
          const s = Math.min(vel * dt, dist); st.x += dx / dist * s; st.z += dz / dist * s; moving = true;
          let dr = Math.atan2(dx, dz) - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
          g.rotation.y += dr * Math.min(1, dt * 9);                         // vira de verdade, sem estalar
        } else {
          st.path.shift();
          if (!st.path.length && !noite && !cao) { st.target = null; st.dest = null; st.wait = 2 + Math.random() * 5; }
        }
      }
      g.position.x = st.x; g.position.z = st.z;
      const legs = g.userData.legs, legs2 = g.userData.legs2;
      if (legs) { const sw = moving ? Math.sin(t * (cao ? 11 : 9) * (vel > 2 ? 1.3 : 1)) * .6 : 0; legs[0].rotation.x = sw; legs[1].rotation.x = sw; if (legs2) { legs2[0].rotation.x = -sw; legs2[1].rotation.x = -sw; } }
      if (cao) { g.position.y = alturaIlha(st.x, st.z) + (moving ? Math.abs(Math.sin(t * 11)) * .025 : 0); const rb = g.getObjectByName('rabo'); if (rb) rb.rotation.y = Math.sin(t * (moving ? 14 : 6)) * .5; }
      const ch = g.userData.char; if (ch) { ch.setMoving(moving); ch.update(dt); }
      if (!moving && !noite && !cao) g.rotation.y += Math.sin(t * .7) * .002; // "trabalhando"
    }
    // PESCA: vara na mao e, de tempos em tempos, um peixe saindo d'agua ate o Bob
    {
      const bob = npcState.personagem, gb = slots.personagem;
      const pescando = !!(bob && gb && !bob.resting && !noite && hour >= 16.5 && hour < 18.5 && Math.hypot(bob.x - PESCA[0], bob.z - PESCA[1]) < .9);
      vara.visible = pescando;
      if (pescando) {
        const rot = Math.atan2(LAGO[0] - bob.x, LAGO[1] - bob.z); gb.rotation.y = rot;
        vara.position.set(bob.x + Math.sin(rot) * .3, gb.position.y + .95, bob.z + Math.cos(rot) * .3); vara.rotation.y = rot;
        vara.children[0].rotation.x = .9 + Math.sin(t * 1.3) * .05;
        pesca.t += dt;
        if (pesca.t > pesca.prox) pesca = { t: 0, prox: 7 + Math.random() * 6, de: [bob.x + Math.sin(rot) * 3.2, bob.z + Math.cos(rot) * 3.2], rot };
        const f = pesca.t / .9;
        fisgado.visible = !!pesca.de && f < 1;
        if (fisgado.visible) {
          fisgado.position.set(pesca.de[0] + (bob.x - pesca.de[0]) * f, .6 + (gb.position.y + .9 - .6) * f + Math.sin(f * Math.PI) * 1.4, pesca.de[1] + (bob.z - pesca.de[1]) * f);
          fisgado.rotation.set(Math.sin(t * 30) * .6, pesca.rot + Math.PI, 0);   // se debatendo
        }
      } else fisgado.visible = false;
    }
    // BICHOS: cada um perambula so dentro da sua regiao, longe da vila do Bob
    for (const b of fauna) {
      const dx = b.tx - b.x, dz = b.tz - b.z, dist = Math.hypot(dx, dz);
      let andando = false;
      if (dist > .4) {
        const s = Math.min(b.cfg.vel * dt, dist);
        b.x += dx / dist * s; b.z += dz / dist * s;
        b.g.rotation.y = Math.atan2(dx, dz) + (b.cfg.caranguejo ? Math.PI / 2 : 0); andando = true;   // caranguejo anda de lado
      } else if (b.wait > 0) { b.wait -= dt; }
      else {
        const a = Math.random() * 6.28;
        let cx = b.cfg.casa[0], cz = b.cfg.casa[1], raio = b.cfg.raio;
        if (b.cfg.predador) {
          // Com a fogueira acesa ele fica no fundo da mata; sem ela, encosta na
          // clareira. E a unica coisa na ilha que anda pra tras quando o dia e perfeito.
          const seguro = view && view.perfectToday;
          const bravo = view && view.weather && view.weather.fog;
          const k = seguro ? 1.0 : bravo ? .40 : .70;
          cx *= k; cz *= k; raio = 9;
        }
        const r = Math.random() * raio;
        b.tx = cx + Math.cos(a) * r; b.tz = cz + Math.sin(a) * r;
        b.wait = (b.cfg.predador ? 1 : 2) + Math.random() * 7;
      }
      b.g.position.set(b.x, alturaIlha(b.x, b.z), b.z);
      // patas em pares opostos (a garca so tem duas; caranguejo nenhuma que balance)
      const sw = andando ? Math.sin(t * 7 * Math.max(b.cfg.vel, .6)) * .5 : 0;
      for (const l of b.g.userData.legs || []) l.rotation.x = sw;
      for (const l of b.g.userData.legs2 || []) l.rotation.x = -sw;
      if (b.rabo) b.rabo.rotation.y = Math.sin(t * (andando ? 5 : 1.5) + b.x) * .35;
    }
    araras.atualizar(t); marinha.atualizar(t, dt); navios.atualizar(t, dt); atualizarFestas(dt);
    // brasa do fogao
    if (slots.obra_fogao) { const br = slots.obra_fogao.getObjectByName('brasa'); if (br) br.scale.setScalar(1 + Math.sin(t * 8) * .12); }
    // pulsos de feedback
    pulses = pulses.filter(p => { p.t += dt * 2.2; const s = 1 + Math.sin(Math.min(p.t, 1) * Math.PI) * .18; p.g.scale.copy(p.g.userData.esc || new THREE.Vector3(1, 1, 1)).multiplyScalar(s); if (p.g === slots.personagem) p.g.position.y = .55 + Math.sin(Math.min(p.t, 1) * Math.PI) * .9; return p.t < 1; });
    // o pan nao pode levar a camera pra fora da ilha
    const alvo = controls.target;
    const rAlvo = Math.hypot(alvo.x, alvo.z);
    if (rAlvo > R_ILHA + 6) { const k = (R_ILHA + 6) / rAlvo; alvo.x *= k; alvo.z *= k; }
    const chaoAlvo = Math.max(0, alturaIlha(alvo.x, alvo.z));
    alvo.y = Math.max(chaoAlvo + .4, Math.min(alvo.y, chaoAlvo + 8));
    // nao entra no chao -- agora tem chapada e serra, nao so o planalto da vila
    const chaoCam = Math.max(0, alturaIlha(camera.position.x, camera.position.z));
    if (camera.position.y < chaoCam + 1.6) camera.position.y = chaoCam + 1.6;
    sun.target.position.set(alvo.x, 0, alvo.z);
    sun.position.x += alvo.x; sun.position.z += alvo.z;
    controls.update();
    // quanto de noite esta (0 de dia, 1 no escuro): comanda brilho, janelas e vagalumes
    const escuro = THREE.MathUtils.clamp(.45 - sunUp * 2.2, 0, 1);
    JANELA.emissiveIntensity = .04 + escuro * 1.7;
    vagalumes.atualizar(t, escuro);
    if (composer) { bloom.strength = .08 + escuro * .9; composer.render(); } else renderer.render(scene, camera);
  }
  resize(); enquadrar();          // enquadra antes do primeiro quadro
  requestAnimationFrame(frame);

  function snapshot() {
    const w = 640, h = Math.round(640 * canvas.height / canvas.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(canvas, 0, 0, w, h);
    return c.toDataURL('image/jpeg', .72);
  }
  return { apply, pulse, snapshot };
}
