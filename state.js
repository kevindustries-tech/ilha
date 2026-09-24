// Estado do app: habitos personalizaveis, moedas, loja, streaks. Tudo derivado do historico salvo em localStorage.
const KEY = 'ilha.v2';

// ---------------------------------------------------------------------------
// OBRAS DA ILHA
// Habito NAO constroi predio. Todo habito cumprido vale 1 material, igual, seja
// treino, leitura ou beber agua. Bob olha a pilha e levanta a proxima obra da
// lista, na ordem — o mais essencial primeiro. O usuario nao escolhe nada.
// 'custo' e ACUMULADO: total de materiais pra aquela obra estar de pe.
export const OBRAS = [
  // --- sobreviver ---
  { id: 'abrigo',   fase: 'Sobreviver', custo: 2,   nome: 'Abrigo de lona',   desc: 'A lona do avião esticada em dois galhos. Chove menos aqui dentro.' },
  { id: 'fogueira', fase: 'Sobreviver', custo: 5,   nome: 'Fogueira',         desc: 'Fogo pra espantar o frio e cozinhar. Acende nas noites de dia perfeito.' },
  { id: 'chuva',    fase: 'Sobreviver', custo: 10,  nome: 'Coletor de chuva', desc: 'Uma asa do avião virada pra cima e um tambor embaixo. Água limpa.' },
  { id: 'armadilha',fase: 'Sobreviver', custo: 16,  nome: 'Armadilha de caça', desc: 'Um caixote escorado num graveto, na trilha do javali. Carne sem precisar correr atrás.' },
  { id: 'horta',    fase: 'Sobreviver', custo: 24,  nome: 'Horta',            desc: 'As primeiras sementes. Comer deixa de depender de sorte e de caçada.' },
  { id: 'deposito', fase: 'Sobreviver', custo: 34,  nome: 'Depósito',         desc: 'Telheiro pra madeira, pedra e carne seca não estragarem na chuva.' },
  // --- viver ---
  { id: 'cabana',   fase: 'Viver', custo: 48,  nome: 'Cabana',         desc: 'Paredes de verdade e uma porta que fecha por dentro. Sai da barraca.' },
  { id: 'palicada', fase: 'Viver', custo: 62,  nome: 'Paliçada',       desc: 'Estacas apontadas pra fora, viradas pra mata. Dormir deixa de ser um risco calculado.' },
  { id: 'fogao',    fase: 'Viver', custo: 76,  nome: 'Fogão a lenha',  desc: 'Pedra, barro e uma chaminé. Comida quente todo dia.' },
  { id: 'poco',     fase: 'Viver', custo: 94,  nome: 'Poço',           desc: 'Cavado na rocha. Água o ano inteiro, não só quando chove.' },
  { id: 'oficina',  fase: 'Viver', custo: 116, nome: 'Oficina',        desc: 'Bancada com as ferramentas do avião. Daqui sai tudo o que vem depois.' },
  { id: 'curral',   fase: 'Viver', custo: 140, nome: 'Galinheiro',     desc: 'Ovos de manhã. A ilha começa a devolver em vez de só cobrar.' },
  // --- alcancar ---
  { id: 'moinho',   fase: 'Alcançar', custo: 168, nome: 'Moinho de vento', desc: 'O vento da ilha virando energia. A primeira luz à noite.' },
  { id: 'radio',    fase: 'Alcançar', custo: 200, nome: 'Torre de rádio',  desc: 'Feita com a antena do avião. Alguém, em algum lugar, escuta.' },
  { id: 'pier',     fase: 'Alcançar', custo: 238, nome: 'Píer',            desc: 'Pra quem vier de barco ter onde encostar.' },
  { id: 'farol',    fase: 'Alcançar', custo: 282, nome: 'Farol',           desc: 'Luz girando a noite toda. Ninguém mais passa reto pela ilha.' },
  // --- a vila vira cidade ---
  { id: 'casa1',    fase: 'Cidade', custo: 330, nome: 'Casa de morador', desc: 'A primeira casa que Bob não construiu pra si.' },
  { id: 'praca',    fase: 'Cidade', custo: 390, nome: 'Praça',           desc: 'Coreto, bancos e um lugar de todo mundo.' },
  { id: 'posto',    fase: 'Cidade', custo: 455, nome: 'Enfermaria',      desc: 'Cruz na fachada. Agora dá pra adoecer sem medo.' },
  { id: 'escola',   fase: 'Cidade', custo: 525, nome: 'Escola',          desc: 'Porque chegou gente nova, e gente nova cresce.' },
  { id: 'mercado',  fase: 'Cidade', custo: 600, nome: 'Mercado',         desc: 'A horta virou feira, e a feira virou loja.' },
  { id: 'camara',   fase: 'Cidade', custo: 700, nome: 'Prefeitura',      desc: 'Bandeira no topo. Deixou de ser acampamento.' },
];

