// Personagens Kenney (CC0): modelo FBX + animacoes idle/run + skins PNG, e a aparencia
// escolhida por quem joga (corpo, estilo de roupa e cores).
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const SKINS = {
  bob: 'survivorMaleB', amigo1: 'criminalMaleA', amiga1: 'skaterFemaleA', amor: 'survivorFemaleA',
  bebe: 'skaterFemaleA', amigo2: 'skaterMaleA', festa: 'cyborgFemaleA',
};
// Estilos de roupa (as 6 skins Kenney que existem). 'corpo': h = homem, m = mulher.
export const ESTILOS = [
  { skin: 'survivorMaleB',   corpo: 'h', nome: 'Náufrago' },
  { skin: 'skaterMaleA',     corpo: 'h', nome: 'Skatista' },
  { skin: 'criminalMaleA',   corpo: 'h', nome: 'Social' },
  { skin: 'survivorFemaleA', corpo: 'm', nome: 'Náufraga' },
  { skin: 'skaterFemaleA',   corpo: 'm', nome: 'Skatista' },
  { skin: 'cyborgFemaleA',   corpo: 'm', nome: 'Ciborgue' },
];
export const skinDoAvatar = a => ESTILOS.some(x => x.skin === a) ? a : SKINS.bob;
// Paletas de cada parte recolorivel. null (no visual) = a cor original do estilo.
export const PALETAS = {
  pele:   ['#f6d5bd', '#eab893', '#cf9166', '#a8693f', '#7a4a2a', '#4e2e1b'],
  cabelo: ['#1c1410', '#4a2a18', '#8a5a2b', '#dcb46c', '#b8471f', '#d0d0d0', '#3b6fd6', '#d64fa0'],
  camisa: ['#e63946', '#f4a261', '#ffd23f', '#2a9d8f', '#3a86ff', '#8338ec', '#ffffff', '#222222'],
  calca:  ['#1d3557', '#2b2b2b', '#6b705c', '#c2a878', '#9d0208', '#a8dadc', '#f1f1f1'],
};
export const PARTES = ['pele', 'cabelo', 'camisa', 'calca'];
const ALTURA = 1.75; // altura final do boneco (unidades da ilha)

let base = null, clips = {}, textures = {}, loading = null;

// ---------------------------------------------------------------- aparencia
// Cada skin tem um mapa (assets/mascara-<skin>.png: 60 pele, 120 cabelo, 180 camiseta,
// 240 calca) e a cor original de cada parte (assets/visual.json), gerados por
// tools/gerar_mascaras.py. Recolorir: nova = alvo + (pixel - original) -- mantem a sombra,
// a estampa e a sujeira da roupa.
const T = 512, CAT = { pele: 60, cabelo: 120, camisa: 180, calca: 240 };
let originais = {};
const imgBase = {}, mascara = {}, cacheTex = new Map();
const carregaImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// A pele original da Naufraga e vermelho-escura (assim na textura da Kenney) e parecia um
// bicho: quem nao escolhe pele ganha um tom natural.
const PELE_PADRAO = { survivorFemaleA: '#a8693f' };
export const corOriginal = (skin, parte) => {
  if (parte === 'pele' && PELE_PADRAO[skin]) return PELE_PADRAO[skin];
  const c = (originais[skin] || {})[parte]; return c ? '#' + c.map(v => v.toString(16).padStart(2, '0')).join('') : '#888888';
};

async function carregarAparencia() {
  try { originais = await (await fetch('assets/visual.json')).json(); } catch { originais = {}; }
  await Promise.all(ESTILOS.map(async ({ skin }) => {
    const img = await carregaImg('assets/' + skin + '.png');
    imgBase[skin] = img;
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; textures[skin] = t;
    try {
      const m = await carregaImg('assets/mascara-' + skin + '.png'), c = document.createElement('canvas'); c.width = c.height = T;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(m, 0, 0, T, T);
      const d = g.getImageData(0, 0, T, T).data, r = new Uint8Array(T * T);
      for (let i = 0; i < r.length; i++) r[i] = Math.round(d[i * 4] / 60) * 60;   // arredonda: o canvas pode mexer 1 ou 2 no valor
      mascara[skin] = r;
    } catch { /* sem mapa: essa skin so aparece com as cores originais */ }
  }));
}

