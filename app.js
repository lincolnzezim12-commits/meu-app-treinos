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
      historico: [], // { treino: índice, nome, data: ISO, feitos, total }
    };
  }

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.treinos)) return normalizar(salvo);
    } catch (_) { /* ignora e começa do zero */ }
    return estadoInicial();
  }

  function normalizar(dados) {
    const base = estadoInicial();
    base.atual = Number.isInteger(dados.atual) ? Math.min(Math.max(dados.atual, 0), TOTAL_TREINOS - 1) : 0;
    for (let i = 0; i < TOTAL_TREINOS; i++) {
      const t = dados.treinos[i];
      if (!t) continue;
      base.treinos[i].nome = String(t.nome || '');
      base.treinos[i].exercicios = (Array.isArray(t.exercicios) ? t.exercicios : []).map((e) => ({
        id: e.id || novoId(),
        nome: String(e.nome || ''),
        series: Number(e.series) || 0,
        reps: String(e.reps ?? ''),
        carga: e.carga === '' || e.carga == null ? '' : Number(e.carga),
        descanso: Number(e.descanso) || 0,
        obs: String(e.obs || ''),
        feito: !!e.feito,
      }));
    }
    base.historico = Array.isArray(dados.historico) ? dados.historico.slice(0, 100) : [];
    return base;
  }

  let estado = carregar();

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (_) { /* armazenamento indisponível */ }
  }

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const treinoAtual = () => estado.treinos[estado.atual];
  const rotulo = (i) => `Treino ${i + 1}`;

  // ---------- Renderização ----------
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

    const feitos = t.exercicios.filter((e) => e.feito).length;
    const total = t.exercicios.length;
    $('vazio').hidden = total > 0;
    $('barra').style.width = total ? `${(feitos / total) * 100}%` : '0';
    $('contagem').textContent = total ? `${feitos} de ${total} exercícios feitos` : '';
    $('btnConcluir').disabled = total === 0;
  }

  function itemExercicio(e, idx, total) {
    const li = document.createElement('li');
    li.className = 'item' + (e.feito ? ' feito' : '');

    const check = document.createElement('button');
    check.className = 'check';
    check.textContent = e.feito ? '✓' : '';
    check.setAttribute('aria-label', e.feito ? 'Desmarcar' : 'Marcar como feito');
    check.onclick = () => {
      e.feito = !e.feito;
      salvar(); render();
      if (e.feito && e.descanso > 0) iniciarTimer(e.descanso);
    };

    const info = document.createElement('div');
    info.className = 'info';
    info.onclick = () => abrirForm(e.id);
    const titulo = document.createElement('div');
    titulo.className = 'titulo';
    titulo.textContent = e.nome;
    const det = document.createElement('div');
    det.className = 'detalhes';
    const partes = [`${e.series || '-'} × ${e.reps || '-'}`];
    if (e.carga !== '' && e.carga != null) partes.push(`${e.carga} kg`);
    if (e.descanso) partes.push(`${e.descanso}s descanso`);
    det.textContent = partes.join(' · ');
    info.append(titulo, det);
    if (e.obs) {
      const o = document.createElement('div');
      o.className = 'obs';
      o.textContent = e.obs;
      info.appendChild(o);
    }

    const descansar = document.createElement('button');
    descansar.className = 'btn leve pequeno descansar';
    descansar.textContent = '⏱';
    descansar.title = 'Iniciar descanso';
    descansar.setAttribute('aria-label', 'Iniciar descanso');
    descansar.onclick = () => iniciarTimer(e.descanso || 60);

    const mover = document.createElement('div');
    mover.className = 'mover';
    const cima = botaoMini('▲', 'Mover para cima', idx === 0, () => moverExercicio(idx, -1));
    const baixo = botaoMini('▼', 'Mover para baixo', idx === total - 1, () => moverExercicio(idx, 1));
    mover.append(cima, baixo);

    li.append(check, info, descansar, mover);
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
      a.textContent = `${rotulo(h.treino)}${h.nome ? ' — ' + h.nome : ''} (${h.feitos}/${h.total})`;
      const b = document.createElement('span');
      b.textContent = new Date(h.data).toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit',
      });
      li.append(a, b);
      ul.appendChild(li);
    });
  }

  function renderProximo() {
    const p = $('proximo');
    const ultimo = estado.historico[0];
    if (!ultimo) { p.textContent = 'Monte seus treinos de 1 a 5.'; return; }
    // Próximo = o treino seguinte (com exercícios) ao último concluído.
    let prox = ultimo.treino;
    for (let k = 1; k <= TOTAL_TREINOS; k++) {
      const i = (ultimo.treino + k) % TOTAL_TREINOS;
      if (estado.treinos[i].exercicios.length) { prox = i; break; }
    }
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
      series: Number(form.series.value) || 0,
      reps: form.reps.value.trim(),
      carga: form.carga.value === '' ? '' : Number(form.carga.value),
      descanso: Number(form.descanso.value) || 0,
      obs: form.obs.value.trim(),
    };
    const lista = treinoAtual().exercicios;
    if (editandoId) {
      Object.assign(lista.find((x) => x.id === editandoId), dados);
    } else {
      lista.push({ id: novoId(), feito: false, ...dados });
    }
    salvar(); dlg.close(); render();
  });

  $('btnCancelar').onclick = () => dlg.close();
  $('btnExcluir').onclick = () => {
    if (!editandoId || !confirm('Excluir este exercício?')) return;
    const t = treinoAtual();
    t.exercicios = t.exercicios.filter((x) => x.id !== editandoId);
    salvar(); dlg.close(); render();
  };

  // ---------- Ações principais ----------
  $('btnAdd').onclick = () => abrirForm();

  $('nomeTreino').addEventListener('input', (ev) => {
    treinoAtual().nome = ev.target.value;
    salvar(); renderAbas();
  });
  $('nomeTreino').addEventListener('change', render);

  $('btnConcluir').onclick = () => {
    const t = treinoAtual();
    const feitos = t.exercicios.filter((e) => e.feito).length;
    if (!t.exercicios.length) return;
    const msg = feitos < t.exercicios.length
      ? `Você fez ${feitos} de ${t.exercicios.length} exercícios. Concluir mesmo assim?`
      : `Concluir ${rotulo(estado.atual)}?`;
    if (!confirm(msg)) return;
    estado.historico.unshift({
      treino: estado.atual, nome: t.nome, data: new Date().toISOString(),
      feitos, total: t.exercicios.length,
    });
    estado.historico = estado.historico.slice(0, 100);
    t.exercicios.forEach((e) => { e.feito = false; });
    // Já abre o próximo treino da sequência.
    for (let k = 1; k <= TOTAL_TREINOS; k++) {
      const i = (estado.atual + k) % TOTAL_TREINOS;
      if (estado.treinos[i].exercicios.length) { estado.atual = i; break; }
    }
    salvar(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------- Timer de descanso ----------
  let timerId = null;
  let fimEm = 0;

  function iniciarTimer(segundos) {
    pararTimer();
    fimEm = Date.now() + segundos * 1000;
    $('timer').hidden = false;
    $('timer').classList.remove('fim');
    tick();
    timerId = setInterval(tick, 250);
  }

  function tick() {
    const resta = Math.max(0, Math.ceil((fimEm - Date.now()) / 1000));
    const m = String(Math.floor(resta / 60)).padStart(2, '0');
    const s = String(resta % 60).padStart(2, '0');
    $('timerTexto').textContent = `${m}:${s}`;
    if (resta === 0) {
      clearInterval(timerId); timerId = null;
      $('timer').classList.add('fim');
      $('timerTexto').textContent = 'Bora!';
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      bip();
      setTimeout(() => { if (!timerId) $('timer').hidden = true; }, 4000);
    }
  }

  function pararTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    $('timer').hidden = true;
  }
  $('timerParar').onclick = pararTimer;

  function bip() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (_) { /* sem áudio */ }
  }

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

  // ---------- PWA (funciona offline / instalar na tela inicial) ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  render();
})();