// Estado das obras a partir do total de habitos cumpridos (1 habito = 1 material).
export function obrasEm(materiais) {
  const feitas = []; let base = 0;
  for (const o of OBRAS) {
    if (materiais >= o.custo) { feitas.push(o.id); base = o.custo; continue; }
    const precisa = o.custo - base, tem = materiais - base;
    return { feitas, atual: { ...o, tem, precisa, falta: precisa - tem, prog: precisa ? tem / precisa : 1 } };
  }
  return { feitas, atual: null };
}
export function obraDe(id) { return OBRAS.find(o => o.id === id); }

// Sugestoes na tela de configuracao. Nenhum habito esta ligado a nenhuma obra.
// Lista generica de proposito: este repositorio e publico. Os habitos de quem usa
// o app ficam so no localStorage dele, nunca no codigo.
export const SUGESTOES_HABITOS = [
  { nome: 'Treino',          icone: '🏋️' },
  { nome: 'Caminhada',       icone: '🚶' },
  { nome: 'Cardio',          icone: '🏃' },
  { nome: 'Alongamento',     icone: '🤸' },
  { nome: 'Beber água',      icone: '💧' },
  { nome: 'Dormir cedo',     icone: '😴' },
  { nome: 'Comer bem',       icone: '🥗' },
  { nome: 'Ler',             icone: '📕' },
  { nome: 'Estudar',         icone: '📚' },
  { nome: 'Meditar',         icone: '🧘' },
  { nome: 'Arrumar a casa',  icone: '🧹' },
  { nome: 'Skincare',        icone: '🧴' },
  { nome: 'Projeto pessoal', icone: '🛠️' },
];
export const SUGESTOES_RECOMPENSAS = [
  { nome: 'Comida favorita', desc: 'aquilo que você só come de vez em quando', preco: 15 },
  { nome: 'Sobremesa',       desc: '', preco: 12 },
  { nome: 'Pedir delivery',  desc: 'hoje ninguém cozinha', preco: 40 },
  { nome: '1 hora de tela',  desc: 'série, filme, jogo — o que for', preco: 10 },
  { nome: 'Dia de descanso', desc: 'folga de um hábito hoje, sem quebrar a sequência', preco: 25, folga: true },
  { nome: 'Passeio',         desc: 'sair sem motivo', preco: 50 },
  { nome: 'Compra pequena',  desc: 'aquele mimo', preco: 60 },
];
// O app nasce VAZIO: sem habito e sem recompensa. Quem abre escolhe os seus na
// tela de configuracao. Nada de default aqui — default vira o habito de todo
// mundo que instala, e a lista de habitos de uma pessoa e dado pessoal dela.
// A lista abaixo so converte um save 'ilha.v1' (formato de 20/09/2026, 3 habitos
// fixos) e nunca aparece pra quem instala o app agora.
const HABITOS_V1 = [
  { id: 'treino',     nome: 'Treino',    icone: '🏋️', tipo: 'diario', dias: [], vezes: 0 },
  { id: 'devocional', nome: 'Leitura',   icone: '📖', tipo: 'diario', dias: [], vezes: 0 },
  { id: 'comida',     nome: 'Comer bem', icone: '🥗', tipo: 'diario', dias: [], vezes: 0 },
];

export function today(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return today(new Date(y, m - 1, d + n)); }
export function weekday(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); } // 0 = domingo
export const uid = () => Math.random().toString(36).slice(2, 8);

