import { createScene } from './scene.js';
import * as S from './state.js';

const $ = s => document.querySelector(s);
const state = S.load();
const scene = createScene($('#c'));
const SIM = new URLSearchParams(location.search).get('sim');
const HORA = new URLSearchParams(location.search).get('hora');

function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, ms); }
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
  // distritos pra cena
  const done = {}; for (const h of state.habitos) done[h.id] = SIM !== null || S.dayDone(state, iso, h.id);
  const distritos = state.habitos.map(h => ({ id: h.id, tipo: h.distrito, ...S.level(tot.por[h.id] || 0), done: done[h.id] }));
  const corpo = state.habitos.filter(h => h.distrito === 'academia' || h.distrito === 'horta').reduce((a, h) => a + (tot.por[h.id] || 0), 0);
  const folgaAlguma = state.habitos.some(h => S.folgaHoje(state, h.id));
  const dep = distritos[0] ? { toras: Math.round(distritos[0].prog * 7), madeiraHoje: distritos[0].done } : { toras: 0 };
  Object.assign(dep, distritos[1] ? { pedras: Math.round(distritos[1].prog * 7), pedraHoje: distritos[1].done } : { pedras: 0 });
  scene.apply({
    hour: HORA !== null ? +HORA : new Date().getHours() + new Date().getMinutes() / 60,
    distritos, deposito: dep, done, perfectToday: SIM !== null || S.isPerfect(state, iso), descanso: folgaAlguma,
    fit: S.level(corpo).lvl + corpo / 14,
    compras: state.purchases.filter(p => p.date === iso).map(p => (state.rewards.find(r => r.id === p.id) || {}).nome || ''),
    unlocked: { birds: tot.perfect >= 7, farol: tot.perfect >= 30, ponte: tot.perfect >= 60, vizinha: tot.perfect >= 60, navio: tot.perfect >= 100, montanha: tot.perfect >= 200 },
    weather: SIM !== null ? { clear: +SIM >= 7, fog: false } : S.weather(state),
    habitantes: S.habitantes(tot.perfect), tecnologias: S.tecnologias(tot.checks), ilhasExtras: S.ilhasExtras(tot.perfect), cidade: S.cidade(tot.perfect),
  });
  if (SIM === null) for (const m of S.MILESTONES.filter(m => tot.perfect >= m.dias)) if (!state.milestonesPaid.includes(m.dias)) { state.milestonesPaid.push(m.dias); toast(`🏆 ${m.nome}! +${m.bonus} moedas · desbloqueou: ${m.desbloqueia}`, 5000); }
  S.save(state);
}
function clickHabit(id) {
  const before = S.coins(state);
  S.toggle(state, id); S.save(state); render();
  const after = S.coins(state);
  if (S.checked(state, S.today(), id)) {
    const h = state.habitos.find(x => x.id === id);
    scene.pulse(h.distrito === 'academia' ? 'personagem' : 'dist_' + h.id);
    if (S.isPerfect(state, S.today())) toast(`✨ Dia perfeito! +${after - before} moedas. A fogueira acende hoje à noite.`);
    else toast(`+${after - before} moeda${after - before > 1 ? 's' : ''}`);
  }
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
    `<div class="d" style="font-size:13px;color:var(--muted);margin-bottom:8px">Compra de manhã, aproveita à noite. O que você compra aparece na ilha hoje.</div>` +
    state.rewards.map(r => `<div class="row"><div><div class="t">${esc(r.nome)}</div><div class="d">${esc(r.desc || '')}${r.folga ? ' · folga de ' + esc((state.habitos.find(h => h.id === r.folga) || {}).nome || '?') : ''}</div></div>
      <div style="display:flex;gap:6px;align-items:center"><span style="color:var(--gold);font-weight:800">${r.preco}</span>
      <button class="buy${c < r.preco ? ' fiado' : ''}" data-id="${r.id}" data-preco="${r.preco}" ${r.folga && S.boughtToday(state, r.id) ? 'disabled' : ''}>${S.boughtToday(state, r.id) ? 'de novo' : c < r.preco ? 'fiado' : 'comprar'}</button></div></div>`).join('') +
    `<div class="d" style="font-size:12px;color:var(--muted);margin-top:10px">Ganhos: 1 moeda por hábito + 2 no dia perfeito. ×1,5 a partir de 7 dias perfeitos seguidos, ×2 a partir de 30. Sem saldo? Dá pra comprar <b>fiado</b>: o saldo fica negativo e você paga com os próximos dias — a ilha não julga, mas anota.</div>
    <button class="ghost" id="edrec" style="margin-top:12px">✏️ editar recompensas</button>`);
  sheet.querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const nome = state.rewards.find(r => r.id === b.dataset.id).nome, falta = +b.dataset.preco - S.coins(state);
    if (falta > 0 && !b.dataset.ok) { b.dataset.ok = 1; b.textContent = `ficar devendo ${falta}?`; setTimeout(() => { if (b.isConnected) { delete b.dataset.ok; b.textContent = 'fiado'; } }, 4000); return; }
    if (S.buy(state, b.dataset.id, true)) { S.save(state); const c = S.coins(state); toast(c < 0 ? `Comprado fiado: ${nome}. Você está devendo ${-c} moeda${c < -1 ? 's' : ''}. 📝` : `Comprado: ${nome}. Aproveita! 🎉`, 3500); render(); loja(); }
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
  S.save(state); if (force) toast('Foto guardada.');
}

