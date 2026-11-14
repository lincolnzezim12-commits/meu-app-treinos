// Teste de ponta a ponta do app (Playwright, simulando um iPhone).
// Uso:  python3 -m http.server 8765   (na pasta do projeto, em outro terminal)
//       node testes/e2e.js [pasta-para-screenshots]
const { chromium, devices } = require('playwright');
const assert = require('assert');

const URL_APP = process.env.URL_APP || 'http://localhost:8765/';
const SHOTS = process.argv[2] || null;

// Ficha aprovada — é isto que o app precisa ter, exatamente.
const FICHA = [
  ['Costas + Bíceps', [['Puxada alta pronada', 4, '6–10'], ['Remada articulada', 4, '8–10'], ['Puxada neutra', 3, '8–12'], ['Pulldown braço estendido', 3, '12–15'], ['Rosca direta barra W', 4, '8–10'], ['Rosca inclinada', 3, '10–12']]],
  ['Peito + Tríceps', [['Supino inclinado com halteres', 4, '6–10'], ['Supino reto', 4, '8–10'], ['Crossover', 3, '10–15'], ['Crucifixo máquina', 3, '12–15'], ['Tríceps francês', 3, '8–12'], ['Tríceps corda', 3, '10–15']]],
  ['Pernas + Abdômen', [['Agachamento ou hack', 4, '6–10'], ['Leg press', 4, '10–12'], ['Terra romeno', 3, '8–10'], ['Cadeira extensora', 3, '12–15'], ['Mesa flexora', 3, '10–12'], ['Panturrilha em pé', 4, '10–15'], ['Abdominal na polia', 3, '12–15']]],
  ['Ombros + Braços', [['Desenvolvimento com halteres', 4, '6–10'], ['Elevação lateral', 4, '10–15'], ['Crucifixo inverso', 3, '12–15'], ['Rosca Scott', 3, '8–12'], ['Rosca martelo', 3, '10–12'], ['Tríceps testa', 3, '8–12'], ['Tríceps unilateral', 3, '10–15']]],
  ['Especialização Shape em V', [['Barra fixa ou puxada alta', 3, '6–10'], ['Remada baixa', 3, '8–12'], ['Supino inclinado máquina', 3, '8–12'], ['Elevação lateral na polia', 4, '12–15'], ['Face pull', 3, '12–15']]],
];
const TOTAIS = [21, 20, 24, 23, 16];