export function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch {}
  let veioDoV1 = false;
  if (!s) { // migra v1 (formato antigo, de 3 habitos fixos)
    let v1 = null; try { v1 = JSON.parse(localStorage.getItem('ilha.v1')); } catch {}
    veioDoV1 = !!v1;
    s = v1 ? { ...v1, setupDone: true } : {};
  }
  // instalacao nova: nenhum habito. A configuracao abre no primeiro uso pedindo os seus.
  s.habitos = s.habitos || (veioDoV1 ? HABITOS_V1.map(h => ({ ...h })) : []);
  // 'desde' = dia em que o habito entrou. Antes disso ele nao conta: um habito novo
  // nao pode quebrar sequencia nem tirar moedas de dias que ja passaram.
  s.habitos.forEach(h => {
    if (h.desde) return;
    // sem 'desde' (habito criado antes desta versao): vale do 1o dia em que foi marcado,
    // senao do inicio. Assim um habito adicionado ontem nao apaga a sequencia de antes.
    const marcados = Object.keys(s.days || {}).filter(iso => s.days[iso] && s.days[iso][h.id]).sort();
    h.desde = marcados.length ? marcados[0] : (s.start || today());
  });
  s.days = s.days || {};            // 'YYYY-MM-DD' -> { [habitId]: true, folga: { [habitId]: true } }
  s.purchases = s.purchases || [];  // { date, id, preco }
  s.rewards = s.rewards || [];
  s.snapshots = s.snapshots || [];
  s.shieldsUsed = s.shieldsUsed || {};
  s.milestonesPaid = s.milestonesPaid || [];
  s.start = s.start || today();
  s.nome = s.nome || 'Bob';
  s.setupDone = !!s.setupDone;
  // null = save antigo: nao dispara aviso das obras que ja estavam prontas
  if (s.obrasVistas === undefined) s.obrasVistas = null;
  // migracao: v1 guardava descanso como days[iso].descanso
  for (const iso of Object.keys(s.days)) { const d = s.days[iso]; if (d.descanso && !d.folga) { d.folga = { treino: true }; delete d.descanso; } }
  return s;
}
export function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

// ---- quando um habito "vale" num dia ----
function weekStart(iso) { return addDays(iso, -((weekday(iso) + 6) % 7)); } // segunda
function doneRaw(s, iso, id) { const d = s.days[iso]; return !!(d && (d[id] || (d.folga && d.folga[id]))); }
export function isDue(h, iso) {
  if (h.tipo === 'dias') return h.dias.includes(weekday(iso));
  return true;
}
// Feito = marcou, ou folga, ou (X por semana) ainda "no prazo" da semana
export function dayDone(s, iso, id) {
  const h = s.habitos.find(x => x.id === id); if (!h) return false;
  if (h.desde && iso < h.desde) return true;   // habito ainda nao existia nesse dia
  if (doneRaw(s, iso, id)) return true;
  if (h.tipo === 'dias') return !h.dias.includes(weekday(iso));
  if (h.tipo === 'semana') {
    const ws = weekStart(iso); let feitos = 0;
    for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d > iso) break; if (doneRaw(s, d, id)) feitos++; }
    const restantes = 6 - ((weekday(iso) + 6) % 7); // dias que ainda vem nesta semana depois de hoje
    return feitos >= h.vezes || (h.vezes - feitos) <= restantes;
  }
  return false;
}
export function checked(s, iso, id) { return doneRaw(s, iso, id); }
export function isPerfect(s, iso) { return s.habitos.length > 0 && s.habitos.every(h => dayDone(s, iso, h.id)); }

export function streak(s, test) {
  let iso = today();
  if (!test(iso)) iso = addDays(iso, -1);
  let n = 0;
  while (test(iso) && iso >= s.start) { n++; iso = addDays(iso, -1); if (n > 5000) break; }
  return n;
}
export function habitStreak(s, id) {
  const h = s.habitos.find(x => x.id === id);
  return streak(s, iso => (!h || !h.desde || iso >= h.desde) && (dayDone(s, iso, id) || !!s.shieldsUsed[iso]));
}
export function perfectStreak(s) { return streak(s, iso => isPerfect(s, iso) || !!s.shieldsUsed[iso]); }