function info() {
  const tot = S.totals(state);
  const hab = S.habitantes(tot.perfect).map(h => h.id), tec = S.tecnologias(tot.checks);
  const lista = (arr, key, unit, on) => arr.map(x => `<div class="row" style="opacity:${on(x) ? 1 : .45}"><div><div class="t">${on(x) ? '✅' : '🔒'} ${esc(x.nome)}</div><div class="d">${esc(x.desc)}</div></div><div class="d" style="white-space:nowrap">${x[key]} ${unit}</div></div>`).join('');
  open(head(`🏝️ A ilha de ${esc(state.nome)}`) + `
    <div class="d" style="font-size:13px;color:var(--txt);line-height:1.5;margin-bottom:10px"><b>${esc(state.nome)}</b> era a única pessoa a bordo quando o avião caiu nesta ilha. Sobrou a fuselagem na praia, uma lona, ferramentas — e um gênio com tempo de sobra. Podia ter ido embora; ficou. Tira <b>madeira da floresta</b> e <b>pedra da pedreira</b> e empilha no <b>depósito</b> do centro: cada hábito cumprido é uma tora ou uma pedra a mais; quando a pilha fecha 7, vira um andar. Depois gera energia, monta um rádio e chama gente pra visitar. Alguns ficam. Uma pessoa fica pra sempre. E a vila vira cidade.</div>
    <div class="t" style="margin:10px 0 4px">📦 O que cada hábito constrói</div>
    ${state.habitos.map(h => `<div class="row"><div><div class="t">${h.icone} ${esc(h.nome)} → ${S.DISTRITOS[h.distrito].nome}</div><div class="d">${S.descreveFreq(h)} · nível ${S.level(tot.por[h.id] || 0).lvl}, ${Math.round(S.level(tot.por[h.id] || 0).prog * 7)}/7 pro próximo</div></div></div>`).join('')}
    <div class="row"><div><div class="t">🔥 Fogueira · 🌤️ Clima · 🛡️ Escudo</div><div class="d">Fogueira acende à noite nos dias perfeitos (todos os hábitos do dia). 7+ dias seguidos: céu limpo e pássaros; falhou: névoa por 2 dias (nada é destruído). A cada 7 dias perfeitos acumulados, 1 escudo salva um dia falho.</div></div></div>
    <div class="t" style="margin:14px 0 4px">👨‍👩‍👧 Moradores <span class="d">(dias perfeitos acumulados: ${tot.perfect})</span></div>
    ${lista(S.HABITANTES, 'dias', 'dias', h => hab.includes(h.id))}
    <div class="t" style="margin:14px 0 4px">⚡ Tecnologia <span class="d">(hábitos cumpridos no total: ${tot.checks})</span></div>
    ${lista(S.TECNOLOGIAS, 'checks', 'hábitos', t => tec.includes(t.id))}
    <div class="t" style="margin:14px 0 4px">🏙️ Cidade <span class="d">(dias perfeitos)</span></div>
    ${lista(S.CIDADE, 'dias', 'dias', c => tot.perfect >= c.dias)}
    <div class="t" style="margin:14px 0 4px">🌫️ Horizonte <span class="d">(dias perfeitos)</span></div>
    ${lista(S.MILESTONES.map(m => ({ nome: m.desbloqueia, desc: m.nome + ' · +' + m.bonus + ' moedas', dias: m.dias })), 'dias', 'dias', m => tot.perfect >= m.dias)}
    <div class="d" style="font-size:12px;color:var(--muted);margin-top:12px"><b>É infinito.</b> As ilhas vizinhas sempre estiveram lá; depois do navio (100 dias), a cada 25 dias perfeitos ${esc(state.nome)} ocupa uma (cais + casa). Níveis e moedas não têm teto. Sol, lua e céu seguem o relógio de verdade.</div>
    <button class="ghost" id="edhab" style="margin-top:12px">⚙️ configurar hábitos e recompensas</button>`);
  $('#edhab').onclick = () => setup(1);
}

