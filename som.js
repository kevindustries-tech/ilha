// Sons da ilha: natureza e trilha, tudo sintetizado no navegador (Web Audio). Nenhum
// arquivo de audio -- nada pra baixar, nada de licenca, e funciona offline.
// Celular so deixa tocar depois de um toque na tela: iniciar() e chamado no primeiro toque.

let ctx = null, mestre = null, busNat = null, busMus = null, reverb = null, ruidoBranco = null, ruidoMarrom = null;
const camadas = {};                    // ganhos da natureza que a cena ajusta
let info = { hora: 12, sol: 1, fogueira: false, nevoa: false, distCachoeira: 999, distMar: 50 };
let pref = { natureza: true, musica: true };
try { Object.assign(pref, JSON.parse(localStorage.getItem('ilha.som') || '{}')); } catch {}

export const preferencias = () => ({ ...pref });
export const ligado = () => pref.natureza || pref.musica;
export function configurar(p) {
  Object.assign(pref, p);
  try { localStorage.setItem('ilha.som', JSON.stringify(pref)); } catch {}
  if (!ctx) { if (ligado()) iniciar(); return; }
  const t = ctx.currentTime;
  busNat.gain.setTargetAtTime(pref.natureza ? 1 : 0, t, .4);
  busMus.gain.setTargetAtTime(pref.musica ? .55 : 0, t, .4);
  if (ligado() && ctx.state === 'suspended') ctx.resume();
}

// ---------------------------------------------------------------- base
function bufferRuido(marrom) {
  const n = ctx.sampleRate * 3, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let ult = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (marrom) { ult = (ult + .02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w; }
  }
  return b;
}
function fonteRuido(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(ctx.currentTime + Math.random()); return s; }
function filtro(tipo, freq, q = .7) { const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q; return f; }
function ganho(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
function lfo(freq, amp, alvo) { const o = ctx.createOscillator(), g = ganho(amp); o.frequency.value = freq; o.connect(g).connect(alvo); o.start(); return o; }
function cadeia(...nos) { for (let i = 0; i < nos.length - 1; i++) nos[i].connect(nos[i + 1]); return nos[nos.length - 1]; }

function criarReverb(seg = 3.2) {
  const n = ctx.sampleRate * seg, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  const r = ctx.createConvolver(); r.buffer = b; return r;
}

export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  mestre = ganho(.8); mestre.connect(ctx.destination);
  busNat = ganho(pref.natureza ? 1 : 0); busNat.connect(mestre);
  busMus = ganho(pref.musica ? .55 : 0); busMus.connect(mestre);
  reverb = criarReverb(); const volReverb = ganho(.5); reverb.connect(volReverb).connect(busMus);
  ruidoBranco = bufferRuido(false); ruidoMarrom = bufferRuido(true);
  montarNatureza();
  setInterval(agendar, 100);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (ligado()) ctx.resume(); });
}

// ---------------------------------------------------------------- natureza continua
function montarNatureza() {
  // MAR: rumor grave que incha e recua (onda), mais um chiado de espuma quebrando
  camadas.mar = ganho(.2);
  cadeia(fonteRuido(ruidoMarrom), filtro('lowpass', 650), camadas.mar, busNat);
  lfo(.085, .1, camadas.mar.gain);
  camadas.espuma = ganho(.018);
  cadeia(fonteRuido(ruidoBranco), filtro('bandpass', 1700, .5), camadas.espuma, busNat);
  lfo(.085, .014, camadas.espuma.gain);
  // VENTO: faixa de ruido que passeia devagar pela frequencia
  const fv = filtro('bandpass', 520, .9); camadas.vento = ganho(.04);
  cadeia(fonteRuido(ruidoMarrom), fv, camadas.vento, busNat); lfo(.05, 260, fv.frequency);
  // CACHOEIRA: ruido cheio; o volume depende de quao perto a camera esta
  camadas.cachoeira = ganho(0);
  cadeia(fonteRuido(ruidoBranco), filtro('lowpass', 2300), filtro('highpass', 180), camadas.cachoeira, busNat);
  // FOGUEIRA: ronco baixinho (os estalos sao agendados)
  camadas.fogo = ganho(0);
  cadeia(fonteRuido(ruidoMarrom), filtro('lowpass', 220), camadas.fogo, busNat);
}