// visual = { estilo: skin, pele?, cabelo?, camisa?, calca? } (hex, ou null pra cor original)
export function texturaVisual(skin, visual) {
  visual = { ...(visual || {}) };
  if (!visual.pele && PELE_PADRAO[skin]) visual.pele = PELE_PADRAO[skin];
  const partes = PARTES.filter(k => visual[k]), bochecha = corpoDe(skin) === 'm';
  if ((!partes.length && !bochecha) || !mascara[skin] || !imgBase[skin] || !originais[skin]) return textures[skin];
  const chave = skin + '|' + partes.map(k => k + visual[k]).join('|') + (bochecha ? '|bochecha' : '');
  if (cacheTex.has(chave)) return cacheTex.get(chave);
  const c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(imgBase[skin], 0, 0, T, T);
  const img = g.getImageData(0, 0, T, T), d = img.data, m = mascara[skin], troca = {};
  for (const k of partes) troca[CAT[k]] = [hexRgb(visual[k]), originais[skin][k]];
  for (let p = 0, i = 0; p < m.length; p++, i += 4) {
    const t = troca[m[p]]; if (!t) continue;
    const [alvo, orig] = t;
    d[i] = Math.max(0, Math.min(255, alvo[0] + d[i] - orig[0]));
    d[i + 1] = Math.max(0, Math.min(255, alvo[1] + d[i + 1] - orig[1]));
    d[i + 2] = Math.max(0, Math.min(255, alvo[2] + d[i + 2] - orig[2]));
  }
  g.putImageData(img, 0, 0);
  // bochechas rosadas nas personagens (o mapa de UV e o mesmo pra todas: olhos em y ~110)
  if (bochecha) for (const x of [135, 186]) {
    const gr = g.createRadialGradient(x, 128, 0, x, 128, 10);
    gr.addColorStop(0, 'rgba(255,110,140,.5)'); gr.addColorStop(1, 'rgba(255,110,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, 128, 10, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  cacheTex.set(chave, tex);
  return tex;
}

// Aparencia sorteada, sempre a mesma pra mesma semente: moradores da vila deixam de ser
// seis clones das mesmas seis roupas.
export function visualSorteado(semente, skin) {
  let s = 0; for (const ch of String(semente)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const v = { estilo: skin };
  for (const k of PARTES) if (k === 'pele' || rnd() < .75) v[k] = PALETAS[k][Math.floor(rnd() * PALETAS[k].length)];
  return v;
}

export function loadChars() {
  if (loading) return loading;
  const fbx = new FBXLoader();
  const load = url => new Promise((res, rej) => fbx.load(url, res, undefined, rej));
  loading = Promise.all([load('assets/characterMedium.fbx'), load('assets/idle.fbx'), load('assets/run.fbx'), carregarAparencia()]).then(([model, idle, run]) => {
    const box = new THREE.Box3().setFromObject(model); const h = box.max.y - box.min.y;
    model.scale.setScalar(ALTURA / h);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const pick = (o, nome) => o.animations.find(a => a.name.toLowerCase().includes(nome)) || o.animations.reduce((a, b) => a.duration > b.duration ? a : b);
    base = model; clips.idle = pick(idle, 'idle'); clips.run = pick(run, 'run');
    // pe no chao: o pivo do FBX nao esta na base
    model.position.y = -box.min.y * (ALTURA / h);
    model.traverse(o => { if (o.isMesh && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.shininess = 2; if (m.specular) m.specular.set(0x111111); m.color.set(0xffffff); }); } });
    return true;
  }).catch(e => { console.warn('personagens FBX nao carregaram, usando bonecos simples', e); return false; });
  return loading;
}
export const charsReady = () => !!base;

// CABELO COMPRIDO. O cabelo da Kenney e pintado na cabeca (curto pra todo mundo). Mulher
// ganha uma peca de cabelo presa ao osso Head -- acompanha a animacao -- montada em
// coordenadas do mundo com o boneco parado (cabeca: x +-0,20, y 1,21..1,75, rosto pra +z) e
// levada pro espaco do osso.
const corpoDe = skin => (ESTILOS.find(e => e.skin === skin) || {}).corpo;
function cabeloComprido(group, cor) {
  let head = null; group.traverse(o => { if (o.isBone && o.name === 'Head') head = o; });
  if (!head) return;
  group.updateMatrixWorld(true);
  // Tudo redondo e com sombreado suave: a primeira versao era facetada (flatShading) e as
  // mechas eram caixas -- virou um capacete. Cabeca: x +-0,20, y 1,21..1,75, rosto pra +z.
  const partes = [];
  // volume em cima e atras (metade de tras de uma esfera, nao cobre o rosto)
  const volume = new THREE.SphereGeometry(.268, 28, 18, Math.PI - .25, Math.PI + .5, 0, Math.PI * .6);
  volume.translate(0, 1.475, -.03); partes.push(volume);
  // cabelo caindo atras ate os ombros: um oval macio
  const costas = new THREE.SphereGeometry(.25, 24, 18); costas.scale(1.05, 1.3, .62); costas.translate(0, 1.27, -.13); partes.push(costas);
  // mechas dos lados do rosto, com a ponta redonda e abrindo de leve embaixo
  for (const sx of [-1, 1]) {
    const m = new THREE.CapsuleGeometry(.05, .3, 6, 12); m.rotateZ(sx * .1); m.translate(sx * .205, 1.25, .01); partes.push(m);
  }
  const inv = head.matrixWorld.clone().invert();
  const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: .55, side: THREE.DoubleSide });
  // userData.cabelo: o makeChar poe a textura da roupa em toda malha do boneco, e o cabelo
  // entrava junto (saia com mancha de sujeira e desenho da camiseta)
  for (const geo of partes) { geo.applyMatrix4(inv); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.frustumCulled = false; m.userData.cabelo = true; head.add(m); }
}

