// Meus Treinos — dados salvos no próprio aparelho (localStorage).
(() => {
  'use strict';

  const CHAVE = 'meus-treinos-v1';
  const TOTAL_TREINOS = 5;

  const $ = (id) => document.getElementById(id);

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      atual: 0,
      treinos: Array.from({ length: TOTAL_TREINOS }, () => ({ nome: '', exercicios: [] })),
      historico: [], // { treino, nome, data, feitos, total }
      sessao: null,  // treino em andamento (tela de treino)
    };
  }

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.treinos)) return normalizar(salvo);
    } catch (_) { /* começa do zero */ }
    return estadoInicial();
  }

  function normalizar(dados) {
    const base = estadoInicial();
    base.atual = Number.isInteger(dados.atual) ? Math.min(Math.max(dados.atual, 0), TOTAL_TREINOS - 1) : 0;
    for (let i = 0; i < TOTAL_TREINOS; i++) {
      const t = dados.treinos[i];
      if (!t) continue;
      base.treinos[i].nome = String(t.nome || '');
      base.treinos[i].exercicios = (Array.isArray(t.exercicios) ? t.exercicios : []).map((e) => {
        const series = Math.max(1, Number(e.series) || 1);
        let feitas = Number(e.seriesFeitas);
        if (!Number.isFinite(feitas)) feitas = e.feito ? series : 0; // versão antiga
        return {
          id: e.id || novoId(),
          nome: String(e.nome || ''),
          series,
          reps: String(e.reps ?? ''),
          carga: e.carga === '' || e.carga == null ? '' : Number(e.carga),
          descanso: Math.max(0, Number(e.descanso) || 0),
          video: String(e.video || ''),
          obs: String(e.obs || ''),
          seriesFeitas: Math.min(Math.max(0, feitas), series),
        };
      });
    }
    base.historico = Array.isArray(dados.historico) ? dados.historico.slice(0, 100) : [];
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

  const treinoAtual = () => estado.treinos[estado.atual];
  const rotulo = (i) => `Treino ${i + 1}`;
  const feito = (e) => e.seriesFeitas >= e.series;
  const mmss = (seg) => {
    seg = Math.max(0, Math.floor(seg));
    const h = Math.floor(seg / 3600);
    const m = String(Math.floor((seg % 3600) / 60)).padStart(2, '0');
    const s = String(seg % 60).padStart(2, '0');
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  };
  function descricao(e) {
    const p = [`${e.series} × ${e.reps || '-'}`];
    if (e.carga !== '' && e.carga != null) p.push(`${e.carga} kg`);
    if (e.descanso) p.push(`${e.descanso}s descanso`);
    return p.join(' · ');
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
      e.seriesFeitas = feito(e) ? 0 : e.series;
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
    if (e.seriesFeitas > 0 && !feito(e)) {
      const s = document.createElement('div');
      s.className = 'detalhes series-mini';
      s.textContent = `${e.seriesFeitas}/${e.series} séries feitas`;
      info.appendChild(s);
    }
    if (e.obs) {
      const o = document.createElement('div');
      o.className = 'obs';
      o.textContent = e.obs;
      info.appendChild(o);
    }

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

    li.append(check, info, editar, mover);
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
    if (s) { // mantém a tela de treino no mesmo exercício
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
        + (h.duracao ? ` · ${mmss(h.duracao)}` : '');
      const b = document.createElement('span');
      b.textContent = new Date(h.data).toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit',
      });
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
      series: Math.max(1, Number(form.series.value) || 1),
      reps: form.reps.value.trim(),
      carga: form.carga.value === '' ? '' : Number(form.carga.value),
      descanso: Math.max(0, Number(form.descanso.value) || 0),
      video: form.video.value.trim(),
      obs: form.obs.value.trim(),
    };
    const lista = treinoAtual().exercicios;
    if (editandoId) {
      const e = lista.find((x) => x.id === editandoId);
      Object.assign(e, dados);
      e.seriesFeitas = Math.min(e.seriesFeitas, e.series);
    } else {
      lista.push({ id: novoId(), seriesFeitas: 0, ...dados });
    }
    salvar(); dlg.close(); render();
    if (modoAberto()) { midiaDe = null; renderModo(); }
  });

  $('btnCancelar').onclick = () => dlg.close();
  $('btnExcluir').onclick = () => {
    if (!editandoId || !confirm('Excluir este exercício?')) return;
    const t = treinoAtual();
    const idx = t.exercicios.findIndex((x) => x.id === editandoId);
    t.exercicios.splice(idx, 1);
    const s = sessaoDoAtual();
    if (s) {
      if (!t.exercicios.length) { estado.sessao = null; fecharModo(); }
      else {
        if (s.ex > idx || s.ex >= t.exercicios.length) s.ex = Math.max(0, s.ex - 1);
        if (s.prox > idx || s.prox >= t.exercicios.length) s.prox = Math.max(0, s.prox - 1);
      }
    }
    salvar(); dlg.close(); render();
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
    estado.historico.unshift({
      treino: estado.atual, nome: t.nome, data: new Date().toISOString(),
      feitos: t.exercicios.filter(feito).length, total: t.exercicios.length,
      duracao: s ? Math.round(((s.fimTreino || Date.now()) - s.inicio) / 1000) : 0,
    });
    estado.historico = estado.historico.slice(0, 100);
    t.exercicios.forEach((e) => { e.seriesFeitas = 0; });
    estado.sessao = null;
    estado.atual = proximoTreinoApos(estado.atual); // já deixa o próximo aberto
    salvar();
    fecharModo();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Tela de treino ----------
  // sessao: { treino, inicio, ex, fase: 'serie'|'descanso'|'completo', desde, fim, prox, fimTreino }
  const sessaoDoAtual = () => (estado.sessao && estado.sessao.treino === estado.atual ? estado.sessao : null);
  const modoAberto = () => !$('modo').hidden;
  let loop = null;
  let midiaDe = null; // id do exercício cuja mídia está na tela
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
    document.body.classList.remove('treinando');
    clearInterval(loop); loop = null;
    $('mMidia').innerHTML = ''; // para o vídeo
    midiaDe = null;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    renderTreino();
  }

  function irPara(i) {
    const s = sessaoDoAtual();
    const n = treinoAtual().exercicios.length;
    if (!s || i < 0 || i >= n) return;
    s.ex = i; s.fase = 'serie'; s.desde = Date.now();
    delete s.fim; delete s.prox; delete s.fimTreino;
  }

  function terminarSerie() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    const e = t.exercicios[s.ex];
    e.seriesFeitas = Math.min(e.series, e.seriesFeitas + 1);
    let prox = s.ex;
    if (feito(e)) {
      prox = primeiroPendente(t, s.ex + 1);
      if (prox === -1) { // acabou tudo
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
      irPara(s.prox); // descanso acabou: já vai para a próxima série
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
    // Durante o descanso já mostra o que vem a seguir.
    const idx = s.fase === 'descanso' ? s.prox : s.ex;
    const e = t.exercicios[idx];

    $('mTreino').textContent = rotulo(estado.atual) + (t.nome ? ` — ${t.nome}` : '');
    $('mPosicao').textContent = `Exercício ${idx + 1} de ${t.exercicios.length}`;
    $('mNome').textContent = e.nome;
    $('mInfo').textContent = descricao(e);
    $('mObs').textContent = e.obs;
    if (midiaDe !== e.id + '|' + e.video) { midiaDe = e.id + '|' + e.video; renderMidia(e); }

    const bol = $('mBolinhas');
    bol.innerHTML = '';
    for (let i = 0; i < e.series; i++) {
      const d = document.createElement('div');
      d.className = 'bolinha' + (i < e.seriesFeitas ? ' feita' : (i === e.seriesFeitas && s.fase !== 'completo' ? ' atual' : ''));
      d.textContent = i < e.seriesFeitas ? '✓' : String(i + 1);
      bol.appendChild(d);
    }

    const fase = $('mFase');
    fase.className = 'fase ' + s.fase;
    const acao = $('mAcao');
    const numSerie = Math.min(e.seriesFeitas + 1, e.series);
    if (s.fase === 'serie') {
      $('mRotulo').textContent = `Série ${numSerie} de ${e.series}`;
      $('mProx').textContent = `${e.reps || '-'} repetições${e.carga !== '' ? ` · ${e.carga} kg` : ''}`;
      acao.textContent = '✓ Terminei a série';
      acao.className = 'btn sucesso enorme';
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
    $('mMais15').hidden = s.fase !== 'descanso';
    $('mDesfazer').hidden = s.fase === 'descanso';
    $('mDesfazer').disabled = e.seriesFeitas === 0;
    $('mAnterior').disabled = s.fase === 'descanso' || s.ex === 0;
    $('mProximo').disabled = s.fase === 'descanso' || s.ex >= t.exercicios.length - 1;
    atualizarTempos();
  }

  // --- vídeo / animação de como fazer ---
  function idYoutube(url) {
    const m = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function renderMidia(e) {
    const box = $('mMidia');
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
      const img = document.createElement('img'); // GIF / imagem
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
  $('mEditar').onclick = () => {
    const s = sessaoDoAtual();
    const idx = s.fase === 'descanso' ? s.prox : s.ex;
    abrirForm(treinoAtual().exercicios[idx].id);
  };
  $('mAcao').onclick = () => {
    const s = sessaoDoAtual();
    if (!s) return;
    destravarAudio();
    if (s.fase === 'serie') terminarSerie();
    else if (s.fase === 'descanso') { irPara(s.prox); salvar(); renderModo(); }
    else concluirTreino();
  };
  $('mMais15').onclick = () => {
    const s = sessaoDoAtual();
    if (s && s.fase === 'descanso') { s.fim += 15000; salvar(); atualizarTempos(); }
  };
  $('mDesfazer').onclick = () => {
    const s = sessaoDoAtual();
    const e = treinoAtual().exercicios[s.ex];
    if (e.seriesFeitas > 0) e.seriesFeitas--;
    s.fase = 'serie'; s.desde = Date.now(); delete s.fimTreino;
    salvar(); renderModo(); renderTreino();
  };
  $('mAnterior').onclick = () => { irPara(sessaoDoAtual().ex - 1); salvar(); renderModo(); };
  $('mProximo').onclick = () => { irPara(sessaoDoAtual().ex + 1); salvar(); renderModo(); };

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

  // Mantém a tela acesa enquanto treina (quando o navegador permite).
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
