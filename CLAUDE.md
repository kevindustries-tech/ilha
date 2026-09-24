# CLAUDE.md — app Ilha

Responda sempre em **português**. Este repositório é só o app. O resto da vida do Kevin
(YuNiKe, pedidos, impressão 3D, BiBi, Tanque) fica no vault e **não se discute aqui**.

## Fonte de verdade das decisões
`C:\Users\kevin\SegundoCerebroPessoal\01 Projetos\Ilha - app de hábitos.md`

Conceito, mecânica, lore, progressão, histórico de versões e **a lista de bugs já corrigidos**.
Leia antes de mexer em regra de jogo, lore, economia de moedas ou ordem das obras — muita coisa
que parece arbitrária no código foi decisão pensada e está explicada lá.

O vault é outro diretório: na primeira vez peça acesso a `C:\Users\kevin\SegundoCerebroPessoal`.

## O que é
PWA de hábitos gamificado, beta só pro Kevin. Cada hábito cumprido vira 1 material; Bob levanta
22 construções em 4 fases (Sobreviver → Viver → Alcançar → Cidade) numa ilha 3D com terreno
procedural. Publicado em https://kevindustries-tech.github.io/ilha/

**Sem build e sem bundler**: HTML + ES modules + Three.js por importmap via CDN.

## Arquivos
| Arquivo | Papel |
|---|---|
| `index.html` | UI inteira — CSS e markup inline, importmap do Three |
| `state.js` | Regras: hábitos, streak, moedas, loja, obras, habitantes, cidade, tecnologias |
| `scene.js` | Ilha 3D: terreno, prédios, NPCs, dia/noite, clima (o maior, ~1.075 linhas) |
| `app.js` | Cola: render da UI, modais, cliques, configuração inicial |
| `nuvem.js` | Conta e sincronização no Supabase |
| `chars.js` | Personagens Kenney (FBX + skins), com boneco procedural de fallback |
| `sw.js` | Service worker (offline, rede-primeiro) |
| `server.py` | Servidor de dev sem cache |

Dados em `localStorage['ilha.v2']` (migra do v1).

## Regras de trabalho
- **Não introduzir bundler, npm, TypeScript ou framework.** O projeto é sem build de propósito:
  edita, salva, recarrega. Só mude isso se o Kevin pedir.
- Three.js entra por importmap no `index.html`, versão travada em **0.160.0**. Não soltar.
- **Mexeu em arquivo da lista `APP` do `sw.js`? Suba o `CACHE`** (`ilha-vX.Y`). Se esquecer, o
  PWA já instalado continua servindo a versão velha e o Kevin testa no celular sem entender por
  que nada mudou.
- `?sim=N` e `?hora=HH` na URL simulam progresso e hora sem salvar nada.
  Ex.: `?sim=150&hora=21`. Use pra conferir visual sem esperar dias.
- Servidor de dev: `preview_start {name: "ilha"}`. Serve com `Cache-Control: no-store`.

## Segredos
- A chave do Supabase no `nuvem.js` é a **publishable** — ela foi feita pra ficar no cliente;
  quem protege os dados é o RLS. Pode continuar no git.
- A chave **`service_role` nunca entra neste repositório** — nem em comentário, nem em `.env`
  de exemplo, nem "só pra testar". Repositório público: depois do push é pra sempre.

## Fim de cada bloco de trabalho
São **dois repositórios** e os dois precisam de commit e push:
1. `Documents\IlhaApp` → `kevindustries-tech/ilha` (código; GitHub Pages publica do `main`).
2. `SegundoCerebroPessoal` → registrar no **Log** e na seção da versão atual da nota do projeto.

O Kevin troca de máquina o tempo todo. O que não foi commitado nos dois, perdeu.

## Jeito de responder
Direto, passo a passo numerado quando for procedimento. Deu errado: diagnóstico + correção,
sem teoria. Discordar com motivo técnico é bem-vindo — ele prefere ser avisado antes de perder
tempo.