// Cria uma instancia animada. 'visual' (opcional) recolore pele, cabelo, camiseta e calca.
export function makeChar(skin, escala = 1, visual = null) {
  const group = SkeletonUtils.clone(base);
  if (corpoDe(skin) === 'm') cabeloComprido(group, (visual && visual.cabelo) || corOriginal(skin, 'cabelo'));   // antes de escalar
  group.scale.multiplyScalar(escala);
  const tex = texturaVisual(skin, visual);
  group.traverse(o => { if (o.isMesh && !o.userData.cabelo) { o.material = o.material.clone ? o.material.clone() : o.material; if (Array.isArray(o.material)) o.material = o.material.map(m => { m = m.clone(); m.map = tex; m.needsUpdate = true; return m; }); else { o.material.map = tex; o.material.needsUpdate = true; } } });
  const mixer = new THREE.AnimationMixer(group);
  const idle = mixer.clipAction(clips.idle), run = mixer.clipAction(clips.run);
  idle.play(); run.play(); run.setEffectiveWeight(0);
  let moving = false;
  const wrap = new THREE.Group(); wrap.add(group);
  wrap.userData.char = { mixer, setMoving(m) { if (m === moving) return; moving = m; const from = m ? idle : run, to = m ? run : idle; to.reset().setEffectiveWeight(1); from.crossFadeTo(to, .25, false); to.crossFadeFrom(from, .25, false); }, update(dt) { mixer.update(dt); } };
  return wrap;
}
