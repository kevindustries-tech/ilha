// Previa do criador de personagem: o boneco girando num pedestal dentro do modal, com a
// mesma malha e a mesma recoloracao da ilha (makeChar). Tem renderer proprio; destruir()
// devolve o contexto WebGL -- celular tem poucos, e cada abertura do criador pede um.
import * as THREE from 'three';
import { loadChars, makeChar } from './chars.js';

export async function criarPreview(canvas) {
  const ok = await loadChars();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
  camera.position.set(0, 1.3, 5.4); camera.lookAt(0, .92, 0);
  scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x5a8a4a, 1.15));
  const sol = new THREE.DirectionalLight(0xffffff, 1.7); sol.position.set(2.5, 4, 3.5); scene.add(sol);
  const grama = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.05, .16, 30), new THREE.MeshStandardMaterial({ color: 0x5cb85c, flatShading: true, roughness: .9 }));
  grama.position.y = -.08; scene.add(grama);
  const areia = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.18, .12, 30), new THREE.MeshStandardMaterial({ color: 0xe8d9a0, flatShading: true, roughness: 1 }));
  areia.position.y = -.14; scene.add(areia);

  let boneco = null, giro = .5, arrastando = false, ultimoX = 0, vivo = true, raf = 0, antes = performance.now();
  function mostrar(skin, visual) {
    if (!ok) return;
    if (boneco) scene.remove(boneco);
    boneco = makeChar(skin, 1, visual); scene.add(boneco);
  }
  canvas.addEventListener('pointerdown', e => { arrastando = true; ultimoX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!arrastando) return; giro += (e.clientX - ultimoX) * .012; ultimoX = e.clientX; });
  const soltar = () => { arrastando = false; };
  canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);

  function quadro(agora) {
    if (!vivo) return;
    raf = requestAnimationFrame(quadro);
    const dt = Math.min((agora - antes) / 1000, .1); antes = agora;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (!arrastando) giro += dt * .55;                                   // gira sozinho devagar
    if (boneco) { boneco.rotation.y = giro; boneco.userData.char.update(dt); }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(quadro);
  return { ok, mostrar, destruir() { vivo = false; cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss(); } };
}
