-- =============================================================================
-- Ilha: amigos.  Rodar UMA vez no Supabase -> SQL Editor -> New query -> Run.
-- Pode rodar de novo sem estragar nada (tudo e "if not exists" / "or replace").
--
-- Regra de privacidade: amigo NUNCA le a tabela `saves` (la tem nome de habito e
-- de recompensa). O app publica uma `vitrine` so com numeros e o estado da ilha,
-- e o amigo so enxerga a vitrine -- e so depois que os dois aceitaram.
--
-- Tudo o que envolve outra pessoa passa pelas funcoes la embaixo (security
-- definer). As tabelas em si so deixam cada um ver e mexer no proprio registro.
-- Pra auditar o que um amigo ve, basta ler `meus_amigos()`.
-- =============================================================================

-- Perfil publico minimo: codigo de amigo + nome do personagem.
create table if not exists public.perfis (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  codigo    text not null unique,
  nome      text not null default 'Bob',
  criado_em timestamptz not null default now()
);

-- O que o amigo ve: numeros e estado da ilha, publicados pelo proprio app.
create table if not exists public.vitrines (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Pedido de `de` para `para`. Vira amizade quando `para` aceita.
create table if not exists public.amizades (
  de        uuid not null references auth.users(id) on delete cascade,
  para      uuid not null references auth.users(id) on delete cascade,
  aceita    boolean not null default false,
  criado_em timestamptz not null default now(),
  primary key (de, para),
  check (de <> para)
);
create index if not exists amizades_para on public.amizades (para);

alter table public.perfis   enable row level security;
alter table public.vitrines enable row level security;
alter table public.amizades enable row level security;

-- Explicito de proposito: projeto novo do Supabase pode vir sem expor tabela nova
-- na API automaticamente. Quem de fato filtra as linhas sao as policies abaixo.
grant select                 on public.perfis   to authenticated;
grant select, insert, update on public.vitrines to authenticated;
grant select                 on public.amizades to authenticated;

-- Cada um ve o proprio perfil. Criar e renomear: so pela funcao garantir_perfil.
drop policy if exists "perfil: ver o meu" on public.perfis;
create policy "perfil: ver o meu" on public.perfis
  for select to authenticated using (user_id = auth.uid());

-- Vitrine: cada um le e escreve a propria. A dos amigos chega por meus_amigos().
drop policy if exists "vitrine: ver a minha" on public.vitrines;
create policy "vitrine: ver a minha" on public.vitrines
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "vitrine: criar a minha" on public.vitrines;
create policy "vitrine: criar a minha" on public.vitrines
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "vitrine: atualizar a minha" on public.vitrines;
create policy "vitrine: atualizar a minha" on public.vitrines
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Amizades: ve as que te envolvem. Criar, aceitar e desfazer: so pelas funcoes.
drop policy if exists "amizade: ver as minhas" on public.amizades;
create policy "amizade: ver as minhas" on public.amizades
  for select to authenticated using (auth.uid() in (de, para));

-- -----------------------------------------------------------------------------
-- Cria o perfil (com codigo unico de 6 letras) ou atualiza o nome. Devolve o codigo.
-- Alfabeto sem 0/O/1/I pra ninguem errar digitando.
create or replace function public.garantir_perfil(nome_personagem text)
returns text language plpgsql security definer set search_path = public as $$
declare
  c text;
  nm text := left(coalesce(nullif(trim(nome_personagem), ''), 'Bob'), 30);
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  loop
    select codigo into c from perfis where user_id = auth.uid();
    if c is not null then
      update perfis set nome = nm where user_id = auth.uid() and nome is distinct from nm;
      return c;
    end if;
    c := '';
    for i in 1..6 loop
      c := c || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    begin
      insert into perfis (user_id, codigo, nome) values (auth.uid(), c, nm);
      return c;
    exception when unique_violation then
      -- codigo repetido (ou perfil criado em paralelo): volta pro comeco do loop
    end;
  end loop;
end $$;

-- Manda pedido pelo codigo. Se o outro ja tinha pedido, vira amizade na hora.
-- Devolve: 'pedido' | 'aceita' | 'ja_amigos' | 'nao_existe' | 'eu_mesmo'
create or replace function public.pedir_amizade(codigo_amigo text)
returns text language plpgsql security definer set search_path = public as $$
declare alvo uuid;
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  select user_id into alvo from perfis where codigo = upper(replace(trim(codigo_amigo), '-', ''));
  if alvo is null then return 'nao_existe'; end if;
  if alvo = auth.uid() then return 'eu_mesmo'; end if;
  if exists (select 1 from amizades where aceita and ((de = auth.uid() and para = alvo) or (de = alvo and para = auth.uid()))) then
    return 'ja_amigos';
  end if;
  if exists (select 1 from amizades where de = alvo and para = auth.uid()) then
    update amizades set aceita = true where de = alvo and para = auth.uid();
    return 'aceita';
  end if;
  insert into amizades (de, para) values (auth.uid(), alvo) on conflict do nothing;
  return 'pedido';
end $$;

-- Manda pedido pelo E-MAIL do amigo (jeito principal; o codigo continua valendo no link
-- de convite). Mesmas respostas do pedir_amizade. Diz quando o e-mail nao tem conta: num
-- jogo entre familia e amigos a mensagem clara vale mais que esconder quem joga.
create or replace function public.pedir_amizade_email(email_amigo text)
returns text language plpgsql security definer set search_path = public as $$
declare alvo uuid;
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  select id into alvo from auth.users where lower(email) = lower(trim(email_amigo)) limit 1;
  if alvo is null then return 'nao_existe'; end if;
  if alvo = auth.uid() then return 'eu_mesmo'; end if;
  if exists (select 1 from amizades where aceita and ((de = auth.uid() and para = alvo) or (de = alvo and para = auth.uid()))) then
    return 'ja_amigos';
  end if;
  if exists (select 1 from amizades where de = alvo and para = auth.uid()) then
    update amizades set aceita = true where de = alvo and para = auth.uid();
    return 'aceita';
  end if;
  insert into amizades (de, para) values (auth.uid(), alvo) on conflict do nothing;
  return 'pedido';
end $$;

-- Quem recebeu o pedido aceita ou recusa.
create or replace function public.responder_amizade(amigo uuid, aceitar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  if aceitar then
    update amizades set aceita = true where de = amigo and para = auth.uid();
  else
    delete from amizades where de = amigo and para = auth.uid();
  end if;
end $$;

-- Desfaz amizade ou cancela pedido, de qualquer um dos lados.
create or replace function public.desfazer_amizade(amigo uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;
  delete from amizades where (de = auth.uid() and para = amigo) or (de = amigo and para = auth.uid());
end $$;

-- A lista da aba Amigos. A vitrine so vem quando a amizade foi aceita.
-- ESTA E A UNICA PORTA pela qual um usuario enxerga dado de outro.
-- (mudou o formato da resposta: agora vem o e-mail -- o nome do personagem de todo mundo
-- pode ser "Bob". Trocar o retorno de uma funcao exige apagar a antiga antes.)
drop function if exists public.meus_amigos();
create or replace function public.meus_amigos()
returns table (amigo uuid, nome text, email text, aceita boolean, pedi_eu boolean, vitrine jsonb, atualizado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, coalesce(p.nome, 'Jogador'), u.email::text, a.aceita, a.de = auth.uid(),
         case when a.aceita then v.dados end,
         case when a.aceita then v.atualizado_em end
  from amizades a
  cross join lateral (select case when a.de = auth.uid() then a.para else a.de end as id) o
  join auth.users u on u.id = o.id
  left join perfis p on p.user_id = o.id           -- quem ainda nao abriu a aba Amigos nao tem perfil
  left join vitrines v on v.user_id = o.id
  where auth.uid() in (a.de, a.para)
$$;

-- So quem esta logado chama as funcoes.
revoke all on function public.garantir_perfil(text)            from public, anon;
revoke all on function public.pedir_amizade(text)              from public, anon;
revoke all on function public.pedir_amizade_email(text)        from public, anon;
revoke all on function public.responder_amizade(uuid, boolean) from public, anon;
revoke all on function public.desfazer_amizade(uuid)           from public, anon;
revoke all on function public.meus_amigos()                    from public, anon;
grant execute on function public.garantir_perfil(text)            to authenticated;
grant execute on function public.pedir_amizade(text)              to authenticated;
grant execute on function public.pedir_amizade_email(text)        to authenticated;
grant execute on function public.responder_amizade(uuid, boolean) to authenticated;
grant execute on function public.desfazer_amizade(uuid)           to authenticated;
grant execute on function public.meus_amigos()                    to authenticated;
