// Meus Treinos — dados salvos no próprio aparelho (localStorage).
(() => {
  'use strict';

  const CHAVE = 'meus-treinos-v1';
  const TOTAL_TREINOS = 5;
  const COR_GRAFICO = '#e8650c';

  const $ = (id) => document.getElementById(id);

  // ---------- Estado ----------
  // exercício: { id, nome, series, reps, carga, descanso, video, obs, feitas: [{reps, kg}] }
  // log: { [idExercicio]: [{ data, treino, series: [{reps, kg}] }] }  ← histórico por exercício
  function estadoInicial() {
    return {
      atual: 0,
      treinos: Array.from({ length: TOTAL_TREINOS }, () => ({ nome: '', exercicios: [] })),
      historico: [],
      log: {},
      sessao: null,
    };
  }

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.treinos)) return normalizar(salvo);
    } catch (_) { /* começa do zero */ }
    return estadoInicial();
  }

  const num = (v, padrao = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : padrao);
  const serie = (x) => ({ reps: Math.max(0, Math.round(num(x && x.reps))), kg: Math.max(0, num(x && x.kg)) });

  function normalizar(dados) {
    const base = estadoInicial();
    base.atual = Number.isInteger(dados.atual) ? Math.min(Math.max(dados.atual, 0), TOTAL_TREINOS - 1) : 0;
    for (let i = 0; i < TOTAL_TREINOS; i++) {
      const t = dados.treinos[i];
      if (!t) continue;
      base.treinos[i].nome = String(t.nome || '');
      base.treinos[i].exercicios = (Array.isArray(t.exercicios) ? t.exercicios : []).map((e) => {
        const ex = {
          id: e.id || novoId(),
          nome: String(e.nome || ''),
          series: Math.max(1, num(e.series, 1)),
          reps: String(e.reps ?? ''),
          carga: e.carga === '' || e.carga == null ? '' : num(e.carga),
          descanso: Math.max(0, num(e.descanso)),
          video: String(e.video || ''),
          obs: String(e.obs || ''),
          feitas: [],
        };
        if (Array.isArray(e.feitas)) ex.feitas = e.feitas.map(serie);
        else { // versões antigas: só contavam as séries
          const n = Number.isFinite(Number(e.seriesFeitas)) ? Number(e.seriesFeitas) : (e.feito ? ex.series : 0);
          for (let k = 0; k < Math.min(n, ex.series); k++) ex.feitas.push({ reps: metaReps(ex), kg: num(ex.carga) });
        }
        ex.feitas = ex.feitas.slice(0, ex.series);
        return ex;
      });
    }
    base.historico = Array.isArray(dados.historico) ? dados.historico.slice(0, 200) : [];
    if (dados.log && typeof dados.log === 'object') {
      for (const [id, lista] of Object.entries(dados.log)) {
        if (!Array.isArray(lista)) continue;
        base.log[id] = lista
          .filter((s) => s && s.data && Array.isArray(s.series))
          .map((s) => ({ data: String(s.data), treino: num(s.treino), series: s.series.map(serie) }));
      }
    }
    const s = dados.sessao;
    if (s && Number.isInteger(s.treino) && base.treinos[s.treino]) base.sessao = s;
    return base;
  }

  let estado = carregar();

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (_) { /* indisponível */ }
  }

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Utilidades ----------
  const treinoAtual = () => estado.treinos[estado.atual];
  const rotulo = (i) => `Treino ${i + 1}`;
  const feito = (e) => e.feitas.length >= e.series;
  function metaReps(e) { const m = String(e.reps).match(/\d+/); return m ? Number(m[0]) : 10; }
  const fmtKg = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const fmtSerie = (s) => `${fmtKg(s.kg)} kg × ${s.reps}`;
  const umRM = (s) => (s.kg > 0 && s.reps > 0 ? s.kg * (1 + s.reps / 30) : 0); // fórmula de Epley
  const volume = (series) => series.reduce((t, s) => t + s.kg * s.reps, 0);
  const mmss = (seg) => {
    seg = Math.max(0, Math.floor(seg));
    const h = Math.floor(seg / 3600);
    const m = String(Math.floor((seg % 3600) / 60)).padStart(2, '0');
    const s = String(seg % 60).padStart(2, '0');
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  };
  const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  function haQuanto(iso) {
    const d0 = new Date(iso); d0.setHours(0, 0, 0, 0);
    const d1 = new Date(); d1.setHours(0, 0, 0, 0);
    const dias = Math.round((d1 - d0) / 86400000);
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    return `há ${dias} dias`;
  }
  function descricao(e) {
    const p = [`${e.series} × ${e.reps || '-'}`];
    if (e.carga !== '' && e.carga != null) p.push(`${fmtKg(e.carga)} kg`);
    if (e.descanso) p.push(`${e.descanso}s descanso`);
    return p.join(' · ');
  }
  const sessoesDe = (e) => estado.log[e.id] || [];
  const ultimaSessao = (e) => { const l = sessoesDe(e); return l[l.length - 1] || null; };

  // Valor sugerido para a série i: o que fez na série anterior de hoje;
  // senão o que fez nessa série no último treino; senão a meta cadastrada.
  function sugestao(e, i) {
    if (i > 0 && e.feitas[i - 1]) return { ...e.feitas[i - 1] };
    const u = ultimaSessao(e);
    if (u && u.series.length) return { ...(u.series[i] || u.series[u.series.length - 1]) };
    return { reps: metaReps(e), kg: num(e.carga) };
  }

  // ---------- Tela principal ----------
  function render() {
    renderAbas();
    renderTreino();
    renderHistorico();
    renderProximo();
  }

  function renderAbas() {
    const abas = $('abas');
    abas.innerHTML = '';
    estado.treinos.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'aba' + (i === estado.atual ? ' ativa' : '');
      b.textContent = String(i + 1);
      const s = document.createElement('small');
      s.textContent = t.nome || `${t.exercicios.length} exerc.`;
      b.appendChild(s);
      b.setAttribute('aria-label', rotulo(i) + (t.nome ? ` — ${t.nome}` : ''));
      b.onclick = () => { estado.atual = i; salvar(); render(); };
      abas.appendChild(b);
    });
  }

  function renderTreino() {
    const t = treinoAtual();
    const nome = $('nomeTreino');
    if (document.activeElement !== nome) nome.value = t.nome;
    nome.placeholder = `${rotulo(estado.atual)} — ex.: Peito e tríceps`;

    const lista = $('lista');
    lista.innerHTML = '';
    t.exercicios.forEach((e, idx) => lista.appendChild(itemExercicio(e, idx, t.exercicios.length)));

    const total = t.exercicios.length;
    const feitos = t.exercicios.filter(feito).length;
    $('vazio').hidden = total > 0;
    $('barra').style.width = total ? `${(feitos / total) * 100}%` : '0';
    $('contagem').textContent = total ? `${feitos} de ${total} exercícios feitos` : '';
    $('btnConcluir').disabled = total === 0;
    const comecar = $('btnComecar');
    comecar.hidden = total === 0;
    comecar.textContent = sessaoDoAtual() ? '▶ Continuar treino' : '▶ Começar treino';
  }

  function itemExercicio(e, idx, total) {
    const li = document.createElement('li');
    li.className = 'item' + (feito(e) ? ' feito' : '');

    const check = document.createElement('button');
    check.className = 'check';
    check.textContent = feito(e) ? '✓' : '';
    check.setAttribute('aria-label', feito(e) ? 'Desmarcar' : 'Marcar como feito');
    check.onclick = () => {
      if (feito(e)) e.feitas = [];
      else while (e.feitas.length < e.series) e.feitas.push(sugestao(e, e.feitas.length));
      salvar(); render();
    };

    const info = document.createElement('div');
    info.className = 'info';
    info.onclick = () => abrirModo(idx);
    const titulo = document.createElement('div');
    titulo.className = 'titulo';
    titulo.textContent = e.nome;
    const det = document.createElement('div');
    det.className = 'detalhes';
    det.textContent = descricao(e);
    info.append(titulo, det);
    if (e.feitas.length && !feito(e)) {
      const s = document.createElement('div');
      s.className = 'detalhes series-mini';
      s.textContent = `${e.feitas.length}/${e.series} séries feitas`;
      info.appendChild(s);
    }
    const u = ultimaSessao(e);
    if (u && u.series.length) {
      const s = document.createElement('div');
      s.className = 'detalhes ultima';
      const melhor = u.series.reduce((a, b) => (b.kg > a.kg ? b : a));
      s.textContent = `Última: ${fmtSerie(melhor)} (${haQuanto(u.data)})`;
      info.appendChild(s);
    }
    if (e.obs) {
      const o = document.createElement('div');
      o.className = 'obs';
      o.textContent = e.obs;
      info.appendChild(o);
    }

    const stats = document.createElement('button');
    stats.className = 'btn leve pequeno stats';
    stats.textContent = '📊';
    stats.setAttribute('aria-label', 'Resumo e histórico');
    stats.onclick = () => abrirDetalhes(e.id);

    const editar = document.createElement('button');
    editar.className = 'btn leve pequeno editar';
    editar.textContent = '✎';
    editar.setAttribute('aria-label', 'Editar exercício');
    editar.onclick = () => abrirForm(e.id);

    const mover = document.createElement('div');
    mover.className = 'mover';
    mover.append(
      botaoMini('▲', 'Mover para cima', idx === 0, () => moverExercicio(idx, -1)),
      botaoMini('▼', 'Mover para baixo', idx === total - 1, () => moverExercicio(idx, 1)),
    );

    li.append(check, info, stats, editar, mover);
    return li;
  }

  function botaoMini(txt, label, desativado, acao) {
    const b = document.createElement('button');
    b.className = 'mini';
    b.textContent = txt;
    b.setAttribute('aria-label', label);
    b.disabled = desativado;
    b.style.visibility = desativado ? 'hidden' : 'visible';
    b.onclick = acao;
    return b;
  }

  function moverExercicio(idx, dir) {
    const arr = treinoAtual().exercicios;
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= arr.length) return;
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];
    const s = sessaoDoAtual();
    if (s) {
      if (s.ex === idx) s.ex = alvo; else if (s.ex === alvo) s.ex = idx;
      if (s.prox === idx) s.prox = alvo; else if (s.prox === alvo) s.prox = idx;
    }
    salvar(); renderTreino();
  }

  function renderHistorico() {
    const ul = $('historico');
    ul.innerHTML = '';
    if (!estado.historico.length) {
      const li = document.createElement('li');
      li.innerHTML = '<span>Nenhum treino concluído ainda.</span>';
      ul.appendChild(li);
      return;
    }
    estado.historico.slice(0, 15).forEach((h) => {
      const li = document.createElement('li');
      const a = document.createElement('span');
      a.textContent = `${rotulo(h.treino)}${h.nome ? ' — ' + h.nome : ''} (${h.feitos}/${h.total})`
        + (h.duracao ? ` · ${mmss(h.duracao)}` : '')
        + (h.volume ? ` · ${fmtKg(h.volume)} kg` : '');
      const b = document.createElement('span');
      b.textContent = dataCurta(h.data);
      li.append(a, b);
      ul.appendChild(li);
    });
  }

  function proximoTreinoApos(i) {
    for (let k = 1; k <= TOTAL_TREINOS; k++) {
      const j = (i + k) % TOTAL_TREINOS;
      if (estado.treinos[j].exercicios.length) return j;
    }
    return i;
  }

  function renderProximo() {
    const p = $('proximo');
    const ultimo = estado.historico[0];
    if (!ultimo) { p.textContent = 'Monte seus treinos de 1 a 5.'; return; }
    const prox = proximoTreinoApos(ultimo.treino);
    const nome = estado.treinos[prox].nome;
    p.innerHTML = '';
    p.append('Próximo: ');
    const b = document.createElement('b');
    b.textContent = rotulo(prox) + (nome ? ` — ${nome}` : '');
    p.appendChild(b);
  }

  // ---------- Formulário ----------
  const dlg = $('dlg');
  const form = $('form');
  let editandoId = null;

  function abrirForm(id = null) {
    editandoId = id;
    const e = id ? treinoAtual().exercicios.find((x) => x.id === id) : null;
    $('dlgTitulo').textContent = e ? 'Editar exercício' : `Novo exercício — ${rotulo(estado.atual)}`;
    form.nome.value = e ? e.nome : '';
    form.series.value = e ? e.series : 3;
    form.reps.value = e ? e.reps : '12';
    form.carga.value = e ? e.carga : '';
    form.descanso.value = e ? e.descanso : 60;
    form.video.value = e ? e.video : '';
    form.obs.value = e ? e.obs : '';
    $('btnExcluir').hidden = !e;
    dlg.showModal();
    if (!e) form.nome.focus();
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) { form.nome.focus(); return; }
    const dados = {
      nome,
      series: Math.max(1, num(form.series.value, 1)),
      reps: form.reps.value.trim(),
      carga: form.carga.value === '' ? '' : num(form.carga.value),
      descanso: Math.max(0, num(form.descanso.value)),
      video: form.video.value.trim(),
      obs: form.obs.value.trim(),
    };
    const lista = treinoAtual().exercicios;
    if (editandoId) {
      const e = lista.find((x) => x.id === editandoId);
      Object.assign(e, dados);
      e.feitas = e.feitas.slice(0, e.series);
    } else {
      lista.push({ id: novoId(), feitas: [], ...dados });
    }
    salvar(); dlg.close(); render();
    if (modoAberto()) { midiaDe = null; renderModo(); }
    if (!$('det').hidden) renderDetalhes();
  });

  $('btnCancelar').onclick = () => dlg.close();
  $('btnExcluir').onclick = () => {
    if (!editandoId || !confirm('Excluir este exercício? O histórico dele também será apagado.')) return;
    const t = treinoAtual();
    const idx = t.exercicios.findIndex((x) => x.id === editandoId);
    t.exercicios.splice(idx, 1);
    delete estado.log[editandoId];
    const s = sessaoDoAtual();
    if (s) {
      if (!t.exercicios.length) { estado.sessao = null; fecharModo(); }
      else {
        if (s.ex > idx || s.ex >= t.exercicios.length) s.ex = Math.max(0, s.ex - 1);
        if (s.prox > idx || s.prox >= t.exercicios.length) s.prox = Math.max(0, s.prox - 1);
        delete s.entrada;
      }
    }
    salvar(); dlg.close(); fecharDetalhes(); render();
    if (modoAberto()) { midiaDe = null; renderModo(); }
  };

  // ---------- Ações principais ----------
  $('btnAdd').onclick = () => abrirForm();
  $('btnComecar').onclick = () => abrirModo();

  $('nomeTreino').addEventListener('input', (ev) => {
    treinoAtual().nome = ev.target.value;
    salvar(); renderAbas();
  });
  $('nomeTreino').addEventListener('change', render);

  $('btnConcluir').onclick = () => {
    const t = treinoAtual();
    if (!t.exercicios.length) return;
    const feitos = t.exercicios.filter(feito).length;
    const msg = feitos < t.exercicios.length
      ? `Você fez ${feitos} de ${t.exercicios.length} exercícios. Concluir mesmo assim?`
      : `Concluir ${rotulo(estado.atual)}?`;
    if (confirm(msg)) concluirTreino();
  };

  function concluirTreino() {
    const t = treinoAtual();
    const s = sessaoDoAtual();
    const agora = new Date().toISOString();
    let vol = 0;
    t.exercicios.forEach((e) => {
      if (!e.feitas.length) return;
      (estado.log[e.id] = estado.log[e.id] || []).push({ data: agora, treino: estado.atual, series: e.feitas.map(serie) });
      vol += volume(e.feitas);
    });
    estado.historico.unshift({
      treino: estado.atual, nome: t.nome, data: agora,
      feitos: t.exercicios.filter(feito).length, total: t.exercicios.length,
      duracao: s ? Math.round(((s.fimTreino || Date.now()) - s.inicio) / 1000) : 0,
      volume: Math.round(vol),
    });
    estado.historico = estado.historico.slice(0, 200);
    t.exercicios.forEach((e) => { e.feitas = []; });
    estado.sessao = null;
    estado.atual = proximoTreinoApos(estado.atual);
    salvar();
    fecharModo();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Tela de treino ----------
  // sessao: { treino, inicio, ex, fase: 'serie'|'descanso'|'completo', desde, fim, prox, fimTreino, entrada }
  const sessaoDoAtual = () => (estado.sessao && estado.sessao.treino === estado.atual ? estado.sessao : null);
  const modoAberto = () => !$('modo').hidden;
  let loop = null;
  let midiaDe = null;
  let wakeLock = null;

  function primeiroPendente(t, aPartirDe = 0) {
    const n = t.exercicios.length;
    for (let k = 0; k < n; k++) {
      const i = (aPartirDe + k) % n;
      if (!feito(t.exercicios[i])) return i;
    }
    return -1;
  }

  function abrirModo(exIdx) {
    const t = treinoAtual();
    if (!t.exercicios.length) return;
    destravarAudio();
    let s = sessaoDoAtual();
    if (!s) {
      const ini = exIdx ?? Math.max(0, primeiroPendente(t));
      s = estado.sessao = { treino: estado.atual, inicio: Date.now(), ex: ini, fase: 'serie', desde: Date.now() };
      if (primeiroPendente(t) === -1) s.fase = 'completo';
    } else if (exIdx != null && exIdx !== s.ex) {
      irPara(exIdx);
    }
    salvar();
    $('modo').hidden = false;
    document.body.classList.add('treinando');
    midiaDe = null;
    renderModo();
    clearInterval(loop);
    loop = setInterval(tickModo, 250);
    manterTelaLigada();
  }

  function fecharModo() {
    $('modo').hidden = true;
    if ($('det').hidden) document.body.classList.remove('treinando');
    clearInterval(loop); loop = null;
    $('mMidia').innerHTML = '';
    midiaDe = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    renderTreino();
  }

  function irPara(i) {
    const s = sessaoDoAtual();
    const n = treinoAtual().exercicios.length;
    if (!s || i < 0 || i >= n) return;
    s.ex = i; s.fase = feito(treinoAtual().exercicios[i]) && primeiroPendente(treinoAtual()) === -1 ? 'completo' : 'serie';
    s.desde = Date.now();
    delete s.fim; delete s.prox; delete s.entrada;
    if (s.fase === 'serie') delete s.fimTreino;
  }

  // Exercício e série que estão na tela agora (no descanso, já mostra o que vem a seguir).
  function exibido() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    const idx = s.fase === 'descanso' ? s.prox : s.ex;
    const e = t.exercicios[idx];
    return { s, t, idx, e, i: Math.min(e.feitas.length, e.series - 1) };
  }

  function entradaAtual() {
    const { s, e, i } = exibido();
    const chave = `${e.id}:${i}`;
    if (!s.entrada || s.entrada.chave !== chave) s.entrada = { chave, ...sugestao(e, i) };
    return s.entrada;
  }

  function terminarSerie() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    const e = t.exercicios[s.ex];
    if (feito(e)) { irPara(primeiroPendente(t, s.ex + 1)); salvar(); renderModo(); return; }
    const ent = entradaAtual();
    e.feitas.push(serie(ent));
    delete s.entrada;
    let prox = s.ex;
    if (feito(e)) {
      prox = primeiroPendente(t, s.ex + 1);
      if (prox === -1) {
        s.fase = 'completo'; s.fimTreino = Date.now();
        alertar();
        salvar(); renderModo(); renderTreino();
        return;
      }
    }
    if (e.descanso > 0) {
      s.fase = 'descanso'; s.desde = Date.now(); s.fim = Date.now() + e.descanso * 1000; s.prox = prox;
    } else {
      irPara(prox);
    }
    salvar(); renderModo(); renderTreino();
  }

  function tickModo() {
    const s = sessaoDoAtual();
    if (!s) return;
    if (s.fase === 'descanso' && Date.now() >= s.fim) {
      const ent = s.entrada; // mantém o que a pessoa ajustou durante o descanso
      irPara(s.prox);
      if (ent) s.entrada = ent;
      salvar();
      alertar();
      renderModo();
      return;
    }
    atualizarTempos();
  }

  function atualizarTempos() {
    const s = sessaoDoAtual();
    if (!s) return;
    const agora = s.fimTreino || Date.now();
    $('mTotal').textContent = mmss((agora - s.inicio) / 1000);
    if (s.fase === 'descanso') $('mTempo').textContent = mmss(Math.ceil((s.fim - Date.now()) / 1000));
    else if (s.fase === 'serie') $('mTempo').textContent = mmss((Date.now() - s.desde) / 1000);
  }

  function renderModo() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    if (!s || !t.exercicios.length) { fecharModo(); return; }
    const { idx, e, i } = exibido();

    $('mTreino').textContent = rotulo(estado.atual) + (t.nome ? ` — ${t.nome}` : '');
    $('mPosicao').textContent = `Exercício ${idx + 1} de ${t.exercicios.length}`;
    $('mNome').textContent = e.nome;
    $('mObs').textContent = e.obs;
    if (midiaDe !== e.id + '|' + e.video) { midiaDe = e.id + '|' + e.video; renderMidia($('mMidia'), e); }

    // Meta e última vez
    const meta = $('mMeta');
    meta.innerHTML = '';
    meta.append(`Meta: ${e.reps || '-'} reps`);
    const u = ultimaSessao(e);
    if (u && u.series.length) {
      const sp = document.createElement('span');
      sp.textContent = ` · Última: ${fmtSerie(u.series[i] || u.series[u.series.length - 1])}`;
      meta.appendChild(sp);
    }

    // Séries já feitas hoje
    const fe = $('mFeitas');
    fe.innerHTML = '';
    e.feitas.forEach((x, k) => {
      const c = document.createElement('span');
      c.textContent = `S${k + 1}: ${fmtSerie(x)}`;
      fe.appendChild(c);
    });

    const bol = $('mBolinhas');
    bol.innerHTML = '';
    for (let k = 0; k < e.series; k++) {
      const d = document.createElement('div');
      d.className = 'bolinha' + (k < e.feitas.length ? ' feita' : (k === e.feitas.length && s.fase !== 'completo' ? ' atual' : ''));
      d.textContent = k < e.feitas.length ? '✓' : String(k + 1);
      bol.appendChild(d);
    }

    $('mFase').className = 'fase ' + s.fase;
    const acao = $('mAcao');
    const numSerie = i + 1;
    const ent = s.fase !== 'completo' && !feito(e) ? entradaAtual() : null;
    $('mEntrada').hidden = !ent;
    if (ent) {
      if (document.activeElement !== $('inReps')) $('inReps').value = ent.reps;
      if (document.activeElement !== $('inKg')) $('inKg').value = ent.kg;
    }
    if (s.fase === 'serie' && !feito(e)) {
      $('mRotulo').textContent = `Série ${numSerie} de ${e.series}`;
      $('mProx').textContent = '';
      acao.textContent = '✓ Concluir série';
      acao.className = 'btn sucesso enorme';
    } else if (s.fase === 'serie') { // abriu um exercício que já terminou
      $('mRotulo').textContent = 'Exercício feito';
      $('mTempo').textContent = '✓';
      $('mProx').textContent = 'Toque em “Desfazer série” para corrigir';
      acao.textContent = 'Ir para o próximo ▶';
      acao.className = 'btn primario enorme';
    } else if (s.fase === 'descanso') {
      $('mRotulo').textContent = 'Descanso';
      $('mProx').textContent = idx === s.ex
        ? `A seguir: série ${numSerie} de ${e.series}`
        : `A seguir: ${e.nome} — série 1`;
      acao.textContent = 'Pular descanso ⏭';
      acao.className = 'btn primario enorme';
    } else {
      $('mRotulo').textContent = 'Treino completo!';
      $('mTempo').textContent = '💪 Mandou bem';
      $('mProx').textContent = `Tempo total: ${mmss(((s.fimTreino || Date.now()) - s.inicio) / 1000)}`;
      acao.textContent = '✓ Concluir treino';
      acao.className = 'btn sucesso enorme';
    }
    const descansando = s.fase === 'descanso';
    $('mMais15').hidden = !descansando;
    $('mMenos15').hidden = !descansando;
    $('mDesfazer').hidden = descansando;
    $('mDesfazer').disabled = t.exercicios[s.ex].feitas.length === 0;
    $('mAnterior').disabled = descansando || s.ex === 0;
    $('mProximo').disabled = descansando || s.ex >= t.exercicios.length - 1;
    atualizarTempos();
  }

  // --- steppers de repetições e peso ---
  document.querySelectorAll('.stepper button').forEach((b) => {
    b.onclick = () => {
      const ent = entradaAtual();
      const campo = b.dataset.campo;
      const passo = Number(b.dataset.passo);
      ent[campo] = Math.max(0, Math.round((num(ent[campo]) + passo) * 10) / 10);
      salvar(); renderModo();
    };
  });
  [['inReps', 'reps'], ['inKg', 'kg']].forEach(([id, campo]) => {
    $(id).addEventListener('input', (ev) => {
      const v = ev.target.value.replace(',', '.');
      if (v === '' || !Number.isFinite(Number(v))) return;
      entradaAtual()[campo] = Math.max(0, campo === 'reps' ? Math.round(Number(v)) : Number(v));
      salvar();
    });
    $(id).addEventListener('focus', (ev) => ev.target.select());
    $(id).addEventListener('blur', () => renderModo());
  });

  // --- vídeo / animação de como fazer ---
  function idYoutube(url) {
    const m = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function renderMidia(box, e) {
    box.innerHTML = '';
    const url = e.video;
    const yt = url && idYoutube(url);
    if (yt) {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1&modestbranding=1`;
      f.title = `Como fazer: ${e.nome}`;
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      box.appendChild(f);
    } else if (url && /^https?:\/\/.+\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
      const v = document.createElement('video');
      Object.assign(v, { src: url, autoplay: true, muted: true, loop: true, playsInline: true, controls: true });
      box.appendChild(v);
    } else if (url && /^https?:\/\//i.test(url)) {
      const img = document.createElement('img');
      img.src = url; img.alt = `Como fazer: ${e.nome}`;
      img.onerror = () => { box.innerHTML = ''; box.appendChild(semVideo(e, url)); };
      box.appendChild(img);
    } else {
      box.appendChild(semVideo(e));
    }
  }

  function semVideo(e, linkQuebrado) {
    const d = document.createElement('div');
    d.className = 'sem-video';
    d.innerHTML = `
      <svg viewBox="0 0 120 72" aria-hidden="true">
        <g fill="#ff7a1a">
          <rect x="22" y="20" width="8" height="32" rx="3"/><rect x="90" y="20" width="8" height="32" rx="3"/>
          <rect x="14" y="27" width="8" height="18" rx="3"/><rect x="98" y="27" width="8" height="18" rx="3"/>
          <rect x="30" y="33" width="60" height="6" rx="3"/>
          <animateTransform attributeName="transform" type="translate" values="0 14; 0 -8; 0 14"
            dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1; .45 0 .55 1"/>
        </g>
      </svg>`;
    const a = document.createElement('a');
    a.className = 'btn primario pequeno';
    a.href = linkQuebrado || `https://www.youtube.com/results?search_query=${encodeURIComponent('como fazer ' + e.nome + ' execução correta')}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = linkQuebrado ? 'Abrir vídeo' : '▶ Ver como fazer no YouTube';
    const p = document.createElement('p');
    p.textContent = 'Toque em ✎ e cole o link de um vídeo para ele aparecer aqui.';
    d.append(a, p);
    return d;
  }

  // --- botões da tela de treino ---
  $('mFechar').onclick = fecharModo;
  $('mEditar').onclick = () => abrirForm(exibido().e.id);
  $('mStats').onclick = () => abrirDetalhes(exibido().e.id);
  $('mAcao').onclick = () => {
    const s = sessaoDoAtual();
    if (!s) return;
    destravarAudio();
    if (s.fase === 'serie') terminarSerie();
    else if (s.fase === 'descanso') {
      const ent = s.entrada;
      irPara(s.prox);
      if (ent) s.entrada = ent;
      salvar(); renderModo();
    } else concluirTreino();
  };
  const ajustarDescanso = (ms) => {
    const s = sessaoDoAtual();
    if (s && s.fase === 'descanso') { s.fim = Math.max(Date.now(), s.fim + ms); salvar(); tickModo(); }
  };
  $('mMais15').onclick = () => ajustarDescanso(15000);
  $('mMenos15').onclick = () => ajustarDescanso(-15000);
  $('mDesfazer').onclick = () => {
    const s = sessaoDoAtual();
    const e = treinoAtual().exercicios[s.ex];
    const ultima = e.feitas.pop();
    s.fase = 'serie'; s.desde = Date.now(); delete s.fimTreino;
    s.entrada = ultima ? { chave: `${e.id}:${e.feitas.length}`, ...ultima } : undefined;
    salvar(); renderModo(); renderTreino();
  };
  $('mAnterior').onclick = () => { irPara(sessaoDoAtual().ex - 1); salvar(); renderModo(); };
  $('mProximo').onclick = () => { irPara(sessaoDoAtual().ex + 1); salvar(); renderModo(); };

  // ---------- Detalhes do exercício: Resumo / Histórico / Como fazer ----------
  let detId = null;
  let detAba = 'resumo';

  function acharExercicio(id) {
    for (const t of estado.treinos) {
      const e = t.exercicios.find((x) => x.id === id);
      if (e) return e;
    }
    return null;
  }

  function abrirDetalhes(id, aba = 'resumo') {
    detId = id; detAba = aba;
    $('det').hidden = false;
    document.body.classList.add('treinando');
    renderDetalhes();
  }
  function fecharDetalhes() {
    $('det').hidden = true;
    $('dCorpo').innerHTML = '';
    if (!modoAberto()) document.body.classList.remove('treinando');
  }
  $('dFechar').onclick = fecharDetalhes;
  document.querySelectorAll('.det-abas button').forEach((b) => {
    b.onclick = () => { detAba = b.dataset.aba; renderDetalhes(); };
  });

  function estatisticas(e) {
    const sess = sessoesDe(e);
    const todas = sess.flatMap((s) => s.series);
    if (!todas.length) return null;
    const melhor1RMSessao = (s) => Math.max(0, ...s.series.map(umRM));
    let recorde = 0; let dataRecorde = null;
    sess.forEach((s) => { const v = melhor1RMSessao(s); if (v > recorde) { recorde = v; dataRecorde = s.data; } });
    const melhorSerie = todas.reduce((a, b) => (umRM(b) > umRM(a) || (umRM(b) === umRM(a) && b.kg > a.kg) ? b : a));
    const vols = sess.map((s) => volume(s.series));
    return {
      pesoMax: Math.max(...todas.map((s) => s.kg)),
      recorde, dataRecorde,
      evolucao: sess.length > 1 ? { de: melhor1RMSessao(sess[0]), para: melhor1RMSessao(sess[sess.length - 1]) } : null,
      melhorSerie,
      melhorVolume: Math.max(...vols),
      volumeTotal: vols.reduce((a, b) => a + b, 0),
      ultima: sess[sess.length - 1].data,
      sessoes: sess.length,
      series: todas.length,
      reps: todas.reduce((t, s) => t + s.reps, 0),
    };
  }

  function cartao(linhas) {
    const c = document.createElement('div');
    c.className = 'cartao';
    linhas.forEach(([rot, val, sub]) => {
      const l = document.createElement('div');
      l.className = 'linha-stat';
      const a = document.createElement('span'); a.textContent = rot;
      const b = document.createElement('b'); b.textContent = val;
      if (sub) { const sm = document.createElement('small'); sm.textContent = sub; b.appendChild(sm); }
      l.append(a, b);
      c.appendChild(l);
    });
    return c;
  }
  const titulo3 = (txt) => { const h = document.createElement('h3'); h.textContent = txt; return h; };

  function renderDetalhes() {
    const e = acharExercicio(detId);
    if (!e) { fecharDetalhes(); return; }
    $('dNome').textContent = e.nome;
    $('dSub').textContent = descricao(e);
    document.querySelectorAll('.det-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === detAba));
    const corpo = $('dCorpo');
    corpo.innerHTML = '';
    corpo.scrollTop = 0;

    if (detAba === 'como') {
      const m = document.createElement('div');
      m.className = 'midia';
      corpo.appendChild(m);
      renderMidia(m, e);
      corpo.appendChild(titulo3('Como fazer'));
      corpo.appendChild(cartao([
        ['Séries × repetições', `${e.series} × ${e.reps || '-'}`],
        ['Descanso', e.descanso ? `${e.descanso}s` : '—'],
        ['Carga planejada', e.carga !== '' ? `${fmtKg(e.carga)} kg` : '—'],
      ]));
      if (e.obs) {
        corpo.appendChild(titulo3('Observações'));
        const p = document.createElement('p'); p.className = 'como-texto'; p.textContent = e.obs;
        corpo.appendChild(p);
      }
      return;
    }

    const st = estatisticas(e);
    if (!st) {
      const v = document.createElement('p');
      v.className = 'vazio-det';
      v.textContent = 'Ainda não há registros. Faça o exercício na tela de treino e toque em “Concluir treino” — o resumo e o histórico aparecem aqui.';
      corpo.appendChild(v);
      return;
    }

    if (detAba === 'resumo') {
      let evo = ['Evolução', '—', 'precisa de 2 treinos ou mais'];
      if (st.evolucao) {
        const d = st.evolucao.para - st.evolucao.de;
        const pct = st.evolucao.de ? Math.round((d / st.evolucao.de) * 100) : 0;
        evo = ['Evolução', `${d >= 0 ? '+' : '−'}${fmtKg(Math.abs(d))} kg (${pct >= 0 ? '+' : ''}${pct}%)`, '1RM do primeiro ao último treino'];
      }
      corpo.append(
        titulo3('Recordes pessoais'),
        cartao([
          ['Peso máximo', `${fmtKg(st.pesoMax)} kg`],
          ['Melhor 1RM (estimado)', st.recorde ? `${fmtKg(st.recorde)} kg` : '—'],
          evo,
          ['Último recorde', st.dataRecorde ? haQuanto(st.dataRecorde) : '—'],
        ]),
        titulo3('Força'),
        cartao([['Melhor série', `${fmtKg(st.melhorSerie.kg)} kg × ${st.melhorSerie.reps} reps`]]),
        titulo3('Volume'),
        cartao([
          ['Melhor volume num treino', `${fmtKg(st.melhorVolume)} kg`],
          ['Volume total', `${fmtKg(st.volumeTotal)} kg`],
        ]),
        titulo3('Frequência'),
        cartao([
          ['Última execução', haQuanto(st.ultima)],
          ['Total de treinos', String(st.sessoes)],
          ['Total de séries', String(st.series)],
          ['Total de repetições', String(st.reps)],
        ]),
        titulo3('Evolução — maior peso por treino'),
        grafico(sessoesDe(e)),
      );
      return;
    }

    // Histórico
    sessoesDe(e).slice().reverse().forEach((s) => {
      const box = document.createElement('div');
      box.className = 'sessao';
      const topo = document.createElement('div');
      topo.className = 'sessao-topo';
      const b = document.createElement('b');
      b.textContent = `${dataCurta(s.data)} · ${haQuanto(s.data)}`;
      const del = document.createElement('button');
      del.className = 'link-perigo';
      del.textContent = 'Apagar';
      del.onclick = () => {
        if (!confirm('Apagar este registro do histórico?')) return;
        const l = estado.log[e.id];
        l.splice(l.indexOf(s), 1);
        salvar(); renderDetalhes(); renderTreino();
      };
      topo.append(b, del);
      const ol = document.createElement('ol');
      s.series.forEach((x) => { const li = document.createElement('li'); li.textContent = `${fmtKg(x.kg)} kg × ${x.reps} reps`; ol.appendChild(li); });
      const v = document.createElement('div');
      v.className = 'vol';
      v.textContent = `Volume: ${fmtKg(volume(s.series))} kg`;
      box.append(topo, ol, v);
      corpo.appendChild(box);
    });
  }

  // Gráfico de linha simples (maior peso de cada treino), com toque para ver o valor.
  function grafico(sess) {
    const wrap = document.createElement('div');
    wrap.className = 'grafico';
    const pts = sess.map((s) => ({ data: s.data, v: Math.max(0, ...s.series.map((x) => x.kg)) }));
    if (pts.length < 2) {
      const p = document.createElement('p');
      p.className = 'legenda-graf';
      p.textContent = 'O gráfico aparece a partir do 2º treino com este exercício.';
      wrap.appendChild(p);
      return wrap;
    }
    const W = 340, H = 170, ml = 34, mr = 12, mt = 26, mb = 24;
    const max = Math.max(...pts.map((p) => p.v));
    const min = Math.min(...pts.map((p) => p.v));
    const lo = Math.max(0, Math.floor((min - (max - min) * 0.2 - 1)));
    const hi = Math.ceil(max + (max - min) * 0.1 + 1);
    const x = (i) => ml + (i * (W - ml - mr)) / (pts.length - 1);
    const y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Maior peso por treino' });
    [lo, (lo + hi) / 2, hi].forEach((v) => {
      svg.appendChild(el('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: '#2a313b', 'stroke-width': 1 }));
      const t = el('text', { x: ml - 6, y: y(v) + 4, 'text-anchor': 'end', fill: '#8b95a3', 'font-size': 10 });
      t.textContent = fmtKg(Math.round(v));
      svg.appendChild(t);
    });
    [0, pts.length - 1].forEach((i) => {
      const t = el('text', { x: x(i), y: H - 6, 'text-anchor': i ? 'end' : 'start', fill: '#8b95a3', 'font-size': 10 });
      t.textContent = new Date(pts[i].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      svg.appendChild(t);
    });
    svg.appendChild(el('polyline', {
      points: pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' '),
      fill: 'none', stroke: COR_GRAFICO, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    const guia = el('line', { y1: mt - 6, y2: H - mb, stroke: '#8b95a3', 'stroke-width': 1, visibility: 'hidden' });
    svg.appendChild(guia);
    const pontos = pts.map((p, i) => {
      const c = el('circle', { cx: x(i), cy: y(p.v), r: 4, fill: COR_GRAFICO, stroke: '#111418', 'stroke-width': 2 });
      svg.appendChild(c);
      return c;
    });
    // rótulo direto só no último ponto
    const ult = el('text', { x: x(pts.length - 1), y: y(pts[pts.length - 1].v) - 10, 'text-anchor': 'end', fill: '#e9edf2', 'font-size': 11, 'font-weight': 700 });
    ult.textContent = `${fmtKg(pts[pts.length - 1].v)} kg`;
    svg.appendChild(ult);

    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    const mostrar = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      let i = Math.round(((px - ml) / (W - ml - mr)) * (pts.length - 1));
      i = Math.max(0, Math.min(pts.length - 1, i));
      guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('visibility', 'visible');
      pontos.forEach((c, k) => c.setAttribute('r', k === i ? 6 : 4));
      tip.hidden = false;
      tip.innerHTML = '';
      const b = document.createElement('b'); b.textContent = `${fmtKg(pts[i].v)} kg`;
      tip.append(b, ` · ${dataCurta(pts[i].data)}`);
      tip.style.left = `${Math.max(15, Math.min(85, (x(i) / W) * 100))}%`;
    };
    const esconder = () => { tip.hidden = true; guia.setAttribute('visibility', 'hidden'); pontos.forEach((c) => c.setAttribute('r', 4)); };
    svg.addEventListener('pointermove', mostrar);
    svg.addEventListener('pointerdown', mostrar);
    svg.addEventListener('pointerleave', esconder);
    wrap.append(svg, tip);
    const leg = document.createElement('p');
    leg.className = 'legenda-graf';
    leg.textContent = 'Toque no gráfico para ver o valor de cada treino. A lista completa está na aba Histórico.';
    wrap.appendChild(leg);
    return wrap;
  }

  // --- aviso de fim do descanso: bip + vibração + tela piscando ---
  let audioCtx = null;
  function destravarAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) { /* sem áudio */ }
  }

  function alertar() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    const f = $('flash');
    f.hidden = true; void f.offsetWidth; f.hidden = false;
    setTimeout(() => { f.hidden = true; }, 1300);
    if (!audioCtx) return;
    try {
      [0, 0.25, 0.5].forEach((t, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = i === 2 ? 1320 : 880;
        osc.connect(g); g.connect(audioCtx.destination);
        const ini = audioCtx.currentTime + t;
        g.gain.setValueAtTime(0.25, ini);
        g.gain.exponentialRampToValueAtTime(0.001, ini + 0.2);
        osc.start(ini); osc.stop(ini + 0.22);
      });
    } catch (_) { /* sem áudio */ }
  }

  async function manterTelaLigada() {
    try {
      if ('wakeLock' in navigator && modoAberto()) wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) { /* não suportado */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && modoAberto()) { manterTelaLigada(); tickModo(); }
  });

  // ---------- Backup ----------
  $('btnExportar').onclick = () => {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treinos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  $('inpImportar').onchange = async (ev) => {
    const arq = ev.target.files[0];
    ev.target.value = '';
    if (!arq) return;
    try {
      const dados = JSON.parse(await arq.text());
      if (!dados || !Array.isArray(dados.treinos)) throw new Error('formato');
      if (!confirm('Isso vai substituir seus treinos atuais. Continuar?')) return;
      estado = normalizar(dados);
      salvar(); render();
    } catch (_) {
      alert('Arquivo de backup inválido.');
    }
  };

  // ---------- PWA ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  render();
})();
