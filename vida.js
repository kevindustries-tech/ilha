// Vida da ilha e do mar: bichos novos (onca-pintada, tamandua, anta, tatu, jacare,
// garca, caranguejo), araras voando, cardumes, peixe pulando, baleias e os navios
// que passam la no horizonte. Low-poly, montado por codigo, sem arquivo externo.
import * as THREE from 'three';
import { fundirEstatico } from './fundir.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9, ...extra });
function box(w, h, d, cor, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(cor)); m.position.set(x, y, z); m.castShadow = true; return m; }
function bola(r, cor, x = 0, y = 0, z = 0, det = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, det), mat(cor)); m.position.set(x, y, z); m.castShadow = true; return m; }
function pata(g, x, y, z, comp, larg, cor) { const pv = new THREE.Group(); pv.position.set(x, y, z); pv.add(box(larg, comp, larg, cor, 0, -comp / 2, 0)); g.add(pv); return pv; }

// ---------------------------------------------------------------- bichos de terra
// Todos de frente pra +z (e pra onde a cena gira quem anda). userData.legs/legs2 = pares
// de patas que balancam em oposicao.
export const CONSTRUTORES = {
  onca(cfg) {
    const g = new THREE.Group(), amarelo = 0xd9a13b, preto = 0x2a2016;
    const corpo = box(.46, .42, 1.15, amarelo, 0, .62, 0); g.add(corpo);
    g.add(box(.4, .34, .38, amarelo, 0, .78, .7));                      // cabeca
    g.add(box(.26, .18, .16, 0xe8c58a, 0, .7, .92));                     // focinho
    g.add(box(.08, .06, .04, preto, 0, .76, 1.0));
    for (const s of [-1, 1]) { g.add(bola(.08, amarelo, s * .15, 1.0, .64)); g.add(box(.05, .05, .02, 0x1f1a10, s * .1, .86, .9)); }
    // rosetas: pintas escuras espalhadas pelo corpo (sempre as mesmas pra cada onca)
    let seed = cfg.semente || 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const lado = rnd() < .5 ? -1 : 1, topo = rnd() < .35;
      const p = box(.09, .09, .09, preto, topo ? (rnd() - .5) * .36 : lado * .235, topo ? .84 : .5 + rnd() * .26, (rnd() - .5) * 1.0);
      g.add(p);
    }
    const L = [pata(g, -.15, .45, .4, .44, .12, amarelo), pata(g, .15, .45, .4, .44, .12, amarelo), pata(g, -.15, .45, -.4, .44, .12, amarelo), pata(g, .15, .45, -.4, .44, .12, amarelo)];
    const rabo = new THREE.Group(); rabo.position.set(0, .7, -.58); rabo.name = 'rabo';
    const r1 = box(.08, .08, .8, amarelo, 0, -.1, -.35); r1.rotation.x = .35; rabo.add(r1); rabo.add(box(.09, .09, .14, preto, 0, -.24, -.72)); g.add(rabo);
    g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
    return g;
  },
  tamandua() {
    const g = new THREE.Group(), cinza = 0x8a8278, escuro = 0x2b2622;
    g.add(box(.42, .42, .95, cinza, 0, .58, 0));
    const faixa = box(.44, .12, .5, escuro, 0, .66, .12); faixa.rotation.x = .5; g.add(faixa);
    g.add(box(.2, .2, .3, cinza, 0, .6, .58));
    const focinho = new THREE.Mesh(new THREE.CylinderGeometry(.04, .09, .7, 6), mat(cinza)); focinho.rotation.x = Math.PI / 2 + .25; focinho.position.set(0, .5, 1.02); g.add(focinho);
    const cauda = box(.1, .45, .8, 0x6d665e, 0, .7, -.7); cauda.rotation.x = -.4; g.add(cauda);   // cauda de vassoura
    const L = [pata(g, -.14, .4, .32, .4, .12, escuro), pata(g, .14, .4, .32, .4, .12, escuro), pata(g, -.14, .4, -.32, .4, .12, cinza), pata(g, .14, .4, -.32, .4, .12, cinza)];
    g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
    return g;
  },
  anta() {
    const g = new THREE.Group(), cor = 0x4a4541;
    const c = bola(.5, cor, 0, .72, 0); c.scale.set(.9, .85, 1.5); g.add(c);
    g.add(box(.36, .36, .42, cor, 0, .8, .72));
    const tromba = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, .28, 6), mat(0x3a3532)); tromba.rotation.x = 1.9; tromba.position.set(0, .7, 1.0); g.add(tromba);
    for (const s of [-1, 1]) g.add(box(.08, .12, .04, 0xd8d0c8, s * .13, 1.02, .6));   // ponta branca da orelha
    const L = [pata(g, -.2, .5, .42, .5, .15, cor), pata(g, .2, .5, .42, .5, .15, cor), pata(g, -.2, .5, -.42, .5, .15, cor), pata(g, .2, .5, -.42, .5, .15, cor)];
    g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
    return g;
  },
  tatu() {
    const g = new THREE.Group(), casco = 0xa08a6a;
    for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .12, 8, 1, false, 0, Math.PI), mat(i % 2 ? casco : 0x8f7a5c)); f.rotation.z = Math.PI / 2; f.rotation.y = Math.PI / 2; f.position.set(0, .2, -.24 + i * .12); f.castShadow = true; g.add(f); }
    g.add(box(.14, .12, .2, 0xb89f7c, 0, .16, .38));
    const cauda = box(.05, .05, .3, casco, 0, .12, -.46); cauda.rotation.x = .3; g.add(cauda);
    const L = [pata(g, -.12, .1, .2, .1, .06, 0x6e5e48), pata(g, .12, .1, .2, .1, .06, 0x6e5e48), pata(g, -.12, .1, -.2, .1, .06, 0x6e5e48), pata(g, .12, .1, -.2, .1, .06, 0x6e5e48)];
    g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
    return g;
  },
  jacare() {
    const g = new THREE.Group(), cor = 0x4b5e34, barriga = 0x9aa36a;
    g.add(box(.5, .22, 1.3, cor, 0, .2, 0)); g.add(box(.46, .06, 1.2, barriga, 0, .08, 0));
    for (let i = 0; i < 6; i++) g.add(box(.06, .06, .08, 0x3a4a28, (i % 2 ? .12 : -.12), .33, -.5 + i * .2));
    g.add(box(.34, .16, .7, cor, 0, .2, .95));                               // focinho comprido
    for (const s of [-1, 1]) g.add(box(.07, .07, .07, 0xd4c35a, s * .12, .31, .7));
    const cauda = new THREE.Group(); cauda.position.set(0, .18, -.65); cauda.name = 'rabo';
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(.02, .2, 1.3, 5), mat(cor)); c1.rotation.x = -Math.PI / 2; c1.position.z = -.62; cauda.add(c1); g.add(cauda);
    const L = [pata(g, -.3, .16, .4, .16, .09, cor), pata(g, .3, .16, .4, .16, .09, cor), pata(g, -.3, .16, -.4, .16, .09, cor), pata(g, .3, .16, -.4, .16, .09, cor)];
    L.forEach(l => l.rotation.z = 0);
    g.userData.legs = [L[0], L[3]]; g.userData.legs2 = [L[1], L[2]];
    return g;
  },
  garca() {
    const g = new THREE.Group(), branco = 0xf4f4f0;
    const c = bola(.22, branco, 0, 1.0, 0); c.scale.set(.8, .8, 1.3); g.add(c);
    const pesc = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .5, 5), mat(branco)); pesc.position.set(0, 1.32, .16); pesc.rotation.x = .35; g.add(pesc);
    g.add(bola(.08, branco, 0, 1.58, .24));
    const bico = new THREE.Mesh(new THREE.ConeGeometry(.025, .28, 4), mat(0xe0b020)); bico.rotation.x = Math.PI / 2; bico.position.set(0, 1.57, .42); g.add(bico);
    const L = [pata(g, -.06, .82, 0, .82, .025, 0x2b2b2b), pata(g, .06, .82, 0, .82, .025, 0x2b2b2b)];
    g.userData.legs = [L[0]]; g.userData.legs2 = [L[1]];
    return g;
  },
  caranguejo() {
    const g = new THREE.Group(), cor = 0xd2452e;
    const c = bola(.12, cor, 0, .1, 0); c.scale.set(1.4, .55, 1); g.add(c);
    for (const s of [-1, 1]) { g.add(box(.08, .06, .06, cor, s * .2, .12, .1)); g.add(box(.03, .08, .03, 0x111111, s * .05, .2, .06)); for (let k = 0; k < 3; k++) { const p = box(.12, .025, .025, cor, s * .2, .06, -.06 + k * .06); p.rotation.z = s * -.5; g.add(p); } }
    g.userData.deLado = true;   // anda de lado DE PROPOSITO -- esse e o unico que pode
    return g;
  },
};