// Dados no formato da versão anterior do app (como estão hoje no celular).
const DADOS_ANTIGOS = {
  atual: 0,
  treinos: [{ nome: 'Peito e ombro', exercicios: [
    { id: 'a', nome: 'Supino Reto', series: 3, reps: '10', carga: '', descanso: 60, video: '', obs: '', feitas: [] },
    { id: 'b', nome: 'Tríceps corda', series: 3, reps: '12', carga: 25, descanso: 60, video: '', obs: '', feitas: [] }] }],
  historico: [{ treino: 0, nome: 'Peito e ombro', data: '2026-11-13T23:00:00.000Z', feitos: 1, total: 2 }],
  log: { a: [{ data: '2026-11-13T23:00:00.000Z', treino: 0, series: [{ reps: 10, kg: 40 }, { reps: 9, kg: 40 }] }] },
};
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('dialog', (d) => d.accept());
  const shot = async (n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
  const estado = () => p.evaluate(() => JSON.parse(localStorage.getItem('meus-treinos-v1')));
  const irParaExercicio = async (n) => { await p.click('#mPosicao'); await p.locator('#deLista .de-item').nth(n).click(); };
  const ok = (msg) => console.log('✔', msg);

  await p.goto(URL_APP);
  await p.evaluate((d) => { localStorage.clear(); localStorage.setItem('meus-treinos-v1', JSON.stringify(d)); }, DADOS_ANTIGOS);
  await p.reload();

  // 1) Ficha instalada exatamente como aprovada, sem perder dados antigos
  let s = await estado();
  assert.equal(s.programa.id, 'projeto-v-4.0');
  FICHA.forEach(([nome, exs], i) => {
    assert.equal(s.treinos[i].nome, nome);
    assert.deepEqual(s.treinos[i].exercicios.map((e) => [e.nome, e.series, e.reps]), exs);
    assert.equal(s.treinos[i].exercicios.reduce((a, e) => a + e.series, 0), TOTAIS[i]);
  });
  assert.equal(TOTAIS.reduce((a, b) => a + b), 104);
  ok('5 treinos, exercícios, séries e repetições conferem (21+20+24+23+16 = 104 séries)');
  const supino = s.treinos[1].exercicios.find((e) => e.nome === 'Supino reto');
  assert.equal(supino.id, 'a'); assert.equal(s.arquivo.length, 1);
  ok('Supino reto continua ligado ao mesmo exercício; ficha antiga arquivada');

  // 1b) Limpeza única do histórico de teste (pedido do usuário) + desfazer + apagar manual
  assert.equal(s.historico.length, 0); assert.deepEqual(s.log, {}); assert.equal(s.descansos.length, 0);
  assert.ok(s.limpezas.includes('historico-teste-2026-11'));
  assert.ok(await p.evaluate(() => !!localStorage.getItem('projeto-v-copia-antes-limpeza')));
  assert.ok(!(await p.isHidden('#dLimpeza')));
  ok('histórico de teste apagado na abertura, com cópia de segurança');
  await p.click('#dLimpezaDesfazer');
  s = await estado();
  assert.equal(s.historico.length, 1); assert.equal(s.log.a.length, 1);
  await p.reload(); s = await estado();
  assert.equal(s.historico.length, 1, 'limpeza não pode rodar de novo depois de desfeita');
  ok('“Desfazer” restaura o histórico e a limpeza não roda de novo');
  await p.click('#btnApagarHist');
  s = await estado();
  assert.equal(s.historico.length, 0); assert.deepEqual(s.log, {});
  assert.equal(s.treinos[1].exercicios.length, 6); assert.equal(s.avaliacoes.length, 1);
  ok('“Apagar histórico de treinos” limpa só o histórico (ficha e evolução continuam)');
  // a partir daqui: um registro anterior do Supino reto para testar comparação/sugestão
  await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('meus-treinos-v1'));
    st.log.a = [{ data: '2026-11-13T23:00:00.000Z', treino: 1, series: [{ reps: 10, kg: 40 }, { reps: 9, kg: 40 }] }];
    localStorage.setItem('meus-treinos-v1', JSON.stringify(st));
  });
  await p.reload(); s = await estado();
  assert.deepEqual(s.perfil, { inicio: '2026-11-13', peso: 80, altura: 172, idade: 26 });
  assert.equal(s.avaliacoes.length, 1); assert.equal(s.avaliacoes[0].marco, 0); assert.equal(s.avaliacoes[0].peso, 80);
  assert.equal(s.avaliacoes[0].cintura, '');
  ok('perfil e avaliação do Dia 0 (só peso 80 kg; nenhuma medida inventada)');
  assert.equal(s.historico.length, 0);
  ok('nenhum treino concluído foi inventado');

  // 1c) PWA: manifest, ícones e cabeçalhos para iPhone
  const man = await (await p.request.get(URL_APP + 'manifest.json')).json();
  assert.equal(man.name, 'Projeto V'); assert.equal(man.short_name, 'Projeto V'); assert.equal(man.display, 'standalone');
  for (const ic of man.icons) {
    const r = await p.request.get(URL_APP + ic.src);
    assert.equal(r.status(), 200, ic.src);
    const buf = await r.body();
    const [w, hgt] = [buf.readUInt32BE(16), buf.readUInt32BE(20)]; // cabeçalho PNG
    assert.equal(`${w}x${hgt}`, ic.sizes, ic.src);
  }
  assert.ok(man.icons.some((i) => i.purpose === 'maskable'));
  const touch = await p.getAttribute('link[rel=apple-touch-icon]', 'href');
  assert.equal((await p.request.get(URL_APP + touch)).status(), 200);
  assert.equal(await p.getAttribute('meta[name=apple-mobile-web-app-status-bar-style]', 'content'), 'black-translucent');
  assert.ok((await p.getAttribute('meta[name=viewport]', 'content')).includes('viewport-fit=cover'));
  ok(`manifest (standalone) e ícones PNG ${man.icons.map((i) => i.sizes).join(', ')} + apple-touch-icon 180×180`);

  // 2) Catálogo: toda variação tem demonstração ou indisponibilidade + 5 instruções
  const cat = await p.evaluate(() => Object.values(window.CATALOGO).flatMap((c) => c.variacoes.map((v) => ({ n: v.nome, d: v.demo && v.demo.tipo, i: (v.instrucoes || []).length }))));
  cat.forEach((v) => { assert.ok(v.d, `sem demo: ${v.n}`); assert.equal(v.i, 5, `instruções: ${v.n}`); });
  ok(`${cat.length} variações com demonstração definida e 5 instruções cada`);

  await shot('01-inicio');
  assert.match(await p.textContent('#iDia'), /Dia \d+ de 90/);
  assert.equal(await p.locator('.card-treino').count(), 5);
  assert.equal(await p.locator('.card-treino >> text=INICIAR TREINO').count(), 5);
  ok('tela inicial: progresso 90 dias, treino atual e 5 cards com INICIAR TREINO');

  // 3) Sessão: Treino 2 (peito)
  await p.locator('.card-treino').nth(1).locator('text=INICIAR TREINO').click();
  assert.equal(await p.textContent('#mNome'), 'Supino inclinado com halteres');
  assert.equal(await p.textContent('#inKgRotulo'), 'Kg por halter');
  assert.ok((await p.textContent('#mComoCorpo')).includes('Posição inicial'));
  await p.fill('#inKg', '22'); await p.fill('#inReps', '9');
  await p.click('#mAcao');
  assert.equal(await p.textContent('#dRotulo'), 'Descanso');
  assert.ok(await p.isHidden('#telaSerie')); assert.ok(await p.isHidden('#mRodape'));
  assert.match(await p.textContent('#mProx'), /Próximo: Série 2 de Supino inclinado com halteres/);
  // pausar / retomar / reiniciar
  await p.click('#mPausar');
  const t1 = await p.textContent('#mTempo'); await p.waitForTimeout(1300);
  assert.equal(await p.textContent('#mTempo'), t1);
  await p.click('#mPausar'); await p.click('#mReiniciar');
  assert.equal(await p.textContent('#mTempo'), '2:30');
  ok('descanso em tela própria (anel, próximo, ±15s): inicia sozinho, pausa, retoma e reinicia (150 s)');
  await shot('02-descanso');
  await p.click('#mPular'); // pular descanso
  assert.equal(await p.textContent('#mRotulo'), 'Série 2 de 4');
  assert.equal(await p.inputValue('#inKg'), '22'); // sugere a série anterior, não aumenta
  // editar série 1 (22 -> 20 kg)
  assert.equal(await p.locator('#mBolinhas .ponto.feito').count(), 1);
  await p.click('#mBolinhas .ponto.feito');
  await p.fill('#formSerie [name=kg]', '20'); await p.click('#formSerie button[type=submit]');
  assert.equal((await estado()).treinos[1].exercicios[0].feitas[0].kg, 20);
  ok('série registrada com carga/reps/horário e corrigida depois tocando na bolinha (20 kg/halter × 9)');
  // pausar o treino congela o tempo
  await p.click('#mPausarTreino');
  const tt = await p.textContent('#mTotal'); await p.waitForTimeout(1300);
  assert.equal(await p.textContent('#mTotal'), tt);
  await p.click('#mPausarTreino');
  ok('Pausar treino congela o tempo de treino e Retomar continua');
  await shot('03-treino');
  // supino reto mostra a carga do histórico antigo
  await irParaExercicio(1);
  assert.equal(await p.textContent('#mNome'), 'Supino reto');
  assert.ok((await p.textContent('#mUltima')).includes('Última: 40 kg × 10'));
  await p.click('#mAcao');
  ok('Supino reto sugere a última carga registrada antes (40 kg)');
  await p.click('#mFechar');

  // 4) Concluir pela ficha e ver o resumo
  await p.click('.menu [data-ir=vTreinos]');
  await p.click('#btnConcluir');
  await p.waitForSelector('#dlgResumo[open]');
  const kpis = await p.locator('#rsKpis b').allTextContents();
  assert.equal(kpis[1], '2/20'); assert.equal(kpis[2], (20 * 9 + 40 * 10).toString());
  ok(`resumo final: duração ${kpis[0]}, séries ${kpis[1]}, volume ${kpis[2]} kg`);
  await shot('04-resumo');
  await p.click('#rsOk');

  // 5) Persistência após recarregar
  await p.reload();
  s = await estado();
  const doProg = s.historico.filter((x) => x.programa === 'projeto-v-4.0');
  assert.equal(doProg.length, 1); assert.equal(doProg[0].series, 2);
  const logSup = s.log[s.treinos[1].exercicios[0].id];
  assert.equal(logSup[0].series[0].kg, 20); assert.ok(logSup[0].series[0].t);
  assert.equal(s.log.a.length, 2);
  assert.equal(await p.textContent('#iTreinos'), '1');
  assert.ok((await p.textContent('#iAtualNome')).startsWith('TREINO 3'));
  ok('dados continuam salvos após recarregar; próximo da sequência = Treino 3');
  await p.locator('.card-treino').nth(1).locator('text=INICIAR TREINO').click();
  await p.click('#mAcao'); await p.click('#mFechar');
  await p.click('.menu [data-ir=vTreinos]'); await p.click('#btnConcluir');
  await p.waitForSelector('#dlgResumo[open]');
  assert.match(await p.textContent('#rsComp'), /Comparado ao Treino 2 anterior/);
  ok('resumo compara com a sessão anterior do mesmo treino: ' + (await p.textContent('#rsComp')));
  await p.click('#rsOk'); await p.click('.menu [data-ir=vInicio]');

  // 6) Progressão sugerida sem mudar a carga
  await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('meus-treinos-v1'));
    const e = st.treinos[0].exercicios[4]; // Rosca direta barra W 4 × 8–10
    st.log[e.id] = [{ data: '2026-11-13T20:00:00.000Z', treino: 0, series: [1, 2, 3, 4].map(() => ({ reps: 10, kg: 30 })) }];
    localStorage.setItem('meus-treinos-v1', JSON.stringify(st));
  });
  await p.reload();
  await p.locator('.card-treino').nth(0).locator('text=INICIAR TREINO').click();
  await irParaExercicio(4);
  assert.equal(await p.textContent('#mNome'), 'Rosca direta barra W');
  assert.ok((await p.textContent('#mProgressao')).includes('Você bateu 10 reps'));
  assert.equal(await p.inputValue('#inKg'), '30');
  ok('sugestão de progressão aparece e a carga sugerida continua 30 kg (não aumenta sozinha)');
  await p.click('#mStats');
  await p.click('[data-aba=resumo]');
  await p.waitForSelector('.grafico');
  assert.ok((await p.textContent('#dCorpo')).includes('Melhor carga'));
  await p.click('[data-aba=como]');
  await shot('05-como-fazer');
  await p.click('[data-aba=historico]');
  assert.ok((await p.textContent('#dCorpo')).includes('Série 1 — 30 kg — 10 reps'));
  ok('detalhes do exercício: resumo, histórico por série e como fazer');
  await p.click('#dFechar'); await p.click('#mFechar');

  // 7) Variações (Agachamento ou hack) + player
  await p.locator('.card-treino').nth(2).locator('text=INICIAR TREINO').click();
  assert.equal(await p.textContent('#mNome'), 'Agachamento ou hack');
  await p.selectOption('#mVariacao select', 'hack');
  assert.ok((await p.textContent('#mMidia')).includes('Agachamento no hack') || (await p.textContent('#mMidia')).includes('indisponível'));
  assert.ok((await p.textContent('#mComoCorpo')).includes('encosto'));
  ok('variação selecionável (Agachamento livre ↔ Hack) troca demonstração e instruções');
  await p.waitForTimeout(800);
  const midia = await p.textContent('#mMidia');
  assert.ok(midia.includes('indisponível') || (await p.locator('#mMidia .capa').count()) === 1);
  console.log('   player:', midia.includes('indisponível') ? 'vídeo inacessível nesta rede → mostra "Demonstração indisponível" sem quebrar' : 'capa do vídeo exibida (toque para reproduzir)');
  await irParaExercicio(1);
  assert.equal(await p.textContent('#mNome'), 'Leg press');
  ok('trocar de exercício carrega a demonstração correspondente');
  // Pular série, adiar e pular exercício
  await p.click('#mPularSerie');
  assert.equal(await p.locator('#mBolinhas .ponto.pulado').count(), 1);
  assert.equal(await p.textContent('#mRotulo'), 'Série 2 de 4');
  await p.click('#mAdiar');
  assert.equal(await p.textContent('#mNome'), 'Terra romeno');
  await p.click('#mPularEx');
  assert.equal(await p.textContent('#mNome'), 'Cadeira extensora');
  s = await estado();
  assert.equal(s.treinos[2].exercicios[2].puladas, 3); assert.equal(s.treinos[2].exercicios[2].feitas.length, 0);
  assert.deepEqual(s.sessao.adiados, [s.treinos[2].exercicios[1].id]);
  ok('Pular série, Adiar exercício (vai para o fim) e Pular exercício funcionam');
  await p.click('#mFechar');

  // 8) Evolução corporal
  await p.click('.menu [data-ir=vEvolucao]');
  assert.equal(await p.locator('.aval').count(), 5);
  await p.locator('.aval').nth(1).click(); // Dia 15
  await p.fill('#formAval [name=peso]', '79.2'); await p.fill('#formAval [name=cintura]', '86');
  await p.setInputFiles('#formAval .foto[data-pos=frente] input', { name: 'frente.png', mimeType: 'image/png', buffer: PNG_1PX });
  await p.waitForTimeout(300);
  await p.click('#formAval button[type=submit]');
  await p.waitForTimeout(300);
  assert.ok((await p.locator('.aval').nth(1).textContent()).includes('registrada'));
  assert.ok((await p.textContent('#eComparacao')).includes('−0,8'));
  assert.equal(await p.locator('#eGraficos .graf-card').count(), 1);
  await p.reload(); await p.click('.menu [data-ir=vEvolucao]');
  await p.locator('.aval').nth(1).click(); await p.waitForTimeout(400);
  assert.equal(await p.locator('#formAval .foto[data-pos=frente] img').count(), 1);
  await p.click('#daCancelar');
  ok('avaliação do Dia 15 salva (peso, cintura, foto), comparação Dia 0 × Dia 15 e gráfico de peso');
  await shot('06-evolucao');

  // 8b) Backup completo (com foto): exportar → apagar tudo → importar
  await p.click('.menu [data-ir=vInicio]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btnExportar')]);
  const caminho = await dl.path();
  const bk = JSON.parse(require('fs').readFileSync(caminho, 'utf8'));
  assert.equal(Object.keys(bk.fotosBackup).length, 1); assert.equal(bk.avaliacoes.length, 2);
  assert.ok((await estado()).ultimoBackup);
  await p.evaluate(() => new Promise((ok) => { localStorage.clear(); const r = indexedDB.deleteDatabase('projeto-v-fotos'); r.onsuccess = r.onerror = r.onblocked = () => ok(); }));
  await p.reload();
  await p.setInputFiles('#inpImportar', caminho);
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('meus-treinos-v1')).avaliacoes.length === 2);
  s = await estado();
  assert.ok(s.log[s.treinos[1].exercicios[0].id]);
  await p.click('.menu [data-ir=vEvolucao]');
  await p.locator('.aval').nth(1).click(); await p.waitForTimeout(400);
  assert.equal(await p.locator('#formAval .foto[data-pos=frente] img').count(), 1);
  await p.click('#daCancelar');
  ok('backup exporta tudo (inclusive a foto), e a importação restaura em aparelho limpo');

  // 9) Dia de descanso
  await p.click('.menu [data-ir=vInicio]');
  await p.click('#iDescanso');
  assert.equal(await p.textContent('#iDescansos'), '1');
  ok('dia de descanso registrado');

  // 9b) Progresso semanal: segunda a domingo, dias verdes, tabela, horas e check nos treinos
  const info = await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('meus-treinos-v1'));
    const hojeD = new Date();
    const seg = new Date(hojeD); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7)); seg.setHours(18, 0, 0, 0);
    const hj = new Date(hojeD); hj.setHours(7, 0, 0, 0);
    const passada = new Date(seg); passada.setDate(passada.getDate() - 5);
    const reg = (d, t, dur) => ({ programa: 'projeto-v-4.0', treino: t, nome: st.treinos[t].nome, data: d.toISOString(), feitos: 6, total: 6, series: 20, seriesPlanejadas: 21, duracao: dur, volume: 4000 });
    st.historico = [reg(hj, 1, 3000), reg(seg, 0, 3900), reg(passada, 2, 3600)];
    st.descansos = [];
    localStorage.setItem('meus-treinos-v1', JSON.stringify(st));
    return { mesmoDia: seg.toDateString() === hj.toDateString() };
  });
  await p.reload();
  assert.deepEqual(await p.locator('#sDias .sd-nome').allTextContents(), ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']);
  assert.equal(await p.locator('#sDias .sem-dia.treinou').count(), info.mesmoDia ? 1 : 2);
  assert.equal(await p.textContent('#sDias .sem-dia:first-child .sd-treino'), info.mesmoDia ? 'T1 T2' : 'T1');
  assert.equal(await p.locator('#sTabela tbody tr').count(), 2);
  assert.equal(await p.textContent('#sTabela tfoot td:nth-child(3)'), '1h55');
  assert.equal(await p.textContent('#sKpis div:nth-child(2) b'), '1h55');
  assert.equal(await p.locator('#sChecklist .sc-item.ok').count(), 2);
  assert.equal(await p.locator('.card-treino.feito-semana').count(), 2);
  assert.ok((await p.textContent('.card-treino >> nth=0')).includes('✓ feito Seg'));
  await shot('07-semana');
  await p.click('#sAnterior');
  assert.equal(await p.locator('#sTabela tbody tr').count(), 1);
  assert.match(await p.textContent('#sRotulo'), /Semana passada/);
  await p.click('#sProxima');
  await p.click('.menu [data-ir=vTreinos]');
  assert.equal(await p.locator('.aba.feita-semana').count(), 2);
  await p.click('.menu [data-ir=vInicio]');
  ok(`semana: dias verdes com T1/T2, tabela com duração e total (1h55), check verde nos treinos feitos, semana passada separada`);

  // 10) Offline: com o service worker ativo, o app abre sem internet
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); // garante que a página está controlada pelo SW
  assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller));
  await ctx.setOffline(true);
  await p.reload();
  assert.equal(await p.textContent('#vInicio h1'), 'PROJETO V 4.0');
  assert.equal(await p.locator('.card-treino').count(), 5);
  await p.locator('.card-treino').nth(0).locator('text=INICIAR TREINO').click();
  await p.click('#mAcao');
  await p.click('#mFechar');
  s = await estado();
  assert.ok(s.treinos[0].exercicios[0].feitas.length >= 1);
  await ctx.setOffline(false);
  ok('sem internet: app abre pelo cache e registra séries normalmente');

  // 11) Aviso de nova versão: cópia do app num servidor próprio; troca o sw.js e pede atualização
  {
    const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
    const raiz = path.join(__dirname, '..');
    const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'projeto-v-'));
    for (const f of fs.readdirSync(raiz)) if (!f.startsWith('.') && f !== 'testes') fs.cpSync(path.join(raiz, f), path.join(copia, f), { recursive: true });
    const tipos = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
    const srv = http.createServer((req, res) => {
      const f = path.join(copia, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      fs.readFile(f, (err, buf) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(buf); });
    }).listen(0);
    const url = `http://localhost:${srv.address().port}/`;
    const q = await ctx.newPage();
    q.on('pageerror', (e) => erros.push(e.message));
    await q.goto(url);
    await q.evaluate(() => navigator.serviceWorker.ready);
    await q.reload();
    assert.ok(await q.evaluate(() => !!navigator.serviceWorker.controller));
    assert.ok(await q.isHidden('#atualizacao'));
    const sw = path.join(copia, 'sw.js');
    fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSAO = '[^']+'/, "const VERSAO = 'teste-nova'"));
    await q.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await q.waitForSelector('#atualizacao:not([hidden])', { timeout: 15000 });
    await Promise.all([q.waitForNavigation(), q.click('#atualizarBtn')]);
    assert.equal(await q.locator('.card-treino').count(), 5);
    assert.ok(await q.evaluate(async () => (await caches.keys()).includes('projeto-v-teste-nova')));
    await q.close(); srv.close();
    ok('nova versão: aviso “Atualizar” aparece, troca o cache e recarrega o app');
  }

  assert.deepEqual(erros, []);
  ok('nenhum erro de JavaScript');
  await b.close();
})().catch((e) => { console.error('✘ FALHOU:', e.message); process.exit(1); });