// totais: checks reais por habito (so marcados, nao "nao devidos")
export function totals(s) {
  const t = { perfect: 0, days: 0, checks: 0, por: {} };
  for (const h of s.habitos) t.por[h.id] = 0;
  for (const iso of Object.keys(s.days)) {
    let any = false;
    for (const h of s.habitos) if (doneRaw(s, iso, h.id)) { t.por[h.id]++; t.checks++; any = true; }
    if (any) t.days++;
    if (isPerfect(s, iso)) t.perfect++;
  }
  return t;
}
function multiplierAt(s, iso) {
  let n = 0, d = addDays(iso, -1);
  while ((isPerfect(s, d) || s.shieldsUsed[d]) && d >= s.start) { n++; d = addDays(d, -1); if (n > 5000) break; }
  if (isPerfect(s, iso)) n++;
  return n >= 30 ? 2 : n >= 7 ? 1.5 : 1;
}
export function coinsEarnedOn(s, iso) {
  let c = 0;
  for (const h of s.habitos) if (doneRaw(s, iso, h.id) && !(s.days[iso].folga && s.days[iso].folga[h.id])) c++;
  if (isPerfect(s, iso)) c += 2;
  return Math.round(c * multiplierAt(s, iso));
}
export const MILESTONES = [
  { dias: 7,   bonus: 10,  nome: 'Primeira semana',    desbloqueia: 'Pássaros' },
  { dias: 30,  bonus: 40,  nome: 'Um mês',             desbloqueia: 'Farol' },
  { dias: 60,  bonus: 60,  nome: 'Dois meses',         desbloqueia: 'Ponte e ilha vizinha' },
  { dias: 100, bonus: 100, nome: 'Cem dias perfeitos', desbloqueia: 'Navio' },
  { dias: 200, bonus: 150, nome: 'Duzentos dias',      desbloqueia: 'Montanha' },
];
export function coins(s) {
  let c = 0;
  for (const iso of Object.keys(s.days)) c += coinsEarnedOn(s, iso);
  const p = totals(s).perfect;
  for (const m of MILESTONES) if (p >= m.dias) c += m.bonus;
  for (const b of s.purchases) c -= b.preco;
  return c;
}

// Quem mora na ilha. O nome do protagonista e configuravel (s.nome).
export const HABITANTES = [
  { dias: 0,   id: 'bob',       tipo: 'pessoa',   cor: 0x3b82f6, nome: 'O sobrevivente',     desc: 'Único a bordo quando o avião caiu. Podia ir embora; preferiu construir.' },
  { dias: 10,  id: 'rex',       tipo: 'cachorro', cor: 0xc68642, nome: 'Rex',                desc: 'Um cachorro apareceu na praia e ficou.' },
  { dias: 45,  id: 'amigo1',    tipo: 'pessoa',   cor: 0x16a34a, nome: 'Primeiro visitante', desc: 'Ouviu o rádio e veio de barco passear. Não foi embora.' },
  { dias: 60,  id: 'amiga1',    tipo: 'pessoa',   cor: 0xe11d48, nome: 'Nova amiga',         desc: 'Veio conhecer a ilha que todo mundo comenta.' },
  { dias: 80,  id: 'amor',      tipo: 'pessoa',   cor: 0xf472b6, nome: 'O grande amor',      desc: 'Agora não se constrói mais só pra si.' },
  { dias: 105, id: 'casamento', tipo: 'festa',    cor: 0xffcc4d, nome: 'Casamento',          desc: 'Festa na praça: bandeirinhas na ilha pra sempre.' },
  { dias: 120, id: 'casa',      tipo: 'casa',     cor: 0xf1e7d0, nome: 'Casa da família',    desc: 'Sai da barraca, entra numa casa de verdade, com chaminé.' },
  { dias: 180, id: 'bebe',      tipo: 'crianca',  cor: 0xfbbf24, nome: 'Chegou um bebê',     desc: 'A ilha agora tem futuro.' },
  { dias: 240, id: 'amigo2',    tipo: 'pessoa',   cor: 0x8b5cf6, nome: 'Mais moradores',     desc: 'A vila vira cidade.' },
  { dias: 365, id: 'festa',     tipo: 'pessoa',   cor: 0xf59e0b, nome: 'Um ano inteiro',     desc: 'Aniversário da ilha.' },
];
export function habitantes(perfect) { return HABITANTES.filter(h => perfect >= h.dias); }
export const CIDADE = [
  { dias: 130, id: 'padaria',    nome: 'Padaria',        desc: 'Pão quente de manhã. O primeiro comércio.' },
  { dias: 150, id: 'mercado',    nome: 'Mercado',        desc: 'A feira da horta virou loja.' },
  { dias: 170, id: 'hospital',   nome: 'Posto de saúde', desc: 'Cruz vermelha na fachada.' },
  { dias: 200, id: 'seguranca',  nome: 'Segurança',      desc: 'Luz azul na porta, ninguém dorme com medo.' },
  { dias: 230, id: 'escola',     nome: 'Escola',         desc: 'O bebê vai crescer.' },
  { dias: 260, id: 'prefeitura', nome: 'Prefeitura',     desc: 'Bandeira no topo.' },
  { dias: 300, id: 'praca',      nome: 'Praça',          desc: 'Coreto e bancos no centro.' },
  { dias: 330, id: 'porto',      nome: 'Porto',          desc: 'Cais pra quem chega e pra quem vai.' },
  { dias: 400, id: 'biblioteca', nome: 'Biblioteca',     desc: 'Tudo o que se aprendeu, guardado.' },
  { dias: 450, id: 'oficina',    nome: 'Oficina',        desc: 'Onde se inventa a próxima coisa.' },
];
export function cidade(perfect) { return CIDADE.filter(c => perfect >= c.dias).map(c => c.id); }
export const TECNOLOGIAS = [
  { checks: 9,   id: 'gerador',  nome: 'Gerador de manivela',   desc: 'Feito com o motor de arranque do avião. Primeira luz nos postes.' },
  { checks: 75,  id: 'solar',    nome: 'Painéis solares',       desc: 'Resgatados da carga do avião. Postes acendem toda noite.' },
  { checks: 210, id: 'internet', nome: 'Parabólica — internet', desc: 'A ilha entra na rede.' },
];
export function tecnologias(totalChecks) { return TECNOLOGIAS.filter(t => totalChecks >= t.checks).map(t => t.id); }
export function ilhasExtras(perfect) { return Math.max(0, Math.floor((perfect - 100) / 25)); }