// ---------------------------------------------------------------- araras voando sobre a mata
export function criarAraras(centro, raio = 30) {
  const g = new THREE.Group(), bandos = [];
  const cores = [[0xd62828, 0x1d4ed8, 0xf2c230], [0x1d6fd8, 0xf2c230, 0x2d9d4a], [0xd62828, 0x2d9d4a, 0x1d4ed8]];
  for (let b = 0; b < 3; b++) {
    const bando = new THREE.Group(); g.add(bando);
    for (let i = 0; i < 4; i++) {
      const [c1, c2, c3] = cores[(b + i) % 3], ave = new THREE.Group();
      const corpo = box(.14, .14, .5, c1, 0, 0, 0); ave.add(corpo);
      ave.add(box(.05, .03, .5, c3, 0, 0, -.45));                         // cauda comprida
      const asaE = new THREE.Group(), asaD = new THREE.Group();
      asaE.add(box(.55, .03, .22, c2, -.28, 0, 0)); asaD.add(box(.55, .03, .22, c2, .28, 0, 0));
      ave.add(asaE, asaD); ave.userData = { asaE, asaD, dx: (i % 2 ? 1 : -1) * (.8 + i * .5), dz: -i * .9, fase: i };
      bando.add(ave);
    }
    bando.userData = { r: raio * (.6 + b * .25), v: .12 + b * .03, fase: b * 2.1, y: 16 + b * 3 };
    bandos.push(bando);
  }
  return {
    grupo: g,
    atualizar(t) {
      for (const bd of bandos) {
        const u = bd.userData, a = t * u.v + u.fase;
        bd.position.set(centro[0] + Math.cos(a) * u.r, u.y + Math.sin(t * .7 + u.fase) * 1.5, centro[1] + Math.sin(a) * u.r);
        bd.rotation.y = -a;
        for (const ave of bd.children) { const w = Math.sin(t * 11 + ave.userData.fase) * .7; ave.position.set(ave.userData.dx, Math.sin(t * 2 + ave.userData.fase) * .25, ave.userData.dz); ave.userData.asaE.rotation.z = w; ave.userData.asaD.rotation.z = -w; }
      }
    },
  };
}