// ---------- configuracao (primeira vez e edicao) ----------
let draft = null;
function setup(passo = 1) {
  if (!draft) draft = { nome: state.nome, habitos: state.habitos.map(h => ({ ...h, dias: [...(h.dias || [])] })), rewards: state.rewards.map(r => ({ ...r })) };
  const N = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  if (passo === 1) {
    open(`<h2>⚙️ Seus hábitos <span class="d" style="font-size:12px">passo 1 de 2</span></h2>
      <div class="row"><div class="t">Nome de quem caiu na ilha</div><input class="price" style="width:140px" id="nome" value="${esc(draft.nome)}"></div>
      <div class="d" style="font-size:13px;color:var(--muted);margin:10px 0 6px">Cada hábito constrói um prédio na ilha. Toque numa sugestão pra adicionar, ou crie o seu.</div>
      <div id="sug" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${S.SUGESTOES_HABITOS.map((s, i) => draft.habitos.some(h => h.nome === s.nome) ? '' : `<button class="ghost" data-sug="${i}">${s.icone} ${esc(s.nome)}</button>`).join('')}<button class="ghost" id="novo">➕ outro</button></div>
      <div id="lista">${draft.habitos.map((h, i) => `<div class="row" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="t">${h.icone} ${esc(h.nome)} <span class="d">→ ${S.DISTRITOS[h.distrito].nome}</span></div><button class="ghost" data-del="${i}">remover</button></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select class="price" style="width:auto" data-tipo="${i}"><option value="diario" ${h.tipo === 'diario' ? 'selected' : ''}>todo dia</option><option value="dias" ${h.tipo === 'dias' ? 'selected' : ''}>dias fixos</option><option value="semana" ${h.tipo === 'semana' ? 'selected' : ''}>X vezes por semana</option></select>
          ${h.tipo === 'dias' ? N.map((n, d) => `<button class="ghost" data-dia="${i}:${d}" style="${h.dias.includes(d) ? 'background:var(--ok);color:#053' : ''}">${n}</button>`).join('') : ''}
          ${h.tipo === 'semana' ? `<input class="price" type="number" min="1" max="7" value="${h.vezes || 3}" data-vezes="${i}"> <span class="d">vezes/semana</span>` : ''}
          <select class="price" style="width:auto" data-dist="${i}">${Object.entries(S.DISTRITOS).map(([k, v]) => `<option value="${k}" ${h.distrito === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select>
        </div></div>`).join('') || '<div class="d">Nenhum hábito ainda.</div>'}</div>
      <button class="buy" id="prox" style="margin-top:14px;width:100%" ${draft.habitos.length ? '' : 'disabled'}>continuar →</button>`, state.setupDone);
    $('#nome').onchange = e => draft.nome = e.target.value.trim() || 'Bob';
    sheet.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = S.SUGESTOES_HABITOS[+b.dataset.sug]; draft.habitos.push({ id: S.uid(), nome: s.nome, icone: s.icone, distrito: s.distrito, tipo: 'diario', dias: [], vezes: 3 }); setup(1); });
    $('#novo').onclick = () => { const nome = prompt('Nome do hábito:'); if (!nome) return; const icone = prompt('Um emoji pra ele:', '⭐') || '⭐'; draft.habitos.push({ id: S.uid(), nome: nome.trim(), icone: icone.trim().slice(0, 2), distrito: 'oficina', tipo: 'diario', dias: [], vezes: 3 }); setup(1); };
    sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { draft.habitos.splice(+b.dataset.del, 1); setup(1); });
    sheet.querySelectorAll('[data-tipo]').forEach(s => s.onchange = () => { const h = draft.habitos[+s.dataset.tipo]; h.tipo = s.value; if (h.tipo === 'dias' && !h.dias.length) h.dias = [1, 3, 5]; setup(1); });
    sheet.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.dia.split(':').map(Number); const h = draft.habitos[i]; h.dias = h.dias.includes(d) ? h.dias.filter(x => x !== d) : [...h.dias, d]; setup(1); });
    sheet.querySelectorAll('[data-vezes]').forEach(i => i.onchange = () => { draft.habitos[+i.dataset.vezes].vezes = Math.max(1, Math.min(7, +i.value || 3)); });
    sheet.querySelectorAll('[data-dist]').forEach(s => s.onchange = () => { draft.habitos[+s.dataset.dist].distrito = s.value; setup(1); });
    $('#prox').onclick = () => setup(2);
  } else {
    open(`<h2>🎁 Suas recompensas <span class="d" style="font-size:12px">passo 2 de 2</span></h2>
      <div class="d" style="font-size:13px;color:var(--muted);margin-bottom:6px">O que você quer poder comprar com as moedas dos hábitos? Toque pra adicionar e ajuste o preço (1 moeda ≈ 1 hábito cumprido; dia perfeito dá +2).</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${S.SUGESTOES_RECOMPENSAS.map((s, i) => draft.rewards.some(r => r.nome === s.nome) ? '' : `<button class="ghost" data-sug="${i}">${esc(s.nome)}</button>`).join('')}<button class="ghost" id="novo">➕ outra</button></div>
      ${draft.rewards.map((r, i) => `<div class="row"><div><div class="t">${esc(r.nome)}</div><div class="d">${esc(r.desc || '')}</div>
        ${r.folga !== undefined ? `<div class="d" style="margin-top:4px">folga de: <select class="price" style="width:auto" data-folga="${i}">${draft.habitos.map(h => `<option value="${h.id}" ${r.folga === h.id ? 'selected' : ''}>${h.icone} ${esc(h.nome)}</option>`).join('')}</select></div>` : ''}</div>
        <div style="display:flex;gap:6px;align-items:center"><input class="price" type="number" min="1" value="${r.preco}" data-preco="${i}"><button class="ghost" data-del="${i}">✕</button></div></div>`).join('') || '<div class="d">Nenhuma recompensa ainda.</div>'}
      <div style="display:flex;gap:8px;margin-top:14px"><button class="ghost" id="volta">← hábitos</button><button class="buy" id="ok" style="flex:1" ${draft.rewards.length ? '' : 'disabled'}>${state.setupDone ? 'salvar' : 'começar a ilha 🏝️'}</button></div>`, state.setupDone);
    sheet.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { const s = S.SUGESTOES_RECOMPENSAS[+b.dataset.sug]; draft.rewards.push({ id: S.uid(), nome: s.nome, desc: s.desc, preco: s.preco, ...(s.folga ? { folga: (draft.habitos[0] || {}).id || '' } : {}) }); setup(2); });
    $('#novo').onclick = () => { const nome = prompt('Nome da recompensa:'); if (!nome) return; const preco = +prompt('Preço em moedas:', '20') || 20; draft.rewards.push({ id: S.uid(), nome: nome.trim(), desc: '', preco }); setup(2); };
    sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { draft.rewards.splice(+b.dataset.del, 1); setup(2); });
    sheet.querySelectorAll('[data-preco]').forEach(i => i.onchange = () => { draft.rewards[+i.dataset.preco].preco = Math.max(1, +i.value || 1); });
    sheet.querySelectorAll('[data-folga]').forEach(s => s.onchange = () => { draft.rewards[+s.dataset.folga].folga = s.value; });
    $('#volta').onclick = () => setup(1);
    $('#ok').onclick = () => {
      draft.rewards.forEach(r => { if (r.folga !== undefined && !draft.habitos.some(h => h.id === r.folga)) r.folga = (draft.habitos[0] || {}).id; });
      state.nome = draft.nome; state.habitos = draft.habitos; state.rewards = draft.rewards; state.setupDone = true; draft = null;
      S.save(state); close(); render(); toast(`Bem-vindo à ilha, ${state.nome}. Cada dia conta. 🏝️`, 4000);
    };
  }
}

document.querySelectorAll('#actions button').forEach(b => b.onclick = () => ({ loja, hist, fotos, info })[b.dataset.m]());

// ---------- inicio ----------
if (S.applyShield(state)) { S.save(state); toast('🛡️ Um escudo salvou o dia de ontem.'); }
render();
if (!state.setupDone) setup(1);
if (new Date().getDay() === 0) setTimeout(() => takeSnapshot(false), 4000);
setInterval(render, 60000);