export function shields(s) { return Math.floor(totals(s).perfect / 7) - Object.keys(s.shieldsUsed).length; }
export function applyShield(s) {
  const y = addDays(today(), -1);
  if (y < s.start) return false;
  if (!isPerfect(s, y) && !s.shieldsUsed[y] && shields(s) > 0 && Object.keys(s.days).length > 0) { s.shieldsUsed[y] = true; return true; }
  return false;
}
export function toggle(s, id) {
  const iso = today(); const d = s.days[iso] = s.days[iso] || {};
  if (d.folga && d.folga[id]) return;
  d[id] = !d[id];
}
// fiado = true permite comprar sem saldo: o saldo fica negativo (divida) e as
// proximas moedas ganhas pagam a divida primeiro.
export function buy(s, id, fiado = false) {
  const r = s.rewards.find(r => r.id === id);
  if (!r) return false;
  const c = coins(s);
  if (c < r.preco && !fiado) return false;
  s.purchases.push({ date: today(), id, preco: r.preco, fiado: c < r.preco });
  if (r.folga) { const d = s.days[today()] = s.days[today()] || {}; d.folga = d.folga || {}; d.folga[r.folga] = true; }
  return true;
}
export const debt = s => Math.max(0, -coins(s));
export function boughtToday(s, id) { return s.purchases.some(p => p.date === today() && p.id === id); }
export function folgaHoje(s, id) { const d = s.days[today()]; return !!(d && d.folga && d.folga[id]); }
export function level(count) { return { lvl: Math.floor(count / 7), prog: (count % 7) / 7 }; }
export function weather(s) {
  const ps = perfectStreak(s);
  const y1 = addDays(today(), -1), y2 = addDays(today(), -2);
  const failed = [y1, y2].some(d => d >= s.start && !isPerfect(s, d) && !s.shieldsUsed[d]);
  const started = Object.keys(s.days).length > 0 && y1 >= s.start;
  return { clear: ps >= 7, fog: started && failed && ps === 0 };
}
export function descreveFreq(h) {
  if (h.tipo === 'diario') return 'todo dia';
  if (h.tipo === 'semana') return `${h.vezes}× por semana`;
  const N = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return h.dias.slice().sort().map(d => N[d]).join(', ') || 'nenhum dia';
}