// ---------------------------------------------------------------- mar: cardumes, peixe pulando, baleias
// 'pontosRasos' = [[x, z]] de agua rasa perto da praia (onde da pra ver o fundo).
export function criarVidaMarinha(pontosRasos, R_ILHA, qtdBaleias = 3) {
  const g = new THREE.Group();
  // CARDUMES: todos os peixes numa InstancedMesh so, cada cardume girando em volta do seu ponto
  const CORES = [0xff8c2a, 0xf2d13b, 0x3aa0e8, 0xe85a8a, 0x7ad35a];
  const cardumes = pontosRasos.map(([x, z], i) => ({ x, z, r: 2 + (i % 3), v: .5 + (i % 4) * .15, n: 7 + (i % 4), cor: CORES[i % CORES.length], sent: i % 2 ? 1 : -1 }));
  const total = cardumes.reduce((s, c) => s + c.n, 0);
  const geoPeixe = new THREE.ConeGeometry(.12, .5, 5); geoPeixe.rotateX(Math.PI / 2);   // ponta pra +z
  const peixes = new THREE.InstancedMesh(geoPeixe, mat(0xffffff), total);
  const c = new THREE.Color(); let k = 0;
  for (const cd of cardumes) for (let i = 0; i < cd.n; i++) peixes.setColorAt(k++, c.setHex(cd.cor).offsetHSL(0, 0, (i % 3) * .04));
  peixes.instanceColor.needsUpdate = true; g.add(peixes);
  // PEIXE PULANDO: um de vez em quando salta fora d'agua perto da praia, com respingo
  const saltador = new THREE.Mesh(new THREE.ConeGeometry(.16, .6, 5).rotateX(Math.PI / 2), mat(0xc0c8d0, { metalness: .3, roughness: .4 })); g.add(saltador);
  const respingo = new THREE.Mesh(new THREE.RingGeometry(.3, .7, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  respingo.rotation.x = -Math.PI / 2; g.add(respingo);
  let pulo = { t: 99, dur: 1.1, de: [0, 0], para: [0, 0] };
  // BALEIAS: nadam longe, em circulos grandes; sobem pra respirar (esguicho) e mergulham mostrando a cauda
  const baleias = [];
  for (let i = 0; i < qtdBaleias; i++) {
    const b = new THREE.Group(), cor = 0x3a4a5e, barriga = 0xc9d3dd;
    const corpo = bola(1, cor, 0, 0, 0, 1); corpo.scale.set(1.5, 1.15, 4.6); b.add(corpo);
    const bar = bola(1, barriga, 0, -.35, .6, 1); bar.scale.set(1.2, .7, 3.3); b.add(bar);
    for (const s of [-1, 1]) { const n = box(1.6, .12, .6, cor, s * 1.6, -.4, 1.4); n.rotation.z = s * -.35; b.add(n); }
    const cauda = new THREE.Group(); cauda.position.set(0, 0, -4.2); cauda.name = 'cauda';
    cauda.add(box(.6, .5, 1.6, cor, 0, 0, -.6));
    for (const s of [-1, 1]) { const f = box(1.8, .12, .9, cor, s * .9, 0, -1.5); f.rotation.y = s * .35; cauda.add(f); }
    b.add(cauda);
    const esguicho = new THREE.Group(); esguicho.position.set(0, 1.2, 2.2);
    for (let e = 0; e < 8; e++) { const gota = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false })); gota.userData.fase = e / 8; esguicho.add(gota); }
    b.add(esguicho); fundirEstatico(b); b.scale.setScalar(1.3);
    // alem do arquipelago (as vizinhas ficam ate ~R_ILHA*2,3 do centro) e aquem dos navios
    b.userData = { r: R_ILHA * 2.45 + i * 45, a: i * 2.1, v: (.012 + i * .003) * (i % 2 ? 1 : -1), ciclo: 26 + i * 7, fase: i * 9, cauda, esguicho };
    g.add(b); baleias.push(b);
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function atualizar(t, dt) {
    let k = 0;
    for (const cd of cardumes) for (let i = 0; i < cd.n; i++) {
      const a = cd.sent * t * cd.v + i * (6.28 / cd.n) + Math.sin(t * .5 + i) * .25, rr = cd.r + Math.sin(t * .8 + i * 1.7) * .6;
      P.set(cd.x + Math.cos(a) * rr, -.55 - (i % 3) * .18, cd.z + Math.sin(a) * rr);
      q.setFromAxisAngle(up, -a + (cd.sent > 0 ? Math.PI : 0));      // de frente pro sentido da volta
      peixes.setMatrixAt(k++, M.compose(P, q, S));
    }
    peixes.instanceMatrix.needsUpdate = true;
    // peixe pulando
    pulo.t += dt;
    if (pulo.t > pulo.dur + 3 + Math.random() * 4 && pontosRasos.length) {
      const [x, z] = pontosRasos[Math.floor(Math.random() * pontosRasos.length)], a = Math.random() * 6.28;
      pulo = { t: 0, dur: 1.0 + Math.random() * .4, de: [x, z], para: [x + Math.cos(a) * 2.5, z + Math.sin(a) * 2.5] };
    }
    const f = Math.min(1, pulo.t / pulo.dur), no_ar = pulo.t <= pulo.dur;
    saltador.visible = no_ar;
    if (no_ar) {
      const x = pulo.de[0] + (pulo.para[0] - pulo.de[0]) * f, z = pulo.de[1] + (pulo.para[1] - pulo.de[1]) * f;
      saltador.position.set(x, -.3 + 4 * 1.6 * f * (1 - f), z);
      saltador.rotation.set(-(f - .5) * 2.2, Math.atan2(pulo.para[0] - pulo.de[0], pulo.para[1] - pulo.de[1]), 0, 'YXZ');
    }
    const rf = no_ar ? (f < .5 ? f * 2 : (f - .5) * 2) : 1, rp = f < .5 ? pulo.de : pulo.para;
    respingo.position.set(rp[0], .08, rp[1]); respingo.scale.setScalar(1 + rf * 2); respingo.material.opacity = no_ar ? .6 * (1 - rf) : 0;
    // baleias
    for (const b of baleias) {
      const u = b.userData; u.a += u.v * dt;
      b.position.x = Math.cos(u.a) * u.r; b.position.z = Math.sin(u.a) * u.r;
      b.rotation.y = -u.a + (u.v > 0 ? 0 : Math.PI);
      const ciclo = ((t + u.fase) % u.ciclo) / u.ciclo;          // 0..1: nada, sobe, respira, mergulha
      let y = -4, incl = 0, rabo = 0, jato = 0;
      if (ciclo > .55 && ciclo < .75) { const s = (ciclo - .55) / .2; y = -4 + Math.sin(s * Math.PI * .5) * 4.3; jato = s > .5 ? 1 : 0; }
      else if (ciclo >= .75 && ciclo < .92) { const s = (ciclo - .75) / .17; y = .3 - s * 5; incl = s * .9; rabo = s; }
      b.position.y = y; b.rotation.x = incl; u.cauda.rotation.x = -rabo * .9 + Math.sin(t * 1.6) * .15;
      u.esguicho.visible = jato > 0;
      if (jato) for (const gota of u.esguicho.children) { const s = (t * 1.3 + gota.userData.fase) % 1; gota.position.set(Math.sin(gota.userData.fase * 20) * s * .8, s * 4.5, Math.cos(gota.userData.fase * 20) * s * .5); gota.scale.setScalar(.6 + s); gota.material.opacity = .75 * (1 - s); }
    }
  }
  return { grupo: g, atualizar };
}