// a cena chama isso algumas vezes por segundo
export function atualizar(i) {
  if (i) info = i;
  if (!ctx) return;
  const t = ctx.currentTime, noite = info.sol < 0 ? Math.min(1, -info.sol * 3) : 0;
  const pertoMar = Math.max(.25, Math.min(1, 1.4 - info.distMar / 120));
  camadas.mar.gain.setTargetAtTime(.2 * pertoMar, t, .8);
  camadas.vento.gain.setTargetAtTime(info.nevoa ? .13 : .035 + noite * .02, t, 1.5);
  const c = Math.max(0, 1 - info.distCachoeira / 140);
  camadas.cachoeira.gain.setTargetAtTime(c * c * .35, t, .5);
  camadas.fogo.gain.setTargetAtTime(info.fogueira ? .05 : 0, t, 1);
}

// ---------------------------------------------------------------- eventos curtos da natureza
function nota(freq, ini, dur, { tipo = 'sine', vol = .1, destino = busMus, ataque = .005, pan = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ini); g.gain.linearRampToValueAtTime(vol, ini + ataque); g.gain.exponentialRampToValueAtTime(.0001, ini + dur);
  if (p) { p.pan.value = pan; o.connect(g).connect(p).connect(destino); } else o.connect(g).connect(destino);
  o.start(ini); o.stop(ini + dur + .05);
  return o;
}
function passaro(t0) {
  const base = 2300 + Math.random() * 1900, n = 2 + Math.floor(Math.random() * 5), pan = Math.random() * 1.6 - .8, trinado = Math.random() < .3;
  let t = t0;
  for (let i = 0; i < n; i++) {
    const f = base * (trinado ? 1 : .85 + Math.random() * .4), o = nota(f, t, trinado ? .05 : .11, { vol: .035, destino: busNat, pan });
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.35 : .72), t + (trinado ? .04 : .09));
    t += trinado ? .06 : .09 + Math.random() * .08;
  }
}
function grilo(t0, pan) {
  const f = 4300 + Math.random() * 300;
  for (let k = 0; k < 3; k++) nota(f, t0 + k * .035, .02, { vol: .018, destino: busNat, pan, ataque: .002 });
}
function estalo(t0) {
  const s = ctx.createBufferSource(), g = ctx.createGain(), hp = filtro('highpass', 1800 + Math.random() * 1500);
  s.buffer = ruidoBranco; g.gain.setValueAtTime(.06 + Math.random() * .08, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .015 + Math.random() * .03);
  s.connect(hp).connect(g).connect(busNat); s.start(t0, Math.random() * 2, .06);
}

// ---------------------------------------------------------------- trilha generativa
// Calma e esperancosa: pentatonica maior (nao tem nota "errada"), acordes que respiram
// devagar, kalimba por cima. De noite desce de registro e fica mais espacada.
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9];                                   // do re mi sol la
const DIA = [[48, [60, 64, 67, 74]], [45, [57, 60, 64, 67]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 69]]];     // C9 Am7 Fmaj7 G6
const NOITE = [[45, [57, 60, 64]], [41, [53, 57, 60, 64]], [48, [55, 60, 64]], [40, [55, 59, 64]]];             // Am Fmaj7 C Em
let proximoCompasso = 0, compasso = 0, ultimaNota = 72, proximoPassaro = 0, proximoGrilo = 0, proximoEstalo = 0;

