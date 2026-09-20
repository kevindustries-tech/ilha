// Personagens Kenney (CC0): modelo FBX + animacoes idle/run + skins PNG.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const SKINS = {
  bob: 'survivorMaleB', amigo1: 'criminalMaleA', amiga1: 'skaterFemaleA', amor: 'survivorFemaleA',
  bebe: 'skaterFemaleA', amigo2: 'skaterMaleA', festa: 'cyborgFemaleA',
};
const ALTURA = 1.75; // altura final do boneco (unidades da ilha)

let base = null, clips = {}, textures = {}, loading = null;
const texLoader = new THREE.TextureLoader();

export function loadChars() {
  if (loading) return loading;
  const fbx = new FBXLoader();
  const load = url => new Promise((res, rej) => fbx.load(url, res, undefined, rej));
  loading = Promise.all([load('assets/characterMedium.fbx'), load('assets/idle.fbx'), load('assets/run.fbx')]).then(([model, idle, run]) => {
    const box = new THREE.Box3().setFromObject(model); const h = box.max.y - box.min.y;
    model.scale.setScalar(ALTURA / h);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const pick = (o, nome) => o.animations.find(a => a.name.toLowerCase().includes(nome)) || o.animations.reduce((a, b) => a.duration > b.duration ? a : b);
    base = model; clips.idle = pick(idle, 'idle'); clips.run = pick(run, 'run');
    // pe no chao: o pivo do FBX nao esta na base
    model.position.y = -box.min.y * (ALTURA / h);
    model.traverse(o => { if (o.isMesh && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.shininess = 2; if (m.specular) m.specular.set(0x111111); m.color.set(0xffffff); }); } });
    for (const s of new Set(Object.values(SKINS))) { const t = texLoader.load('assets/' + s + '.png'); t.colorSpace = THREE.SRGBColorSpace; textures[s] = t; }
    return true;
  }).catch(e => { console.warn('personagens FBX nao carregaram, usando bonecos simples', e); return false; });
  return loading;
}
export const charsReady = () => !!base;

// Cria uma instancia animada. Retorna { group, mixer, setMoving(bool) }
export function makeChar(skin, escala = 1) {
  const group = SkeletonUtils.clone(base);
  group.scale.multiplyScalar(escala);
  const tex = textures[skin];
  group.traverse(o => { if (o.isMesh) { o.material = o.material.clone ? o.material.clone() : o.material; if (Array.isArray(o.material)) o.material = o.material.map(m => { m = m.clone(); m.map = tex; m.needsUpdate = true; return m; }); else { o.material.map = tex; o.material.needsUpdate = true; } } });
  const mixer = new THREE.AnimationMixer(group);
  const idle = mixer.clipAction(clips.idle), run = mixer.clipAction(clips.run);
  idle.play(); run.play(); run.setEffectiveWeight(0);
  let moving = false;
  const wrap = new THREE.Group(); wrap.add(group);
  wrap.userData.char = { mixer, setMoving(m) { if (m === moving) return; moving = m; const from = m ? idle : run, to = m ? run : idle; to.reset().setEffectiveWeight(1); from.crossFadeTo(to, .25, false); to.crossFadeFrom(from, .25, false); }, update(dt) { mixer.update(dt); } };
  return wrap;
}
