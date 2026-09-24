// Conta e sincronizacao no Supabase.
//
// Regras do projeto:
// - O localStorage continua sendo a fonte durante o jogo. A nuvem e copia de
//   seguranca, entao o app funciona offline igual antes.
// - O Supabase e carregado sob demanda, por import dinamico. Se o CDN cair ou o
//   celular estiver sem rede, o app nao quebra: so fica sem sincronizar.
// - Login e por e-mail + senha, no Auth do Supabase (que cuida do hash da senha
//   e da sessao). Antes o app montava um e-mail interno a partir do usuario
//   ('bob@ilha.app'): dominio que nao existe, caixa que ninguem le, e por isso
//   nao havia como recuperar senha nenhuma. Agora o e-mail e o de verdade.
// - AINDA NAO DA PRA RECUPERAR SENHA: falta configurar um SMTP proprio no
//   Supabase (o servidor de teste dele so entrega pra membro do projeto). O
//   e-mail ja fica guardado; quando o SMTP estiver de pe e so ligar o
//   resetPasswordForEmail e a tela de senha nova.
// - As fotos da linha do tempo NAO sobem: sao JPEG em base64 e 60 delas passam
//   de 6 MB. Elas ficam no aparelho.

const URL_SB = 'https://zyvoxvhvpcoegitlrnpt.supabase.co';
const CHAVE  = 'sb_publishable_SN8Goc3eIREb1B2UOl_lDw_qS7Oua5K';   // publishable: feita pra ficar no cliente; quem protege os dados e o RLS
const CDN    = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let _sb = null, _erroCdn = false;
async function cliente() {
  if (_sb) return _sb;
  if (_erroCdn) return null;
  try {
    const { createClient } = await import(CDN);
    _sb = createClient(URL_SB, CHAVE, { auth: { persistSession: true, autoRefreshToken: true } });
    return _sb;
  } catch (e) { _erroCdn = true; console.warn('Supabase indisponivel:', e); return null; }
}

const limpaEmail = e => String(e || '').trim().toLowerCase();
export const emailValido = e => /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(limpaEmail(e));

export async function sessao() {
  const sb = await cliente(); if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session || null;
}
export async function quemSou() {
  const s = await sessao();
  return s ? (s.user.email || '') : null;
}

export async function criarConta(email, senha) {
  const sb = await cliente(); if (!sb) return { erro: 'sem conexão com o servidor' };
  const { error } = await sb.auth.signUp({ email: limpaEmail(email), password: senha });
  if (error) return { erro: traduz(error.message) };
  // Com "Confirm email" desligado o signUp ja deixa a sessao aberta; se nao,
  // entra em seguida pra garantir.
  if (!(await sessao())) return entrar(email, senha);
  return { ok: true };
}

export async function entrar(email, senha) {
  const sb = await cliente(); if (!sb) return { erro: 'sem conexão com o servidor' };
  const { error } = await sb.auth.signInWithPassword({ email: limpaEmail(email), password: senha });
  if (error) return { erro: traduz(error.message) };
  return { ok: true };
}

export async function sair() {
  const sb = await cliente(); if (sb) await sb.auth.signOut();
}

function traduz(m) {
  const s = String(m).toLowerCase();
  if (s.includes('invalid login')) return 'e-mail ou senha errados';
  if (s.includes('already registered') || s.includes('already been registered')) return 'já existe conta com esse e-mail';
  if (s.includes('email') && (s.includes('invalid') || s.includes('valid'))) return 'esse e-mail não parece válido';
  if (s.includes('confirm')) return 'confirme o e-mail antes de entrar';
  if (s.includes('password') && s.includes('6')) return 'a senha precisa de pelo menos 6 caracteres';
  if (s.includes('rate') || s.includes('many')) return 'muitas tentativas seguidas, espera um minuto';
  return m;
}

// ---------------------------------------------------------------- dados ----
// Tudo menos as fotos.
const semFotos = est => { const c = { ...est }; delete c.snapshots; return c; };

export async function baixar() {
  const sb = await cliente(); if (!sb) return null;
  const s = await sessao(); if (!s) return null;
  const { data, error } = await sb.from('saves').select('dados, atualizado_em').eq('user_id', s.user.id).maybeSingle();
  if (error) { console.warn('baixar:', error.message); return null; }
  return data ? { dados: data.dados, quando: data.atualizado_em } : null;
}

export async function subir(estado) {
  const sb = await cliente(); if (!sb) return { erro: 'sem conexão' };
  const s = await sessao(); if (!s) return { erro: 'sem sessão' };
  const { error } = await sb.from('saves')
    .upsert({ user_id: s.user.id, dados: semFotos(estado), atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) { console.warn('subir:', error.message); return { erro: error.message }; }
  return { ok: true };
}

// Quantos dias o save tem de fato marcado. E o criterio pra decidir qual vale
// quando o aparelho e a nuvem discordam: ninguem quer perder o mais completo.
export function tamanho(est) {
  if (!est || !est.days) return 0;
  return Object.keys(est.days).filter(d => Object.keys(est.days[d] || {}).length).length;
}

// Sobe no maximo uma vez a cada 4 s, e nunca durante o jogo trava a tela.
let timer = null, pendente = null;
export function agendarSubida(estado, aviso) {
  pendente = estado;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const est = pendente; pendente = null;
    if (!(await sessao())) return;
    const r = await subir(est);
    if (aviso) aviso(r);
  }, 4000);
}
