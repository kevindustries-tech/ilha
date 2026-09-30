-- Ilha: quem esta jogando. Rodar no Supabase -> SQL Editor (so le, nao muda nada).
-- ultimo_progresso = ultima vez que o app da pessoa subiu o save (marcou habito ou abriu logado).
-- Quem joga sem conta nao aparece: o progresso dessa pessoa so existe no celular dela.
select u.email,
       s.dados->>'nome'                                          as personagem,
       u.created_at::date                                        as criou_conta,
       u.last_sign_in_at                                         as ultimo_login,
       s.atualizado_em                                           as ultimo_progresso,
       (select count(*) from jsonb_object_keys(s.dados->'days')) as dias_com_registro
from auth.users u
left join public.saves s on s.user_id = u.id
order by s.atualizado_em desc nulls last;