function kalimba(freq, t, vol) {
  nota(freq, t, 1.6, { vol, destino: busMus, ataque: .004 });
  nota(freq * 5.4, t, .25, { vol: vol * .18, destino: busMus, ataque: .002 });  // parcial metalico da lamina
  const o = nota(freq, t, 1.6, { vol: vol * .5, destino: reverb, ataque: .004 }); o.detune.value = 4;
}
function pad(notas, t, dur, vol) {
  for (const m of notas) for (const [tipo, det] of [['triangle', -6], ['sine', 7]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = filtro('lowpass', 1100);
    o.type = tipo; o.frequency.value = MIDI(m); o.detune.value = det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur + 1.8);
    o.connect(lp).connect(g); g.connect(busMus); g.connect(reverb);
    o.start(t); o.stop(t + dur + 2);
  }
}
function compassoMusical(t) {
  const noite = info.sol < -.05, bpm = noite ? 60 : 72, batida = 60 / bpm, dur = batida * 8;
  const prog = noite ? NOITE : DIA, [baixo, acorde] = prog[Math.floor(compasso / 2) % prog.length];
  if (compasso % 2 === 0) { pad(acorde, t, dur * 2, noite ? .014 : .016); nota(MIDI(baixo - 12), t, dur * 1.6, { vol: .07, ataque: .4 }); }
  // melodia: frases de 4 compassos, a 5a pausa; anda mais por grau conjunto
  const frase = compasso % 5, dens = noite ? .18 : .32;
  if (frase < 4) for (let k = 0; k < 8; k++) {
    if (Math.random() > dens) continue;
    const passo = Math.random() < .7 ? (Math.random() < .5 ? 1 : -1) : (Math.random() < .5 ? 2 : -2);
    const graus = []; for (let o = noite ? 55 : 60; o <= (noite ? 76 : 86); o++) if (PENTA.includes(o % 12)) graus.push(o);
    let i = graus.indexOf(graus.reduce((a, b) => Math.abs(b - ultimaNota) < Math.abs(a - ultimaNota) ? b : a));
    i = Math.max(0, Math.min(graus.length - 1, i + passo)); ultimaNota = graus[i];
    kalimba(MIDI(ultimaNota), t + k * batida + (Math.random() - .5) * .02, noite ? .045 : .055);
  }
  compasso++;
  return dur;
}

function agendar() {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime, frente = t + .35;
  if (pref.musica && proximoCompasso < frente) proximoCompasso = Math.max(proximoCompasso, t + .05) + compassoMusical(Math.max(proximoCompasso, t + .05));
  if (!pref.natureza) return;
  const dia = info.sol > .05, noite = info.sol < -.05;
  if (dia && proximoPassaro < frente) { passaro(Math.max(proximoPassaro, t)); proximoPassaro = t + (info.nevoa ? 4 : 1.2) + Math.random() * 3.5; }
  if (noite && proximoGrilo < frente) { const p = Math.random() * 1.6 - .8; for (let k = 0; k < 3; k++) grilo(t + .05 + k * .16, p); proximoGrilo = t + .7 + Math.random() * 1.1; }
  if (noite && info.fogueira && proximoEstalo < frente) { estalo(Math.max(proximoEstalo, t)); proximoEstalo = t + .05 + Math.random() * .3; }
}

// ---------------------------------------------------------------- efeitos do jogo
export function tocar(evento) {
  if (!ctx || !pref.natureza && !pref.musica || ctx.state !== 'running') return;
  const t = ctx.currentTime + .02, dest = busNat;
  const seq = (notas, passo, vol, tipo = 'sine') => notas.forEach((m, i) => { nota(MIDI(m), t + i * passo, .6, { vol, destino: dest, tipo }); nota(MIDI(m), t + i * passo, .6, { vol: vol * .4, destino: reverb, tipo }); });
  if (evento === 'moeda') seq([88, 93], .07, .05);
  else if (evento === 'dia-perfeito') seq([72, 76, 79, 84, 88], .11, .06);
  else if (evento === 'obra') { seq([60, 64, 67, 72, 76, 79], .09, .055, 'triangle'); const s = ctx.createBufferSource(), g = ganho(.25), lp = filtro('lowpass', 180); s.buffer = ruidoMarrom; g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); s.connect(lp).connect(g).connect(dest); s.start(t, 0, .6); }
  else if (evento === 'marco') seq([67, 72, 76, 79, 84], .16, .065, 'triangle');
}
