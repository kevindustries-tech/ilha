# -*- coding: utf-8 -*-
"""Gera os mapas de recolorir das skins Kenney (rodar de novo so se entrar skin nova).

Todas as skins da Kenney usam o MESMO mapa de UV do characterMedium: cabeca em cima a
esquerda, camiseta embaixo a esquerda, calca embaixo a direita. As cores sao chapadas com
sombreado suave, entao da pra achar cada parte pela cor dominante da regiao.

Saida (em assets/):
  mascara-<skin>.png  512x512, tons de cinza: 0 nada, 60 pele, 120 cabelo, 180 camiseta, 240 calca
  visual.json         cor original (dominante) de cada parte, por skin -- o jogo recolore
                      como  nova = alvo + (pixel - original), que mantem sombra e estampa.
Uso:  python tools/gerar_mascaras.py  [--debug pasta]   (debug salva as mascaras pintadas)
"""
import colorsys, json, os, sys
from collections import Counter
from PIL import Image

SKINS = ['survivorMaleB', 'skaterMaleA', 'criminalMaleA', 'survivorFemaleA', 'skaterFemaleA', 'cyborgFemaleA']
AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, '..', 'assets')
T = 512                                              # tamanho da textura no jogo
CAT = {'pele': 60, 'cabelo': 120, 'camisa': 180, 'calca': 240}

# Franja que cai sobre o olho (so a Skatista): e cabelo mesmo dentro da area do rosto -- sem
# isso ela ficava um bloco preto na cara de quem pintava o cabelo claro.
EXTRA_CABELO = {'skaterFemaleA': [(158, 94, 207, 128)]}
# regioes em coordenadas de 512 (o atlas original e 1024: tudo /2)
CABECA = (0, 0, 320, 245)
# olho e boca moram aqui: cabelo nao entra. Comeca em 100 (e nao 60): acima disso e a franja
# pintada, e deixar ela fora fazia uma faixa escura na testa de quem pintava o cabelo claro.
# Vai de x 123 a 200: mais largo pegava cabelo das temporas (ficava um retangulo escuro).
ROSTO = (123, 100, 200, 170)
CAMISA = (0, 245, 305, 512)
CALCA = (305, 382, 512, 512)
# onde colher a cor dominante de cada parte
AMOSTRA = {'pele': (115, 175, 205, 235), 'cabelo': (0, 0, 320, 28), 'camisa': (95, 285, 230, 480), 'calca': (330, 400, 500, 500)}
TOL = {'pele': 44, 'cabelo': 46, 'camisa': 58, 'calca': 52}


def hsv(c):
    return colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)


def saturada(c):
    h, s_, v = hsv(c)
    return s_ > .28 and v > .3


def dominante(px, caixa):
    x0, y0, x1, y1 = caixa
    cont = Counter()
    todos = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    # se boa parte da regiao e colorida, a cor da peca e a colorida: manchas de sujeira sao
    # cinza-marrom e, contando tudo, ganhavam da calca caqui da Naufraga
    sat = [c for c in todos if saturada(c)]
    base = sat if len(sat) > .3 * len(todos) else todos
    for r, g, b in base:
        cont[(r // 6, g // 6, b // 6)] += 1
    q = cont.most_common(1)[0][0]
    # media dos pixels desse balde (a cor "de verdade", nao a quantizada)
    tot = [0, 0, 0]; n = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (r // 6, g // 6, b // 6) == q:
                tot[0] += r; tot[1] += g; tot[2] += b; n += 1
    return [round(t / n) for t in tot]


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** .5


def parecida(c, d, tol):
    # Peca colorida: mesmo tom (hue) e saturacao parecida, qualquer claridade -- pega o degrade
    # inteiro da roupa. Peca sem cor (branco, preto, cinza): distancia de cor mesmo.
    if saturada(d):
        hc, sc, vc = hsv(c); hd, sd, vd = hsv(d)
        dh = min(abs(hc - hd), 1 - abs(hc - hd))
        return dh < .045 and abs(sc - sd) < .3 and vc > .18
    return dist(c, d) < tol


def dentro(x, y, c):
    return c[0] <= x < c[2] and c[1] <= y < c[3]


def mascara(skin):
    im = Image.open(os.path.join(ASSETS, skin + '.png')).convert('RGB').resize((T, T), Image.BOX)
    px = im.load()
    dom = {k: dominante(px, c) for k, c in AMOSTRA.items()}
    m = Image.new('L', (T, T), 0); mp = m.load()
    for y in range(T):
        for x in range(T):
            c = px[x, y]
            # prioridade: calca e camiseta (na regiao delas) > cabelo (na cabeca, fora do rosto) > pele (em qualquer lugar)
            if dentro(x, y, CALCA) and parecida(c, dom['calca'], TOL['calca']): mp[x, y] = CAT['calca']
            elif dentro(x, y, CAMISA) and parecida(c, dom['camisa'], TOL['camisa']) and dist(c, dom['pele']) > 20: mp[x, y] = CAT['camisa']
            elif dentro(x, y, CABECA) and (not dentro(x, y, ROSTO) or any(dentro(x, y, r) for r in EXTRA_CABELO.get(skin, []))) and dist(c, dom['cabelo']) < TOL['cabelo']: mp[x, y] = CAT['cabelo']
            elif dist(c, dom['pele']) < TOL['pele']: mp[x, y] = CAT['pele']
    return m, dom, im


def main():
    debug = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    cores = {}
    for s in SKINS:
        m, dom, im = mascara(s)
        m.save(os.path.join(ASSETS, 'mascara-%s.png' % s), optimize=True)
        cores[s] = dom
        if debug:
            os.makedirs(debug, exist_ok=True)
            pint = {60: (255, 0, 255), 120: (255, 230, 0), 180: (0, 200, 255), 240: (0, 255, 80)}
            ov = im.copy(); op = ov.load(); mp = m.load()
            for y in range(T):
                for x in range(T):
                    if mp[x, y]: op[x, y] = pint[mp[x, y]]
            lado = Image.new('RGB', (T * 2, T)); lado.paste(im, (0, 0)); lado.paste(ov, (T, 0))
            lado.save(os.path.join(debug, 'debug-%s.png' % s))
        print(s, dom)
    with open(os.path.join(ASSETS, 'visual.json'), 'w', encoding='utf-8') as f:
        json.dump(cores, f, indent=1)


if __name__ == '__main__':
    main()
