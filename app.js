import { createScene, QUALIDADE } from './scene.js';
import { AVATARES } from './chars.js';
import * as S from './state.js';
import * as N from './nuvem.js';

const $ = s => document.querySelector(s);
const state = S.load();
const scene = createScene($('#c'));
const SIM = new URLSearchParams(location.search).get('sim');
const HORA = new URLSearchParams(location.search).get('hora');

// Salvar sempre passa por aqui: grava no aparelho na hora e agenda a copia na
// nuvem. O jogo nunca espera a rede.
function salvar() { S.save(state); N.agendarSubida(state, null, () => S.vitrine(state)); }

// AVISOS EM FILA. O toast antigo mostrava um so: quem chegasse por ultimo apagava o
// anterior no mesmo instante. Foi assim que o "+10 da Primeira semana" e o "terminou a
// obra" sumiram atras do "+1 moeda". Agora cada aviso espera o seu tempo; so um aviso
// do MESMO tipo substitui o outro (clicar rapido nao empilha tres "+1 moeda").
const filaAvisos = []; let avisoAtual = null, avisoTimer = 0;
function toast(msg, ms = 2600, tipo = 'aviso') {
  const i = filaAvisos.findIndex(x => x.tipo === tipo); if (i >= 0) filaAvisos.splice(i, 1);
  if (avisoAtual && avisoAtual.tipo === tipo) { clearTimeout(avisoTimer); avisoAtual = null; }
  filaAvisos.push({ msg, ms, tipo });
  if (!avisoAtual) proximoAviso();
}
function proximoAviso() {
  const t = $('#toast'), x = filaAvisos.shift();
  if (!x) { avisoAtual = null; t.style.opacity = 0; return; }
  avisoAtual = x; t.textContent = x.msg; t.style.opacity = 1;
  avisoTimer = setTimeout(proximoAviso, x.ms);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- render ----------
function render() {
  const iso = S.today();
  let tot = S.totals(state), c = S.coins(state), ps = S.perfectStreak(state);
  if (SIM !== null) { const n = +SIM; tot = { perfect: n, days: n, checks: n * state.habitos.length, por: Object.fromEntries(state.habitos.map(h => [h.id, n])) }; ps = n; c = n * 5; toast('Simulação: a ilha depois de ' + n + ' dias perfeitos', 4000); }
  $('#gold').innerHTML = c < 0 ? `${c} <small>devendo</small>` : `${c} <small>moedas</small>`;
  $('#gold').classList.toggle('debt', c < 0);
  $('#streak').innerHTML = `🔥 ${ps} <small>${ps === 1 ? 'dia' : 'dias'}</small>${S.shields(state) > 0 ? ` 🛡️${S.shields(state)}` : ''}`;
  // botoes de habitos
  const grid = $('#habits'); grid.style.gridTemplateColumns = `repeat(${Math.min(Math.max(state.habitos.length, 1), 3)}, 1fr)`;
  grid.innerHTML = state.habitos.map(h => {
    const on = S.checked(state, iso, h.id), folga = S.folgaHoje(state, h.id), due = S.isDue(h, iso), ok = S.dayDone(state, iso, h.id);
    const st = S.habitStreak(state, h.id);
    const sub = folga ? 'folga hoje' : !due ? 'hoje não' : h.tipo === 'semana' ? (S.descreveFreq(h) + (ok && !on ? ' · no prazo' : '')) : `${st} ${st === 1 ? 'dia seguido' : 'dias seguidos'}`;
    return `<div class="hab ${on ? 'on' : ''} ${folga ? 'rest' : ''} ${!due && !on ? 'off' : ''}" data-h="${h.id}"><div class="ico">${h.icone}</div><div class="nm">${esc(h.nome)}</div><div class="st">${sub}</div></div>`;
  }).join('');
  grid.querySelectorAll('.hab').forEach(el => el.onclick = () => clickHabit(el.dataset.h));
  // Recursos: cada habito cumprido = 1 material. Nenhum habito constroi uma obra especifica.
  // A cena desenha a partir de uma vitrine (so numeros): a minha, ou a do amigo visitado.
  const obras = S.obrasEm(tot.checks);
  const vt = S.vitrine(state, iso);
  if (SIM !== null) Object.assign(vt, { perfeitos: tot.perfect, materiais: tot.checks, sequencia: ps, obras: obras.feitas, obraAtual: obras.atual,
    perfeitoHoje: true, feitosHoje: state.habitos.length, folgaHoje: false, clima: { clear: +SIM >= 7, fog: false } });
  scene.apply({ ...vistaDe(visita ? visita.vitrine : vt), dono: visita ? visita.amigo : 'eu' });
  mostraVisita();
  if (SIM === null) {
    const primeira = !state.obrasVistas;
    state.obrasVistas = state.obrasVistas || [];
    for (const id of obras.feitas) if (!state.obrasVistas.includes(id)) {
      state.obrasVistas.push(id);
      if (!primeira) { const o = S.obraDe(id); toast(`🔨 ${state.nome} terminou: ${o.nome}. ${o.desc}`, 5200, 'obra:' + id); }
    }
  }
  if (SIM === null) for (const m of S.MILESTONES.filter(m => tot.perfect >= m.dias)) if (!state.milestonesPaid.includes(m.dias)) { state.milestonesPaid.push(m.dias); toast(`🏆 ${m.nome}! +${m.bonus} moedas · desbloqueou: ${m.desbloqueia}`, 5000, 'marco:' + m.dias); }
  salvar();
}
// Numeros de uma vitrine -> o que a cena desenha. Serve pra minha ilha e pra de um
// amigo: a cena nao sabe (nem precisa saber) de quem e a ilha.
function vistaDe(vt) {
  const hoje = vt.dia === S.today(), p = vt.perfeitos || 0, m = vt.materiais || 0;
  const tem = vt.obraAtual ? vt.obraAtual.tem : 0, feitos = hoje ? vt.feitosHoje : 0;
  return {
    hour: HORA !== null ? +HORA : new Date().getHours() + new Date().getMinutes() / 60,
    obras: vt.obras || [], obraAtual: vt.obraAtual,
    // o deposito mostra o que ja foi juntado pra obra em andamento (metade tora, metade pedra)
    deposito: { toras: Math.ceil(tem / 2), pedras: Math.floor(tem / 2), madeiraHoje: feitos > 0, pedraHoje: feitos > 1 },
    perfectToday: hoje && !!vt.perfeitoHoje, descanso: hoje && !!vt.folgaHoje,
    fit: S.level(m).lvl + m / 14, avatar: vt.avatar,
    unlocked: { birds: p >= 7, farol: p >= 30, ponte: p >= 60, vizinha: p >= 60, navio: p >= 100, montanha: p >= 200 },
    weather: vt.clima || { clear: false, fog: false },
    habitantes: S.habitantes(p), tecnologias: S.tecnologias(m), ilhasExtras: S.ilhasExtras(p),
  };
}

// ---------- visita a ilha de um amigo ----------
let visita = null;   // { amigo, nome, vitrine } enquanto estou olhando a ilha de alguem
function visitar(a) { visita = a; close(); render(); toast(`Visitando a ilha de ${a.vitrine.nome || a.nome}. Só dá pra olhar. 👀`, 3200); }
function mostraVisita() {
  const b = $('#visita'); b.style.display = visita ? 'flex' : 'none'; $('#habits').style.display = visita ? 'none' : '';
  if (!visita) return;
  const v = visita.vitrine, hoje = v.dia === S.today();
  const dia = !hoje ? 'não abriu hoje' : v.perfeitoHoje ? '✅ fechou o dia' : `${v.feitosHoje}/${v.devidosHoje} hoje`;
  b.innerHTML = `<div><div class="nm">🏝️ Ilha de ${esc(v.nome || visita.nome)}</div>
    <div class="st">🔥 ${v.sequencia} ${v.sequencia === 1 ? 'dia' : 'dias'} · ✨ ${v.perfeitos} perfeitos · ${dia}${v.obraAtual ? ` · 🔨 ${esc(v.obraAtual.nome)} ${v.obraAtual.tem}/${v.obraAtual.precisa}` : ''}</div></div>
    <button class="buy" id="voltar">voltar</button>`;
  $('#voltar').onclick = () => { visita = null; render(); };
}

// ---------- amigos ----------
const RESPOSTA_PEDIDO = {
  pedido: 'Pedido enviado. Aparece aqui quando aceitarem.', aceita: 'Vocês agora são amigos! 🏝️',
  ja_amigos: 'Vocês já são amigos.', nao_existe: 'Não achei ninguém com esse código.', eu_mesmo: 'Esse é o seu próprio código. 🙂',
};
const lerConvite = () => { try { return localStorage.getItem('ilha.convite') || ''; } catch { return ''; } };
const guardarConvite = c => { try { c ? localStorage.setItem('ilha.convite', c) : localStorage.removeItem('ilha.convite'); } catch {} };
async function amigos() {
  if (!(await N.quemSou())) {
    open(head('👥 Amigos') + `<div class="d" style="font-size:13px;color:var(--muted)">Pra ter amigos você precisa de uma conta — ela também guarda o backup da sua ilha.</div>
      <button class="buy" id="irconta" style="margin-top:12px;width:100%">☁️ entrar ou criar conta</button>`);
    $('#irconta').onclick = conta; return;
  }
  open(head('👥 Amigos') + '<div class="d">carregando...</div>');
  const [perfil, lista] = await Promise.all([N.garantirPerfil(state.nome), N.meusAmigos()]);
  if (perfil.erro || lista.erro) { open(head('👥 Amigos') + `<div class="d" style="color:#ff8a80">${esc(perfil.erro || lista.erro)}</div>`); return; }
  const codigo = perfil.data, todos = lista.data || [], hoje = S.today(), convite = lerConvite();
  const aceitos = todos.filter(a => a.aceita).sort((x, y) => ((y.vitrine || {}).sequencia || 0) - ((x.vitrine || {}).sequencia || 0));
  const recebidos = todos.filter(a => !a.aceita && !a.pedi_eu), enviados = todos.filter(a => !a.aceita && a.pedi_eu);
  const linha = a => {
    const v = a.vitrine, i = todos.indexOf(a);
    if (!v) return `<div class="row"><div><div class="t">${esc(a.nome)}</div><div class="d">ainda não abriu o app desde que vocês viraram amigos</div></div><button class="ghost" data-tirar="${i}">✕</button></div>`;
    const dia = v.dia !== hoje ? 'não abriu hoje' : v.perfeitoHoje ? '✅ fechou o dia' : `${v.feitosHoje}/${v.devidosHoje} hoje`;
    return `<div class="row"><div><div class="t">${esc(v.nome || a.nome)} <span class="d">🔥 ${v.sequencia} · ✨ ${v.perfeitos}</span></div>
      <div class="d">${dia}${v.obraAtual ? ` · 🔨 ${esc(v.obraAtual.nome)}` : ' · ilha completa'}</div></div>
      <div style="display:flex;gap:6px"><button class="buy" data-vis="${i}">visitar</button><button class="ghost" data-tirar="${i}">✕</button></div></div>`;
  };
  open(head('👥 Amigos') +
    `<div class="row"><div><div class="d">Seu código</div><div class="t" style="font-size:22px;letter-spacing:.12em">${esc(codigo)}</div></div><button class="buy" id="convidar">convidar</button></div>
     <div class="row"><input class="price" style="flex:1;text-transform:uppercase;letter-spacing:.1em" id="cod" maxlength="8" autocapitalize="characters" placeholder="código do amigo" value="${esc(convite)}"><button class="buy" id="add">adicionar</button></div>
     <div id="msg" class="d" style="font-size:12px;min-height:16px;margin:4px 0"></div>
     ${recebidos.length ? `<div class="t" style="margin:10px 0 4px">Pedidos pra você</div>` + recebidos.map(a => `<div class="row"><div class="t">${esc(a.nome)}</div><div style="display:flex;gap:6px"><button class="buy" data-sim="${todos.indexOf(a)}">aceitar</button><button class="ghost" data-nao="${todos.indexOf(a)}">recusar</button></div></div>`).join('') : ''}
     <div class="t" style="margin:10px 0 4px">Amigos</div>
     ${aceitos.map(linha).join('') || '<div class="d">Ninguém ainda. Manda o seu código pra alguém — quem fecha o dia junto desiste menos.</div>'}
     ${enviados.length ? `<div class="t" style="margin:10px 0 4px">Esperando resposta</div>` + enviados.map(a => `<div class="row"><div class="t">${esc(a.nome)}</div><button class="ghost" data-tirar="${todos.indexOf(a)}">cancelar</button></div>`).join('') : ''}
     <div class="d" style="font-size:12px;color:var(--muted);margin-top:12px">Amigos veem sua ilha, sua sequência e se você fechou o dia. Os nomes dos seus hábitos e recompensas não saem do seu aparelho.</div>`);
  const msg = (m, ok) => { const el = $('#msg'); el.textContent = m; el.style.color = ok ? 'var(--ok)' : '#ff8a80'; };
  $('#add').onclick = async () => {
    const c = $('#cod').value.trim(); if (c.length < 6) return msg('o código tem 6 letras');
    msg('procurando...', true); const r = await N.pedirAmizade(c);
    if (r.erro) return msg(r.erro);
    guardarConvite('');
    if (r.data === 'pedido' || r.data === 'aceita') { toast(RESPOSTA_PEDIDO[r.data], 3500); return amigos(); }
    msg(RESPOSTA_PEDIDO[r.data] || r.data, r.data === 'ja_amigos');
  };
  $('#convidar').onclick = async () => {
    const link = location.origin + location.pathname + '?amigo=' + codigo;
    const texto = `Me adiciona na Ilha! Meu código: ${codigo}`;
    try { if (navigator.share) { await navigator.share({ title: 'Ilha', text: texto, url: link }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(texto + '\n' + link); toast('Convite copiado. Cola no WhatsApp. 📋', 3000); } catch { msg('Manda esse código: ' + codigo, true); }
  };
  const alvo = el => todos[+el.dataset[Object.keys(el.dataset)[0]]];
  sheet.querySelectorAll('[data-vis]').forEach(b => b.onclick = () => { const a = alvo(b); visitar({ amigo: a.amigo, nome: a.nome, vitrine: a.vitrine }); });
  sheet.querySelectorAll('[data-sim]').forEach(b => b.onclick = async () => { const r = await N.responderAmizade(alvo(b).amigo, true); if (r.erro) return msg(r.erro); toast(RESPOSTA_PEDIDO.aceita, 3000); amigos(); });
  sheet.querySelectorAll('[data-nao]').forEach(b => b.onclick = async () => { const r = await N.responderAmizade(alvo(b).amigo, false); if (r.erro) return msg(r.erro); amigos(); });
  sheet.querySelectorAll('[data-tirar]').forEach(b => b.onclick = async () => {
    const a = alvo(b); if (!confirm(a.aceita ? `Desfazer a amizade com ${a.nome}?` : `Cancelar o pedido pra ${a.nome}?`)) return;
    const r = await N.desfazerAmizade(a.amigo); if (r.erro) return msg(r.erro); amigos();
  });
}

function clickHabit(id) {
  const before = S.coins(state), marcosAntes = S.marcosAlcancados(state).map(m => m.dias);
  S.toggle(state, id); salvar();
  const after = S.coins(state), iso = S.today(), marcou = S.checked(state, iso, id);
  if (marcou) {
    // O bonus de marco entra no saldo junto com o dia: separa, senao o 7o dia perfeito
    // dizia "Dia perfeito! +13" (1 do habito + 2 do dia + 10 da Primeira semana). O marco
    // e a obra nova tem aviso proprio, que o render() poe na fila logo depois deste.
    const doMarco = S.marcosAlcancados(state).filter(m => !marcosAntes.includes(m.dias)).reduce((t, m) => t + m.bonus, 0);
    const doDia = after - before - doMarco;
    const mult = S.multiplierAt(state, iso), vezes = mult > 1 ? ` (sequência ×${String(mult).replace('.', ',')})` : '';
    if (S.isPerfect(state, iso)) toast(`✨ Dia perfeito! +${doDia} moedas${vezes}. A fogueira acende hoje à noite.`, 3000, 'moeda');
    else toast(`+${doDia} moeda${doDia > 1 ? 's' : ''}${vezes}`, 2200, 'moeda');
  }
  render();
  if (marcou) scene.pulse('deposito_pilha');
}

// ---------- modais ----------
const modal = $('#modal'), sheet = $('#sheet');
function open(html, fechavel = true) { sheet.innerHTML = html; modal.classList.add('open'); const x = sheet.querySelector('.x'); if (x) x.onclick = close; modal.dataset.lock = fechavel ? '' : '1'; }
function close() { modal.classList.remove('open'); }
modal.addEventListener('click', e => { if (e.target === modal && !modal.dataset.lock) close(); });
const head = t => `<h2>${t}<button class="x">✕</button></h2>`;

function loja() {
  const c = S.coins(state);
  open(head(`🛒 Loja · <span style="color:var(--gold)">${c} moedas</span>`) +
    (c < 0 ? `<div class="d" style="font-size:13px;color:#ff8a80;margin-bottom:8px">Você está devendo ${-c} moeda${c < -1 ? 's' : ''}. As próximas moedas que ganhar pagam a dívida primeiro.</div>` : '') +
    `<div class="d" style="font-size:13px;color:var(--muted);margin-bottom:8px">Compra de manhã, aproveita à noite — decisão com a cabeça fria.</div>` +
    state.rewards.map(r => `<div class="row"><div><div class="t">${esc(r.nome)}</div><div class="d">${esc(r.desc || '')}${r.folga ? ' · folga de ' + esc((state.habitos.find(h => h.id === r.folga) || {}).nome || '?') : ''}</div></div>
      <div style="display:flex;gap:6px;align-items:center"><span style="color:var(--gold);font-weight:800">${r.preco}</span>
      <button class="buy${c < r.preco ? ' fiado' : ''}" data-id="${r.id}" data-preco="${r.preco}" ${r.folga && S.boughtToday(state, r.id) ? 'disabled' : ''}>${S.boughtToday(state, r.id) ? 'de novo' : c < r.preco ? 'fiado' : 'comprar'}</button></div></div>`).join('') +
    `<div class="d" style="font-size:12px;color:var(--muted);margin-top:10px">Ganhos: 1 moeda por hábito + 2 no dia perfeito. ×1,5 a partir de 7 dias perfeitos seguidos, ×2 a partir de 30. Sem saldo? Dá pra comprar <b>fiado</b>: o saldo fica negativo e você paga com os próximos dias — a ilha não julga, mas anota.</div>
    <button class="ghost" id="edrec" style="margin-top:12px">✏️ editar recompensas</button>`);
  sheet.querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const nome = state.rewards.find(r => r.id === b.dataset.id).nome, falta = +b.dataset.preco - S.coins(state);
    if (falta > 0 && !b.dataset.ok) { b.dataset.ok = 1; b.textContent = `ficar devendo ${falta}?`; setTimeout(() => { if (b.isConnected) { delete b.dataset.ok; b.textContent = 'fiado'; } }, 4000); return; }
    if (S.buy(state, b.dataset.id, true)) { salvar(); const c = S.coins(state); toast(c < 0 ? `Comprado fiado: ${nome}. Você está devendo ${-c} moeda${c < -1 ? 's' : ''}. 📝` : `Comprado: ${nome}. Aproveita! 🎉`, 3500); render(); loja(); }
  });
  $('#edrec').onclick = () => setup(2);
}

function hist() {
  const tot = S.totals(state);
  let cells = '';
  const start = S.addDays(S.today(), -34);
  for (let i = 0; i < S.weekday(start); i++) cells += `<div class="day"></div>`;
  for (let i = 0; i < 35; i++) {
    const iso = S.addDays(start, i); const p = S.isPerfect(state, iso); const any = state.habitos.some(h => S.checked(state, iso, h.id)); const r = state.days[iso]?.folga;
    cells += `<div class="day ${iso < state.start ? '' : p ? 'p' : any ? 'h' : ''} ${r ? 'r' : ''}" title="${iso}">${+iso.slice(8)}</div>`;
  }
  open(head('📅 Últimas 5 semanas') + `<div class="grid" style="margin-bottom:6px">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<div class="day" style="background:none">${d}</div>`).join('')}</div><div class="grid">${cells}</div>
    <div style="margin-top:14px">
    <div class="stat"><span>Dias perfeitos</span><b>${tot.perfect}</b></div>
    ${state.habitos.map(h => `<div class="stat"><span>${h.icone} ${esc(h.nome)}</span><b>${tot.por[h.id] || 0}</b></div>`).join('')}
    <div class="stat"><span>Sequência atual (dias perfeitos)</span><b>${S.perfectStreak(state)}</b></div>
    <div class="stat"><span>Escudos</span><b>${S.shields(state)}</b></div>
    <div class="stat"><span>Compras</span><b>${state.purchases.length}</b></div></div>
    <div class="d" style="font-size:12px;color:var(--muted);margin-top:8px">Verde = dia perfeito · verde claro = parcial · amarelo = folga. Próximos marcos: ${S.MILESTONES.filter(m => tot.perfect < m.dias).slice(0, 2).map(m => `${m.dias} dias → ${m.desbloqueia}`).join(' · ')}</div>
    <button class="ghost" id="reset" style="margin-top:14px">apagar tudo (zona de perigo)</button>`);
  $('#reset').onclick = () => { if (confirm('Apagar TODO o progresso?') && confirm('Certeza? Não tem volta.')) { localStorage.removeItem('ilha.v2'); localStorage.removeItem('ilha.v1'); location.reload(); } };
}

function fotos() {
  open(head('📷 Linha do tempo') + `<button class="buy" id="snap" style="margin-bottom:12px">📸 tirar foto da ilha agora</button>
    <div class="snaps">${state.snapshots.slice().reverse().map(s => `<div><img src="${s.img}"><div>${s.date}</div></div>`).join('') || '<div>Todo domingo a ilha tira uma foto sozinha. Em alguns meses você vai ver a ilha pelada virar cidade.</div>'}</div>`);
  $('#snap').onclick = () => { takeSnapshot(true); fotos(); };
}
function takeSnapshot(force) {
  const iso = S.today();
  if (!force && state.snapshots.some(s => s.date === iso)) return;
  state.snapshots = state.snapshots.filter(s => s.date !== iso);
  state.snapshots.push({ date: iso, img: scene.snapshot() });
  if (state.snapshots.length > 60) state.snapshots.shift();
  salvar(); if (force) toast('Foto guardada.');
}

function info() {
  const tot = S.totals(state);
  const ob = S.obrasEm(tot.checks);
  const hab = S.habitantes(tot.perfect).map(h => h.id), tec = S.tecnologias(tot.checks);
  const lista = (arr, key, unit, on) => arr.map(x => `<div class="row" style="opacity:${on(x) ? 1 : .45}"><div><div class="t">${on(x) ? '✅' : '🔒'} ${esc(x.nome)}</div><div class="d">${esc(x.desc)}</div></div><div class="d" style="white-space:nowrap">${x[key]} ${unit}</div></div>`).join('');
  open(head(`🏝️ A ilha de ${esc(state.nome)}`) + `
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px"><b>${esc(state.nome)}</b> era a única pessoa a bordo quando o avião caiu nesta ilha. Sobrou a fuselagem na praia, uma lona, ferramentas — e um gênio com tempo de sobra. Podia ter ido embora; ficou.</div>
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px"><b>O que ele come, a ilha dá.</b> Não tem mercado. Ele pesca, arma ciladas nas trilhas e caça o que passa — veado, javali, capivara. Cada refeição é uma manhã inteira de trabalho. O que sobra de madeira e pedra empilha no depósito: <b>qualquer</b> hábito cumprido vira uma tora ou uma pedra — treino, leitura ou um copo d’água valem exatamente o mesmo. Ele é o engenheiro: olha a pilha e levanta a próxima obra da lista, do abrigo de lona até a prefeitura, sempre o mais essencial primeiro.</div>
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px"><b>Mas a ilha também tem dentes.</b> Tem coisa aqui que caça de volta, e ela anda na linha das árvores. De dia mantém distância. De noite, chega perto o bastante pra se ouvir.</div>
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px"><b>A fogueira não é enfeite — é a fronteira.</b> Enquanto ela queima, eles não passam. Nas noites em que ${esc(state.nome)} cumpriu tudo o que se propôs, há lenha seca e o fogo acende. Nas noites em que falhou, não acende: a névoa desce por dois dias e o que mora na mata vem ver de perto. <b>Nada é destruído</b> — a ilha não pune, ela só fica menos segura.</div>
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px"><b>Os escudos são as noites em que ele se preparou antes.</b> A cada 7 dias perfeitos sobra lenha, sobra carne seca, sobra estaca na paliçada — e um dia ruim deixa de virar uma noite ruim.</div>
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.55;margin-bottom:10px">Depois vêm a energia, um rádio, e gente que ouve o chamado e vem visitar. Alguns ficam. Uma pessoa fica pra sempre. E a vila vira cidade — não porque ${esc(state.nome)} é forte, mas porque ele não deixou o fogo apagar duas vezes seguidas.</div>
    <div class="row" id="linhaConta"><div><div class="t">☁️ Conta e backup</div><div class="d" id="contaEstado">verificando...</div></div><button class="ghost" id="abrirConta">abrir</button></div>
    <div class="t" style="margin:10px 0 4px">📦 Seus hábitos <span class="d">(cada um cumprido = 1 material; todos valem igual)</span></div>
    ${state.habitos.map(h => `<div class="row"><div><div class="t">${h.icone} ${esc(h.nome)}</div><div class="d">${S.descreveFreq(h)} · cumprido ${tot.por[h.id] || 0}×</div></div></div>`).join('')}
    ${ob.atual ? `<div class="row"><div><div class="t">🔨 Obra em andamento: ${esc(ob.atual.nome)}</div><div class="d">${esc(ob.atual.desc)}<br><b>${ob.atual.tem}/${ob.atual.precisa}</b> materiais · faltam ${ob.atual.falta}</div></div></div>` : '<div class="row"><div><div class="t">🏙️ A ilha está completa</div><div class="d">Todas as obras de pé. Os moradores e as ilhas vizinhas não têm fim.</div></div></div>'}
    <div class="row"><div><div class="t">🔥 Fogueira · 🌤️ Clima · 🛡️ Escudo</div><div class="d">Fogueira acende à noite nos dias perfeitos (todos os hábitos do dia). 7+ dias seguidos: céu limpo e pássaros; falhou: névoa por 2 dias (nada é destruído). A cada 7 dias perfeitos acumulados, 1 escudo salva um dia falho.</div></div></div>
    <div class="t" style="margin:14px 0 4px">🏗️ As obras <span class="d">(materiais juntados: ${tot.checks})</span></div>
    ${['Sobreviver','Viver','Alcançar','Cidade'].map(f => `<div class="d" style="margin:10px 0 2px;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:var(--muted)">${f}</div>` +
      S.OBRAS.filter(o => o.fase === f).map(o => { const ok = ob.feitas.includes(o.id), agora = ob.atual && ob.atual.id === o.id;
        return `<div class="row" style="opacity:${ok ? 1 : agora ? .9 : .4}"><div><div class="t">${ok ? '✅' : agora ? '🔨' : '🔒'} ${esc(o.nome)}</div><div class="d">${esc(o.desc)}</div></div><div class="d" style="white-space:nowrap">${agora ? ob.atual.tem + '/' + ob.atual.precisa : o.custo}</div></div>`; }).join('')).join('')}
    <div class="t" style="margin:14px 0 4px">👨‍👩‍👧 Moradores <span class="d">(dias perfeitos acumulados: ${tot.perfect})</span></div>
    ${lista(S.HABITANTES, 'dias', 'dias', h => hab.includes(h.id))}
    <div class="t" style="margin:14px 0 4px">⚡ Tecnologia <span class="d">(hábitos cumpridos no total: ${tot.checks})</span></div>
    ${lista(S.TECNOLOGIAS, 'checks', 'hábitos', t => tec.includes(t.id))}
    <div class="t" style="margin:14px 0 4px">🌫️ Horizonte <span class="d">(dias perfeitos)</span></div>
    ${lista(S.MILESTONES.map(m => ({ nome: m.desbloqueia, desc: m.nome + ' · +' + m.bonus + ' moedas', dias: m.dias })), 'dias', 'dias', m => tot.perfect >= m.dias)}
    <div class="d" style="font-size:12px;color:var(--muted);margin-top:12px"><b>É infinito.</b> As ilhas vizinhas sempre estiveram lá; depois do navio (100 dias), a cada 25 dias perfeitos ${esc(state.nome)} ocupa uma (cais + casa). Níveis e moedas não têm teto. Sol, lua e céu seguem o relógio de verdade.</div>
    <button class="ghost" id="edhab" style="margin-top:12px">⚙️ configurar hábitos e recompensas</button>`);
  $('#edhab').onclick = () => setup(1);
  $('#abrirConta').onclick = conta;
  N.quemSou().then(q => { const el = $('#contaEstado'); if (el) el.textContent = q ? 'conectado como ' + q : 'não conectada — o progresso só existe neste aparelho'; });
}

// ---------- conta na nuvem ----------
async function conta() {
  const quem = await N.quemSou();
  if (quem) {
    const nuvem = await N.baixar();
    open(head('☁️ Conta') +
      `<div class="row"><div><div class="t">Conectado como <b>${esc(quem)}</b></div>
        <div class="d">Último backup: ${nuvem ? new Date(nuvem.quando).toLocaleString('pt-BR') : 'ainda nenhum'}</div></div></div>
      <div class="d" style="font-size:12px;color:var(--muted);margin-top:8px">O progresso sobe sozinho alguns segundos depois de cada hábito marcado. As fotos da linha do tempo ficam só no aparelho — elas são pesadas demais pra sincronizar.</div>
      <button class="buy" id="agora" style="margin-top:12px;width:100%">salvar na nuvem agora</button>
      <button class="ghost" id="sair" style="margin-top:8px;width:100%">sair da conta neste aparelho</button>`);
    $('#agora').onclick = async () => { const r = await N.subir(state); toast(r.ok ? 'Progresso salvo na nuvem. ☁️' : 'Não consegui salvar: ' + r.erro, 3500); };
    $('#sair').onclick = async () => {
      if (!confirm('Sair da conta? O progresso continua neste aparelho.')) return;
      await N.sair(); close(); toast('Você saiu. O progresso continua aqui no aparelho.', 3500);
    };
    return;
  }
  open(head('☁️ Conta') +
    `<div class="d" style="font-size:13px;color:var(--muted);margin-bottom:10px">Crie uma conta pra não perder a ilha se trocar de celular ou apagar o app. O jogo continua funcionando offline — a nuvem é só a cópia de segurança.</div>
     <div class="row"><div class="t">E-mail</div><input class="price" style="width:170px" id="us" type="email" inputmode="email" autocapitalize="none" autocomplete="email" placeholder="voce@exemplo.com"></div>
     <div class="row"><div class="t">Senha</div><input class="price" style="width:170px" id="pw" type="password" autocomplete="current-password" placeholder="mínimo 6"></div>
     <div id="msg" class="d" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:6px"></div>
     <button class="buy" id="entrar" style="margin-top:10px;width:100%">entrar</button>
     <button class="ghost" id="criar" style="margin-top:8px;width:100%">criar conta nova</button>
     <div class="d" style="font-size:12px;color:var(--muted);margin-top:10px">⚠️ <b>Anote a senha.</b> A recuperação por e-mail ainda não está ligada — o e-mail fica guardado pra quando estiver.</div>`);
  const msg = m => $('#msg').textContent = m;
  const pega = () => ({ u: $('#us').value, p: $('#pw').value });
  const depois = async (r, novo) => {
    if (r.erro) { msg(r.erro); return; }
    await sincronizar(novo);
    close(); render();
  };
  $('#entrar').onclick = async () => {
    const { u, p } = pega();
    if (!N.emailValido(u)) return msg('escreve um e-mail válido');
    if (p.length < 6) return msg('senha precisa de pelo menos 6 caracteres');
    msg('entrando...'); depois(await N.entrar(u, p), false);
  };
  $('#criar').onclick = async () => {
    const { u, p } = pega();
    if (!N.emailValido(u)) return msg('escreve um e-mail válido');
    if (p.length < 6) return msg('senha precisa de pelo menos 6 caracteres');
    msg('criando...'); depois(await N.criarConta(u, p), true);
  };
}

// Decide quem manda quando o aparelho e a nuvem discordam: vence o save com
// mais dias marcados. As fotos sao sempre as do aparelho (elas nao sobem).
async function sincronizar(contaNova) {
  // amigos: publica a vitrine e mantem o nome do perfil em dia (falha calada se o SQL nao rodou)
  N.garantirPerfil(state.nome).then(() => N.publicarVitrine(S.vitrine(state)));
  const nuvem = await N.baixar();
  const aqui = N.tamanho(state);
  if (!nuvem || !nuvem.dados) {
    const r = await N.subir(state);
    toast(r.ok ? (contaNova ? 'Conta criada. Seu progresso foi pro seguro. ☁️' : 'Progresso enviado pra nuvem. ☁️') : 'Conta ok, mas não consegui enviar: ' + r.erro, 4000);
    return;
  }
  const la = N.tamanho(nuvem.dados);
  if (la > aqui) {
    const fotos = state.snapshots;
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, nuvem.dados, { snapshots: fotos });
    S.save(state);
    toast(`Progresso da nuvem recuperado: ${la} dias (aqui tinha ${aqui}). ☁️`, 4500);
  } else {
    await N.subir(state);
    toast(aqui > la ? `Este aparelho estava mais adiantado (${aqui} dias). Mandei ele pra nuvem. ☁️` : 'Tudo sincronizado. ☁️', 4000);
  }
}

// ---------- configuracao (primeira vez e edicao) ----------
let draft = null;
function setup(passo = 1) {
  if (!draft) draft = { nome: state.nome, avatar: state.avatar || AVATARES[0].skin, habitos: state.habitos.map(h => ({ ...h, dias: [...(h.dias || [])] })), rewards: state.rewards.map(r => ({ ...r })) };
  const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];   // nao usar 'N' aqui: sombreia o import da nuvem
  if (passo === 1) {
    open(`<h2>⚙️ Seus hábitos <span class="d" style="font-size:12px">passo 1 de ${state.setupDone ? 2 : 3}</span></h2>
      <div class="row"><div class="t">Nome de quem caiu na ilha</div><input class="price" style="width:140px" id="nome" value="${esc(draft.nome)}"></div>
      <div class="t" style="margin:10px 0 6px">Quem é você na ilha</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px">${AVATARES.map(a => `<button class="ghost" data-avatar="${a.skin}" style="padding:8px 4px;${draft.avatar === a.skin ? 'background:var(--ok);color:#053;font-weight:700' : ''}">${a.ele ? '👨' : '👩'} ${a.nome}</button>`).join('')}</div>
      ${state.setupDone ? `<div class="row"><div><div class="t">Gráficos</div><div class="d">leve: menos mata e sem brilho noturno — pra celular mais simples</div></div><select class="price" style="width:auto" id="qual"><option value="alta" ${QUALIDADE !== 'leve' ? 'selected' : ''}>alta</option><option value="leve" ${QUALIDADE === 'leve' ? 'selected' : ''}>leve</option></select></div>` : ''}
      <div class="d" style="font-size:13px;color:var(--muted);margin:10px 0 6px">Todo hábito cumprido vira material pra próxima obra da ilha — não importa qual hábito seja. Toque numa sugestão pra adicionar, ou crie o seu.</div>
      <div id="sug" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${S.SUGESTOES_HABITOS.map((s, i) => draft.habitos.some(h => h.nome === s.nome) ? '' : `<button class="ghost" data-sug="${i}">${s.icone} ${esc(s.nome)}</button>`).join('')}<button class="ghost" id="novo">➕ outro</button></div>
      <div id="lista">${draft.habitos.map((h, i) => `<div class="row" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="t">${h.icone} ${esc(h.nome)}</div><button class="ghost" data-del="${i}">remover</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select class="price" style="width:auto" data-tipo="${i}"><option value="diario" ${h.tipo === 'diario' ? 'selected' : ''}>todo dia</option><option value="dias" ${h.tipo === 'dias' ? 'selected' : ''}>dias fixos</option><option value="semana" ${h.tipo === 'semana' ? 'selected' : ''}>X vezes por semana</option></select>
          ${h.tipo === 'dias' ? LETRA_DIA.map((n, d) => `<button class="ghost" data-dia="${i}:${d}" style="${h.dias.includes(d) ? 'background:var(--ok);color:#053' : ''}">${n}</button>`).join('') : ''}
          ${h.tipo === 'semana' ? `<input class="price" type="number" min="1" max="7" value="${h.vezes || 3}" data-vezes="${i}"> <span class="d">vezes/semana</span>` : ''}
        </div></div>`).join('') || '<div class="d">Nenhum hábito ainda.</div>'}</div>
      <button class="buy" id="prox" style="margin-top:14px;width:100%" ${draft.habitos.length ? '' : 'disabled'}>continuar →</button>`, state.setupDone);
    $('#nome').onchange = e => draft.nome = e.target.value.trim() || 'Bob';
    sheet.querySelectorAll('[data-avatar]').forEach(b => b.onclick = () => { draft.nome = $('#nome').value.trim() || draft.nome; draft.avatar = b.dataset.avatar; setup(1); });
    // qualidade e deste aparelho (localStorage), nao da conta: um celular fraco nao rebaixa o PC
    if ($('#qual')) $('#qual').onchange = e => { try { localStorage.setItem('ilha.qualidade', e.target.value); } catch {} if (confirm('Recarregar agora pra aplicar os gráficos?')) location.reload(); };
    sheet.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = S.SUGESTOES_HABITOS[+b.dataset.sug]; draft.habitos.push({ id: S.uid(), nome: s.nome, icone: s.icone, tipo: 'diario', dias: [], vezes: 3, desde: S.today() }); setup(1); });
    $('#novo').onclick = () => { const nome = prompt('Nome do hábito:'); if (!nome) return; const icone = prompt('Um emoji pra ele:', '⭐') || '⭐'; draft.habitos.push({ id: S.uid(), nome: nome.trim(), icone: icone.trim().slice(0, 2), tipo: 'diario', dias: [], vezes: 3, desde: S.today() }); setup(1); };
    sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { draft.habitos.splice(+b.dataset.del, 1); setup(1); });
    sheet.querySelectorAll('[data-tipo]').forEach(s => s.onchange = () => { const h = draft.habitos[+s.dataset.tipo]; h.tipo = s.value; if (h.tipo === 'dias' && !h.dias.length) h.dias = [1, 3, 5]; setup(1); });
    sheet.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.dia.split(':').map(Number); const h = draft.habitos[i]; h.dias = h.dias.includes(d) ? h.dias.filter(x => x !== d) : [...h.dias, d]; setup(1); });
    sheet.querySelectorAll('[data-vezes]').forEach(i => i.onchange = () => { draft.habitos[+i.dataset.vezes].vezes = Math.max(1, Math.min(7, +i.value || 3)); });
    $('#prox').onclick = () => setup(2);
  } else if (passo === 2) {
    open(`<h2>🎁 Suas recompensas <span class="d" style="font-size:12px">passo 2 de ${state.setupDone ? 2 : 3}</span></h2>
      <div class="d" style="font-size:13px;color:var(--muted);margin-bottom:6px">O que você quer poder comprar com as moedas dos hábitos? Toque pra adicionar e ajuste o preço (1 moeda ≈ 1 hábito cumprido; dia perfeito dá +2).</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${S.SUGESTOES_RECOMPENSAS.map((s, i) => draft.rewards.some(r => r.nome === s.nome) ? '' : `<button class="ghost" data-sug="${i}">${esc(s.nome)}</button>`).join('')}<button class="ghost" id="novo">➕ outra</button></div>
      ${draft.rewards.map((r, i) => `<div class="row"><div><div class="t">${esc(r.nome)}</div><div class="d">${esc(r.desc || '')}</div>
        ${r.folga !== undefined ? `<div class="d" style="margin-top:4px">folga de: <select class="price" style="width:auto" data-folga="${i}">${draft.habitos.map(h => `<option value="${h.id}" ${r.folga === h.id ? 'selected' : ''}>${h.icone} ${esc(h.nome)}</option>`).join('')}</select></div>` : ''}</div>
        <div style="display:flex;gap:6px;align-items:center"><input class="price" type="number" min="1" value="${r.preco}" data-preco="${i}"><button class="ghost" data-del="${i}">✕</button></div></div>`).join('') || '<div class="d">Nenhuma recompensa ainda.</div>'}
      ${state.setupDone ? '<button class="ghost" id="btconta" style="margin-top:14px;width:100%">☁️ conta e backup na nuvem</button>' : ''}
      <div style="display:flex;gap:8px;margin-top:8px"><button class="ghost" id="volta">← hábitos</button><button class="buy" id="ok" style="flex:1" ${draft.rewards.length ? '' : 'disabled'}>${state.setupDone ? 'salvar' : 'continuar →'}</button></div>`, state.setupDone);
    sheet.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = S.SUGESTOES_RECOMPENSAS[+b.dataset.sug]; draft.rewards.push({ id: S.uid(), nome: s.nome, desc: s.desc, preco: s.preco, ...(s.folga ? { folga: (draft.habitos[0] || {}).id || '' } : {}) }); setup(2); });
    $('#novo').onclick = () => { const nome = prompt('Nome da recompensa:'); if (!nome) return; const preco = +prompt('Preço em moedas:', '20') || 20; draft.rewards.push({ id: S.uid(), nome: nome.trim(), desc: '', preco }); setup(2); };
    sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { draft.rewards.splice(+b.dataset.del, 1); setup(2); });
    sheet.querySelectorAll('[data-preco]').forEach(i => i.onchange = () => { draft.rewards[+i.dataset.preco].preco = Math.max(1, +i.value || 1); });
    sheet.querySelectorAll('[data-folga]').forEach(s => s.onchange = () => { draft.rewards[+s.dataset.folga].folga = s.value; });
    if ($('#btconta')) $('#btconta').onclick = conta;
    $('#volta').onclick = () => setup(1);
    $('#ok').onclick = () => {
      draft.rewards.forEach(r => { if (r.folga !== undefined && !draft.habitos.some(h => h.id === r.folga)) r.folga = (draft.habitos[0] || {}).id; });
      const primeiraVez = !state.setupDone;
      // guarda hábitos e recompensas ja; setupDone so no fim, senao da pra escapar do passo 3
      state.nome = draft.nome; state.avatar = draft.avatar; state.habitos = draft.habitos; state.rewards = draft.rewards; draft = null;
      if (primeiraVez) { salvar(); return setup(3); }
      salvar(); close(); render(); N.garantirPerfil(state.nome); toast(`De volta à ilha, ${state.nome}. 🏝️`, 3000);
    };
  } else {
    // ---- passo 3: conta. A ilha vive no aparelho; sem conta, trocou de celular e acabou.
    // Por isso a conta e obrigatoria pra começar -- menos quando o aparelho esta sem
    // rede, que ai seria o app se recusando a abrir por um motivo que nao e do usuario.
    const pronto = () => { state.setupDone = true; salvar(); close(); render(); };
    open(`<h2>☁️ Sua conta <span class="d" style="font-size:12px">passo 3 de 3</span></h2>
      <div class="d" style="font-size:13px;color:var(--muted);margin-bottom:10px">A ilha vive neste aparelho. A conta é a cópia de segurança: sem ela, trocou de celular ou limpou o navegador e o progresso foi embora. O jogo continua funcionando offline.</div>
      <div class="row"><div class="t">E-mail</div><input class="price" style="width:170px" id="em" type="email" inputmode="email" autocapitalize="none" autocomplete="email" placeholder="voce@exemplo.com"></div>
      <div class="row"><div class="t">Senha</div><input class="price" style="width:170px" id="pw" type="password" autocomplete="new-password" placeholder="mínimo 6"></div>
      <div id="msg" class="d" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:6px"></div>
      <button class="buy" id="criar" style="width:100%">criar conta e começar 🏝️</button>
      <button class="ghost" id="entrar" style="margin-top:8px;width:100%">já tenho conta</button>
      <div class="d" style="font-size:12px;color:var(--muted);margin-top:10px">⚠️ <b>Anote a senha.</b> A recuperação por e-mail ainda não está ligada — o e-mail fica guardado pra quando estiver.</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="ghost" id="volta">← recompensas</button><button class="ghost" id="semrede" style="flex:1;display:none">começar sem conta</button></div>`, false);
    const msg = m => $('#msg').textContent = m;
    const pega = () => ({ e: $('#em').value, p: $('#pw').value });
    const valida = ({ e, p }) => !N.emailValido(e) ? 'escreve um e-mail válido' : p.length < 6 ? 'a senha precisa de pelo menos 6 caracteres' : '';
    const fim = async (r, contaNova) => {
      if (r.erro) {
        msg(r.erro);
        // sem rede nao e culpa de quem esta instalando: libera a saída
        if (/conex|servidor|rede/i.test(r.erro)) $('#semrede').style.display = 'block';
        return;
      }
      pronto(); await sincronizar(contaNova);
      toast(`Bem-vindo à ilha, ${state.nome}. Cada dia conta. 🏝️`, 4000);
      if (lerConvite()) setTimeout(amigos, 1500);
    };
    $('#criar').onclick = async () => { const d = pega(), erro = valida(d); if (erro) return msg(erro); msg('criando...'); fim(await N.criarConta(d.e, d.p), true); };
    $('#entrar').onclick = async () => { const d = pega(), erro = valida(d); if (erro) return msg(erro); msg('entrando...'); fim(await N.entrar(d.e, d.p), false); };
    $('#volta').onclick = () => setup(2);
    $('#semrede').onclick = () => { pronto(); toast('Começou sem conta. Cria uma no ⚙️ assim que tiver internet — sem ela o progresso só existe neste aparelho.', 5500); };
    if (!navigator.onLine) { msg('sem internet agora'); $('#semrede').style.display = 'block'; }
  }
}

document.querySelectorAll('#actions button').forEach(b => b.onclick = () => ({ loja, hist, fotos, info, amigos, config: () => setup(1) })[b.dataset.m]());

// ---------- inicio ----------
if (S.applyShield(state)) { salvar(); toast('🛡️ Um escudo salvou o dia de ontem.'); }
render();
// Se o aparelho ja esta logado, confere a nuvem assim que abrir.
N.sessao().then(s => { if (s) sincronizar(false); });
{ const c = new URLSearchParams(location.search).get('amigo');
  if (c) { guardarConvite(c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); history.replaceState(null, '', location.pathname); } }
if (!state.setupDone) setup(1);
else if (lerConvite()) amigos();
if (new Date().getDay() === 0) setTimeout(() => takeSnapshot(false), 4000);
setInterval(render, 60000);
