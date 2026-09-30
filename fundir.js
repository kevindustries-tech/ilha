// Fundir pecas paradas. Cada casa, bicho e navio e montado com dezenas de caixas e
// cilindros -- e cada um vira uma chamada de desenho (duas, contando a sombra). No
// celular e isso que pesa. Aqui as pecas paradas de um grupo viram UMA malha com cor
// por vertice; o que mexe (pas do moinho, patas, rabo, chama) fica de fora.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Janelas: um material so pra ilha inteira, que acende a noite (a cena ajusta o brilho).
export const JANELA = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb347, emissiveIntensity: .05, flatShading: true, roughness: .6 });
const COR_JANELA = new Set([0xffe08a, 0x8ed0ff]);
const matFundido = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .9 });

// pode entrar na fusao? (material simples, opaco, sem textura, sem brilho proprio)
function simples(o) {
  const m = o.material;
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !m || Array.isArray(m) || !m.isMeshStandardMaterial) return false;
  if (m.transparent || m.map || m.vertexColors || m.side !== THREE.FrontSide) return false;
  if (m.emissive && m.emissive.getHex() !== 0 && m.emissiveIntensity > 0) return false;
  return true;
}

// materialProprio: pra quem muda o proprio material depois (os desbloqueaveis viram
// silhueta transparente). Com o material compartilhado, a ilha inteira ficaria transparente.
export function fundirEstatico(g, { materialProprio = false } = {}) {
  // o que mexe fica de fora: qualquer coisa com nome, patas/bracos listados no userData
  const fora = new Set();
  for (const k of ['legs', 'legs2', 'bracos', 'pernas']) for (const p of g.userData[k] || []) fora.add(p);
  g.traverse(o => { if (o !== g && o.name) fora.add(o); });
  const excluido = o => { for (let p = o; p && p !== g; p = p.parent) if (fora.has(p)) return true; return false; };

  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), M = new THREE.Matrix4();
  const baldes = { normal: [], janela: [] }, sair = [], caixas = [];
  g.traverse(o => {
    if (!o.isMesh || excluido(o)) return;
    const janela = o.material && o.material.color && COR_JANELA.has(o.material.color.getHex());
    if (!janela && !simples(o)) return;
    M.multiplyMatrices(inv, o.matrixWorld);
    let geo = o.geometry.clone().applyMatrix4(M);
    if (geo.index) geo = geo.toNonIndexed();
    for (const nome of Object.keys(geo.attributes)) if (nome !== 'position' && nome !== 'normal') geo.deleteAttribute(nome);
    if (!janela) {
      const c = o.material.color, n = geo.attributes.position.count, cores = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    }
    geo.computeBoundingBox(); caixas.push(geo.boundingBox.clone());   // pra rota dos moradores
    baldes[janela ? 'janela' : 'normal'].push(geo); sair.push(o);
  });
  if (sair.length < 3) return g;
  for (const o of sair) o.parent.remove(o);
  for (const [tipo, geos] of Object.entries(baldes)) {
    if (!geos.length) continue;
    const m = new THREE.Mesh(mergeGeometries(geos), tipo === 'janela' ? (materialProprio ? JANELA.clone() : JANELA) : (materialProprio ? matFundido.clone() : matFundido));
    m.castShadow = m.receiveShadow = true; m.userData.fundido = true; g.add(m);
  }
  g.userData.caixas = caixas;
  return g;
}
