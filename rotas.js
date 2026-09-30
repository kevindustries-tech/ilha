// Rotas dos moradores. Antes cada um andava em linha reta ate o destino e
// atravessava casa, poco e paliçada. Agora o planalto da vila vira uma grade: as
// construcoes marcam celulas bloqueadas e o caminho sai de um A* com atalho por
// linha de visada (quem enxerga o destino vai reto, sem zigue-zague de grade).

export function criarGrade(meio, passo = .6) {
  const n = Math.ceil(meio * 2 / passo);
  const bloq = new Uint8Array(n * n);
  const id = (i, j) => j * n + i;
  const cel = (x, z) => [Math.floor((x + meio) / passo), Math.floor((z + meio) / passo)];
  const centro = (i, j) => [-meio + (i + .5) * passo, -meio + (j + .5) * passo];
  const naGrade = (i, j) => i >= 0 && j >= 0 && i < n && j < n;
  const livreIJ = (i, j) => naGrade(i, j) && !bloq[id(i, j)];
  const custo = new Float32Array(n * n), veio = new Int32Array(n * n), marca = new Uint32Array(n * n), heap = [];
  let geracao = 0;

  function limpar() { bloq.fill(0); }
  function marcarCaixa(x0, z0, x1, z1) {
    const [i0, j0] = cel(x0, z0), [i1, j1] = cel(x1, z1);
    for (let j = Math.max(0, j0); j <= Math.min(n - 1, j1); j++)
      for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) bloq[id(i, j)] = 1;
  }
  function marcarCirculo(x, z, r) {
    const [i0, j0] = cel(x - r, z - r), [i1, j1] = cel(x + r, z + r);
    for (let j = Math.max(0, j0); j <= Math.min(n - 1, j1); j++)
      for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) {
        const [cx, cz] = centro(i, j);
        if (Math.hypot(cx - x, cz - z) <= r) bloq[id(i, j)] = 1;
      }
  }
  // celula livre mais proxima (destino caiu dentro de uma parede, por exemplo)
  function maisPertoLivre(i, j) {
    for (let raio = 1; raio < 30; raio++)
      for (let dj = -raio; dj <= raio; dj++) for (let di = -raio; di <= raio; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== raio) continue;
        if (livreIJ(i + di, j + dj)) return [i + di, j + dj];
      }
    return null;
  }
  // da pra ir reto de A ate B sem passar por celula bloqueada?
  function visada(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(d / (passo * .5)));
    for (let s = 1; s <= k; s++) {
      const [i, j] = cel(ax + (bx - ax) * s / k, az + (bz - az) * s / k);
      if (naGrade(i, j) && bloq[id(i, j)]) return false;
    }
    return true;
  }

  // Devolve a lista de pontos [x, z] ate o destino (o ultimo e o proprio destino,
  // ou a celula livre mais perto dele).
  function rota(ax, az, bx, bz) {
    let [si, sj] = cel(ax, az), [gi, gj] = cel(bx, bz);
    if (!naGrade(si, sj) || !naGrade(gi, gj)) return [[bx, bz]];   // fora da vila: reto
    if (!livreIJ(gi, gj)) { const p = maisPertoLivre(gi, gj); if (!p) return [[bx, bz]]; [gi, gj] = p; [bx, bz] = centro(gi, gj); }
    if (visada(ax, az, bx, bz)) return [[bx, bz]];
    // saiu de dentro de uma parede (obra nova em cima de quem estava ali): comeca da borda
    if (!livreIJ(si, sj)) { const p = maisPertoLivre(si, sj); if (p) [si, sj] = p; }

    geracao++; heap.length = 0;   // memoria reaproveitada: custo so vale se marca[c] === geracao
    const custoDe = c => marca[c] === geracao ? custo[c] : Infinity;
    const push = (f, c) => { heap.push([f, c]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = (i, j) => { const dx = Math.abs(i - gi), dy = Math.abs(j - gj); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const ini = id(si, sj), fim = id(gi, gj);
    marca[ini] = geracao; custo[ini] = 0; veio[ini] = -1; push(h(si, sj), ini);
    let achou = false, visitas = 0;
    while (heap.length && visitas++ < 40000) {
      const [, c] = pop();
      if (c === fim) { achou = true; break; }
      const ci = c % n, cj = (c / n) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!livreIJ(ni, nj)) continue;
        if (di && dj && (!livreIJ(ci + di, cj) || !livreIJ(ci, cj + dj))) continue;   // nao corta quina
        const nc = id(ni, nj), g = custo[c] + (di && dj ? Math.SQRT2 : 1);
        if (g < custoDe(nc)) { marca[nc] = geracao; custo[nc] = g; veio[nc] = c; push(g + h(ni, nj), nc); }
      }
    }
    if (!achou) return [[bx, bz]];
    const cels = [];
    for (let c = fim; c !== -1 && c !== ini; c = veio[c]) cels.push(centro(c % n, (c / n) | 0));
    cels.reverse(); cels[cels.length - 1] = [bx, bz];
    // atalho: de onde estou, pula pro ponto mais longe que eu consigo enxergar
    const caminho = []; let ox = ax, oz = az, k = 0;
    while (k < cels.length) {
      let melhor = k;
      for (let m = cels.length - 1; m > k; m--) if (visada(ox, oz, cels[m][0], cels[m][1])) { melhor = m; break; }
      caminho.push(cels[melhor]); [ox, oz] = cels[melhor]; k = melhor + 1;
    }
    return caminho;
  }

  return { limpar, marcarCaixa, marcarCirculo, rota, livre: (x, z) => { const [i, j] = cel(x, z); return livreIJ(i, j); } };
}
