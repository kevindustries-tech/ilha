// Agua da ilha: mar (onda, agua rasa turquesa, espuma na beira), rio e cachoeira
// com correnteza, nevoa no pe da queda. O mar era animado no JS -- 12 mil vertices
// recalculados e normais refeitas todo quadro. Agora a onda e o vertex shader.
import * as THREE from 'three';

export const tempoAgua = { value: 0 };

// costaEm() do terreno, em GLSL. Tem que ser a MESMA formula, senao a agua rasa
// nao acompanha a praia.
const GLSL_COSTA = `
  float costaEm(float a, float R) {
    return R * (1.0 + sin(a * 2.0) * .14 + sin(a * 3.3) * .085 + sin(a * 5.1) * .05 + sin(a * 7.7) * .028);
  }`;

// ilhas: [[x, z, raio]] das ilhas vizinhas (agua rasa em volta delas tambem)
export function criarMar(R_ILHA, ilhas = []) {
  const geo = new THREE.PlaneGeometry(1500, 1500, 250, 250); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: .32, metalness: .12, transparent: true });
  const lista = Array.from({ length: 10 }, (_, i) => ilhas[i] ? new THREE.Vector4(ilhas[i][0], ilhas[i][1], ilhas[i][2], 1) : new THREE.Vector4(0, 0, 0, 0));
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {
      uTempo: tempoAgua, uR: { value: R_ILHA }, uIlhas: { value: lista },
      uFundo: { value: new THREE.Color(0x1f6fb5) }, uRaso: { value: new THREE.Color(0x3fd6c6) },
    });
    sh.vertexShader = 'uniform float uTempo;\nvarying vec3 vMundo;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = modelMatrix * vec4(transformed, 1.0);
      transformed.y += sin(wp.x * .21 + uTempo * 1.1) * .17 + sin(wp.z * .17 - uTempo * .8) * .15 + sin((wp.x + wp.z) * .085 + uTempo * .6) * .24;
      vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    // o '\n' depois da funcao e obrigatorio: sem ele o '}' gruda no '#define' que abre o
    // shader do Three, e diretiva no meio da linha nao compila (o mar sumia inteiro)
    sh.fragmentShader = 'uniform float uTempo;\nuniform float uR;\nuniform vec4 uIlhas[10];\nuniform vec3 uFundo;\nuniform vec3 uRaso;\nvarying vec3 vMundo;\n' + GLSL_COSTA + '\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float d = length(vMundo.xz) - costaEm(atan(vMundo.z, vMundo.x), uR);     // distancia ate a praia
      for (int i = 0; i < 10; i++) { vec4 il = uIlhas[i]; if (il.w > .5) d = min(d, length(vMundo.xz - il.xy) - il.z); }
      float raso = 1.0 - smoothstep(0.0, 28.0, d);
      diffuseColor.rgb = mix(uFundo, uRaso, raso * raso);
      // espuma: faixa quebrando na beira + ondinhas brancas indo e vindo
      float esp = (1.0 - smoothstep(0.0, 1.6, d)) * .7 + (1.0 - smoothstep(-.5, 5.0, d)) * max(0.0, sin(d * 2.1 - uTempo * 1.7)) * .55;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.96, .99, 1.0), clamp(esp, 0.0, 1.0) * .85);
      diffuseColor.a = mix(.95, .66, raso);                                     // rasinho da pra ver o fundo`);
  };
  mat.customProgramCacheKey = () => 'marIlha';
  const mar = new THREE.Mesh(geo, mat); mar.receiveShadow = true; mar.renderOrder = 1;
  return mar;
}

// Textura de correnteza: riscos brancos num azul, repetindo. Rolar o offset da
// textura e o que faz a agua "andar" -- barato e funciona em qualquer celular.
function texturaCorrente(base, risco, n, largRisco) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = .25 + Math.random() * .55; g.fillStyle = risco;
    const x = Math.random() * 64, y = Math.random() * 256, w = 1 + Math.random() * largRisco, h = 14 + Math.random() * 60;
    g.fillRect(x, y, w, h); g.fillRect(x, y - 256, w, h);   // repete na emenda
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function materialRio() {
  const map = texturaCorrente('#3aa6d8', '#e9f8ff', 70, 3);
  const m = new THREE.MeshStandardMaterial({ map, roughness: .25, metalness: .1, transparent: true, opacity: .92, side: THREE.DoubleSide });
  m.userData.rolar = [map, .55];
  return m;
}
export function materialCachoeira() {
  const map = texturaCorrente('#bfe6f7', '#ffffff', 120, 5);
  const m = new THREE.MeshStandardMaterial({ map, emissive: 0x6fa8c8, emissiveIntensity: .35, roughness: .2, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false });
  m.userData.rolar = [map, 1.7];
  return m;
}
export function materialLago(cor = 0x2f9fcf) {
  return new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: .18, metalness: .2, transparent: true, opacity: .88 });
}

// Nevoa e espuma no pe da cachoeira: bolhas brancas que sobem, crescem e somem.
export function criarNevoa(x, y, z, largura = 3) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const bolhas = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .4, roughness: 1, depthWrite: false }));
    m.userData = { fase: i / 16, dx: (Math.random() - .5) * largura * 2, dz: (Math.random() - .2) * 1.6 };
    g.add(m); bolhas.push(m);
  }
  const anel = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.6, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = .06; g.add(anel);
  g.userData.atualizar = t => {
    for (const b of bolhas) {
      const f = (t * .45 + b.userData.fase) % 1;
      b.position.set(b.userData.dx * (.4 + f * .6), f * 3.2, b.userData.dz + f * 1.2);
      b.scale.setScalar(.6 + f * 1.4); b.material.opacity = .45 * (1 - f);
    }
    const f = (t * .6) % 1; anel.scale.setScalar(1 + f * .9); anel.material.opacity = .55 * (1 - f);
  };
  return g;
}

export function atualizarAgua(t, dt, materiais) {
  tempoAgua.value = t;
  // v cresce no sentido da agua (nascente -> beira; topo -> pe da queda). O pixel em v
  // mostra a textura em v + offset: pra agua descer, o offset tem que DIMINUIR.
  for (const m of materiais) { const [map, vel] = m.userData.rolar; map.offset.y -= dt * vel; }
}
