// Natureza da ilha: arvores de varios tipos, coqueiros, arbustos, vento e macacos.
// Tudo em InstancedMesh -- milhares de arvores em poucas chamadas de desenho, que e
// o que o celular aguenta. O vento e calculado na GPU (vertex shader), nao no JS.
import * as THREE from 'three';

// Relogio compartilhado por todos os materiais que balancam.
export const tempo = { value: 0 };
export const vento = { value: 1 };   // 1 = brisa; sobe com o tempo fechado

// Faz o material balancar com o vento. 'base' e a altura (sem escala) em que a peca
// comeca acima do chao: tronco balanca pouco, copa balanca mais, ponta mais ainda.
export function balancar(mat, base, forca = 1) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTempo = tempo; sh.uniforms.uVento = vento;
    sh.vertexShader = 'uniform float uTempo;\nuniform float uVento;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float alt = max(0.0, ${base.toFixed(2)} + position.y);
      float fase = ip.x * 0.11 + ip.z * 0.07;
      float amp = alt * alt * ${(0.0065 * forca).toFixed(5)} * uVento;
      transformed.x += (sin(uTempo * 1.4 + fase) + 0.4 * sin(uTempo * 3.3 + fase * 2.0)) * amp;
      transformed.z += cos(uTempo * 1.1 + fase * 1.3) * amp * 0.7;`);
  };
  mat.customProgramCacheKey = () => 'balanca' + base + '_' + forca;
  return mat;
}

const matPlano = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, ...extra });
const ico = (r, det = 0) => new THREE.IcosahedronGeometry(r, det);

// Cada tipo: pecas [geometria, material-base, altura-da-peca, escala-da-peca, deslocamento xz, recebe cor da instancia?]
const VERDES = [0x4f9d3a, 0x5aa845, 0x3d8b3d, 0x6bb04a, 0x468f36];
const VERDES_ESCUROS = [0x2f7a3a, 0x3a8a3f, 0x2c6e34, 0x357d3a];
const TIPOS = {
  pinheiro: [
    [() => new THREE.CylinderGeometry(.16, .26, 1.7, 6), 0x8b5a2b, .85, [1, 1, 1], [0, 0], false],
    [() => new THREE.CylinderGeometry(0, 1.25, 2.3, 7), 0xffffff, 2.3, [1, 1, 1], [0, 0], true],
    [() => new THREE.CylinderGeometry(0, .92, 1.8, 7), 0xffffff, 3.5, [1, 1, 1], [0, 0], true],
  ],
  folhosa: [
    [() => new THREE.CylinderGeometry(.14, .22, 1.8, 6), 0x7a4f2a, .9, [1, 1, 1], [0, 0], false],
    [() => ico(1.35), 0xffffff, 2.5, [1, .82, 1], [0, 0], true],
    [() => ico(1.0), 0xffffff, 3.2, [1, .85, 1], [.55, -.3], true],
  ],
  emergente: [
    [() => new THREE.CylinderGeometry(.17, .32, 4.6, 6), 0x6b4423, 2.3, [1, 1, 1], [0, 0], false],
    [() => ico(2.1, 1), 0xffffff, 4.9, [1, .42, 1], [0, 0], true],
    [() => ico(1.3), 0xffffff, 5.4, [1, .6, 1], [.9, .4], true],
  ],
  ipe: [
    [() => new THREE.CylinderGeometry(.13, .2, 1.9, 6), 0x5e3b22, .95, [1, 1, 1], [0, 0], false],
    [() => ico(1.3), 0xffffff, 2.6, [1, .8, 1], [0, 0], true],
    [() => ico(.9), 0xffffff, 3.2, [1, .8, 1], [-.5, .3], true],
  ],
  arbusto: [
    [() => ico(.9), 0xffffff, .38, [1.3, .62, 1.3], [0, 0], true],
  ],
};
// onde fica o topo da copa de cada tipo (pra macaco pousar), em unidades sem escala.
// Conta a segunda bola de folhas, que fica deslocada: com o topo so da primeira o
// macaco sentava DENTRO da copa e sumia.
export const TOPO_COPA = { pinheiro: 4.4, folhosa: 3.95, emergente: 6.0, ipe: 3.8 };
export const CORES = {
  pinheiro: [0x3f9142, 0x4aa34a, 0x3b8a40, 0x478f45], folhosa: VERDES, emergente: VERDES_ESCUROS,
  ipe: [0xf2c230, 0xe8b523, 0xd46aa6, 0xc15a98], arbusto: [0x2e6b30, 0x3f7f35, 0x4a8f3c, 0x35753a],
};

// lista: [{ tipo, x, y, z, e (escala), rot, cor? }]  ->  Group com uma InstancedMesh por peca
export function criarArvores(lista, { sombra = true } = {}) {
  const g = new THREE.Group();
  const porTipo = {};
  for (const a of lista) (porTipo[a.tipo] = porTipo[a.tipo] || []).push(a);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  for (const [tipo, arr] of Object.entries(porTipo)) {
    for (const [geo, cor, alt, esc, [ox, oz], colorida] of TIPOS[tipo]) {
      const m = new THREE.InstancedMesh(geo(), balancar(matPlano(cor), alt - .6, tipo === 'emergente' ? .6 : tipo === 'arbusto' ? 2.2 : 1), arr.length);
      m.castShadow = sombra && tipo !== 'arbusto'; m.receiveShadow = true;
      arr.forEach((a, i) => {
        q.setFromAxisAngle(up, a.rot);
        const cos = Math.cos(a.rot), sin = Math.sin(a.rot);
        P.set(a.x + (ox * cos + oz * sin) * a.e, a.y + alt * a.e, a.z + (-ox * sin + oz * cos) * a.e);
        S.set(esc[0] * a.e, esc[1] * a.e, esc[2] * a.e);
        m.setMatrixAt(i, M.compose(P, q, S));
        if (colorida) m.setColorAt(i, c.setHex(a.cor ?? CORES[tipo][i % CORES[tipo].length]).offsetHSL(0, 0, ((i * 7919) % 100) / 100 * .08 - .04));
      });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      g.add(m);
    }
  }
  return g;
}

// Coqueiros: tronco inclinado, 6 folhas e 3 cocos. Tres InstancedMesh ao todo
// (antes eram ~490 objetos soltos, um desenho cada).
export function criarCoqueiros(lista) {
  const g = new THREE.Group(), n = lista.length;
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .13, 2.6, 6), balancar(matPlano(0x9a6b3c), .7, .8), n);
  const folha = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, .05, .34), balancar(matPlano(0xffffff), 2.6, 1.6), n * 6);
  const coco = new THREE.InstancedMesh(ico(.13), matPlano(0x5b3a1a), n * 3);
  for (const m of [tronco, folha, coco]) { m.castShadow = true; m.receiveShadow = true; }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), c = new THREE.Color();
  lista.forEach((p, i) => {
    const incl = p.incl ?? .18, dx = Math.sin(p.rot) * incl, dz = Math.cos(p.rot) * incl;
    const topo = new THREE.Vector3(p.x + dx * 2.6, p.y + 2.55, p.z + dz * 2.6);
    e.set(dz * .9, 0, -dx * .9); q.setFromEuler(e); P.set(p.x + dx * 1.3, p.y + 1.3, p.z + dz * 1.3);
    tronco.setMatrixAt(i, M.compose(P, q, S));
    for (let k = 0; k < 6; k++) {
      const a = p.rot + k * Math.PI / 3;
      e.set(0, -a, -.45, 'YXZ'); q.setFromEuler(e);
      P.set(topo.x + Math.cos(a) * .62, topo.y - .12, topo.z + Math.sin(a) * .62);
      folha.setMatrixAt(i * 6 + k, M.compose(P, q, S));
      folha.setColorAt(i * 6 + k, c.setHex(k % 2 ? 0x4c9a3c : 0x5fae45));
    }
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + p.rot; P.set(topo.x + Math.cos(a) * .16, topo.y - .22, topo.z + Math.sin(a) * .16); coco.setMatrixAt(i * 3 + k, M.compose(P, new THREE.Quaternion(), S)); }
  });
  folha.instanceColor.needsUpdate = true;
  g.add(tronco, folha, coco);
  return g;
}

// ---------------------------------------------------------------- macacos
// Pulam de copa em copa na mata fechada. 'copas' = [[x, y, z]] do topo de cada arvore.
function macaco() {
  const g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo);
  const pelo = 0x5b3a22, cara = 0xd9b48f;
  const peca = (geo, cor, x, y, z) => { const m = new THREE.Mesh(geo, matPlano(cor)); m.position.set(x, y, z); m.castShadow = true; return m; };
  const tronco = peca(ico(.22, 1), pelo, 0, .36, 0); tronco.scale.set(1, 1.25, .9); corpo.add(tronco);
  corpo.add(peca(ico(.17, 1), pelo, 0, .7, .04));
  const rosto = peca(new THREE.BoxGeometry(.18, .13, .06), cara, 0, .68, .17); corpo.add(rosto);
  for (const s of [-1, 1]) { corpo.add(peca(ico(.06), cara, s * .16, .74, .02)); corpo.add(peca(new THREE.BoxGeometry(.03, .03, .02), 0x111111, s * .045, .71, .2)); }
  const membro = (x, y, comp, grossa) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); const b = peca(new THREE.BoxGeometry(grossa, comp, grossa), pelo, 0, -comp / 2, 0); pv.add(b); corpo.add(pv); return pv; };
  const bracos = [membro(-.2, .52, .42, .07), membro(.2, .52, .42, .07)];
  const pernas = [membro(-.1, .2, .3, .08), membro(.1, .2, .3, .08)];
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .22, -.16), new THREE.Vector3(0, .1, -.42), new THREE.Vector3(0, .3, -.62), new THREE.Vector3(0, .58, -.55), new THREE.Vector3(0, .6, -.4)]);
  const rabo = new THREE.Mesh(new THREE.TubeGeometry(curva, 12, .03, 5), matPlano(pelo)); rabo.castShadow = true; corpo.add(rabo);
  g.userData = { bracos, pernas, rabo, corpo };
  return g;
}

export function criarMacacos(copas, quantos = 8) {
  const g = new THREE.Group(), lista = [];
  if (copas.length < 12) return { grupo: g, atualizar() {} };
  // vizinhas de cada copa (entre 3 e 8 de distancia) por grade de hash
  const cel = 8, mapa = new Map(), chave = (x, z) => Math.floor(x / cel) + ',' + Math.floor(z / cel);
  copas.forEach((c, i) => { const k = chave(c[0], c[2]); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(i); });
  const viz = copas.map(c => {
    const out = [], ci = Math.floor(c[0] / cel), cj = Math.floor(c[2] / cel);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const j of mapa.get((ci + di) + ',' + (cj + dj)) || []) {
      const d = Math.hypot(copas[j][0] - c[0], copas[j][2] - c[2]);
      if (d > 3 && d < 8 && Math.abs(copas[j][1] - c[1]) < 3) out.push(j);
    }
    return out;
  });
  const boas = copas.map((_, i) => i).filter(i => viz[i].length >= 2);
  for (let k = 0; k < Math.min(quantos, boas.length); k++) {
    const m = macaco(), atual = boas[Math.floor(Math.random() * boas.length)];
    m.position.set(...copas[atual]); m.rotation.y = Math.random() * 6.28; g.add(m);
    lista.push({ m, atual, estado: 'sentado', espera: 1 + Math.random() * 5, t: 0 });
  }
  function atualizar(dt, t) {
    for (const s of lista) {
      const u = s.m.userData;
      u.rabo.rotation.y = Math.sin(t * 1.3 + s.atual) * .25;
      if (s.estado === 'sentado') {
        s.espera -= dt;
        u.corpo.rotation.y = Math.sin(t * .6 + s.atual) * .5;              // olhando em volta
        u.bracos.forEach((b, i) => b.rotation.x = -.3 + Math.sin(t * 2 + i) * .08);
        u.pernas.forEach(p => p.rotation.x = -1.2);
        if (s.espera <= 0 && viz[s.atual].length) {
          const prox = viz[s.atual][Math.floor(Math.random() * viz[s.atual].length)];
          const a = copas[s.atual], b = copas[prox], d = Math.hypot(b[0] - a[0], b[2] - a[2]);
          Object.assign(s, { estado: 'pulando', de: a, para: b, prox, t: 0, dur: .55 + d * .07, alto: 1.2 + d * .28 });
          s.m.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]); u.corpo.rotation.y = 0;
        }
      } else {
        s.t += dt; const f = Math.min(1, s.t / s.dur);
        s.m.position.set(s.de[0] + (s.para[0] - s.de[0]) * f, s.de[1] + (s.para[1] - s.de[1]) * f + 4 * s.alto * f * (1 - f), s.de[2] + (s.para[2] - s.de[2]) * f);
        u.bracos.forEach(b => b.rotation.x = -2.7);                         // bracos esticados pra frente
        u.pernas.forEach(p => p.rotation.x = .6);
        if (f >= 1) { s.atual = s.prox; s.estado = 'sentado'; s.espera = 1.5 + Math.random() * 6; }
      }
    }
  }
  return { grupo: g, atualizar };
}