// ---------------------------------------------------------------- navios no horizonte
// Passam bem longe, quase na borda do mar. Pro sobrevivente e isso: ver o navio passar
// e continuar construindo.
function navioDe(tipo) {
  const g = new THREE.Group();
  if (tipo === 'cargueiro') {
    g.add(box(6, 2.4, 34, 0x8b2a2a, 0, 1.2, 0)); g.add(box(6.1, .6, 34.2, 0x1f2937, 0, 2.6, 0));
    const cores = [0x2563eb, 0xf59e0b, 0x16a34a, 0xdc2626, 0x9333ea];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) g.add(box(2.6, 1.6, 2.8, cores[(i * 2 + j) % 5], -1.4 + j * 2.8, 3.7 + (i % 3 === 0 ? 1.6 : 0) * 0, -12 + i * 2.9));
    g.add(box(5, 4.5, 4, 0xf1f1f1, 0, 5, 14)); g.add(box(1, 3, 1, 0x333333, 0, 8.8, 14.5));
  } else if (tipo === 'veleiro') {
    g.add(box(2.2, 1.2, 9, 0xf5f5f5, 0, .6, 0)); g.add(box(.2, 11, .2, 0x8b5a2b, 0, 6.5, .5));
    const vela = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.4, .6), new THREE.Vector3(0, 11.5, .6), new THREE.Vector3(0, 1.4, 4.4)]), mat(0xffffff, { side: THREE.DoubleSide }));
    vela.geometry.computeVertexNormals(); g.add(vela);
  } else if (tipo === 'pesqueiro') {
    g.add(box(3.2, 1.8, 11, 0x1e6fb0, 0, .9, 0)); g.add(box(2.6, 2.2, 3.2, 0xf1f1f1, 0, 2.9, 2.2));
    g.add(box(.2, 6, .2, 0x444444, 0, 4.5, -2)); const lanca = box(.12, .12, 5, 0x444444, 0, 6, -3.8); lanca.rotation.x = .5; g.add(lanca);
  } else {   // transatlantico
    g.add(box(7, 3, 42, 0xf8f8f8, 0, 1.5, 0)); g.add(box(7.1, .8, 42.2, 0x1e3a5f, 0, .4, 0));
    for (let d = 0; d < 3; d++) g.add(box(6 - d, 1.6, 30 - d * 6, 0xffffff, 0, 3.8 + d * 1.6, -2 + d * 1.5));
    for (const z of [-4, 4]) { g.add(box(1.8, 3.2, 2.6, 0xd62828, 0, 9.2, z)); g.add(box(1.9, .8, 2.7, 0x111111, 0, 11.1, z)); }
  }
  fundirEstatico(g);
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
export function criarNavios(raioMin = 470) {
  const g = new THREE.Group(), lista = [];
  const tipos = ['cargueiro', 'veleiro', 'transatlantico', 'pesqueiro', 'cargueiro', 'veleiro'];
  tipos.forEach((tipo, i) => {
    const n = navioDe(tipo); g.add(n);
    lista.push({ n, r: raioMin + (i % 3) * 55, a: i * 1.05 + .3, v: (tipo === 'veleiro' ? .0045 : tipo === 'pesqueiro' ? .005 : .0035) * (i % 2 ? 1 : -1) });
  });
  return {
    grupo: g,
    atualizar(t, dt) {
      for (const s of lista) {
        s.a += s.v * dt;
        s.n.position.set(Math.cos(s.a) * s.r, Math.sin(t * .5 + s.a * 10) * .25 - .2, Math.sin(s.a) * s.r);
        s.n.rotation.y = -s.a + (s.v > 0 ? 0 : Math.PI);            // proa no sentido da viagem
        s.n.rotation.z = Math.sin(t * .6 + s.a * 7) * .03;
      }
    },
  };
}
