// Projeto V 4.0 — app de treino. Dados salvos no próprio aparelho:
// localStorage (treinos, cargas, histórico, avaliações) e IndexedDB (fotos de evolução).
(() => {
  'use strict';

  const CHAVE = 'meus-treinos-v1'; // mesma chave das versões anteriores: nada se perde
  const TOTAL_TREINOS = 5;
  const COR_GRAFICO = '#a8862a';
  const PROGRAMA = window.PROJETO_V;
  const CATALOGO = window.CATALOGO || {};
  const MARCOS = [0, 15, 30, 60, 90];
  const MEDIDAS = [
    ['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['peitoral', 'Peitoral', 'cm'],
    ['braco', 'Braço', 'cm'], ['coxa', 'Coxa', 'cm'], ['gordura', '% gordura', '%'],
  ];

  const $ = (id) => document.getElementById(id);
  // Cria elementos sem innerHTML (textos de usuário sempre como texto).
  function h(tag, props, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n[k] = v;
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
    filhos.flat().forEach((f) => { if (f != null && f !== false) n.append(f instanceof Node ? f : String(f)); });
    return n;
  }

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      atual: 0,
      treinos: Array.from({ length: TOTAL_TREINOS }, () => ({ nome: '', objetivo: '', exercicios: [] })),
      historico: [],   // treinos concluídos
      log: {},         // { idExercicio: [{ data, treino, variacao, series:[{reps,kg,t}], obs }] }
      sessao: null,    // treino em andamento
      programa: null,  // { id, instaladoEm }
      perfil: null,    // { inicio, peso, altura, idade }
      avaliacoes: [],  // evolução corporal
      descansos: [],   // datas (AAAA-MM-DD) de dias de descanso
      arquivo: [],     // fichas anteriores (antes do Projeto V), guardadas sem alteração
      limpezas: [],    // limpezas automáticas já feitas (cada uma roda uma única vez)
      ultimoBackup: null,
    };
  }

  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.treinos)) return normalizar(salvo);
    } catch (_) { /* começa do zero */ }
    return estadoInicial();
  }

  const num = (v, padrao = 0) => (v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : padrao);
  const numOuVazio = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? '' : Number(v));
  const serie = (x) => {
    const s = { reps: Math.max(0, Math.round(num(x && x.reps))), kg: Math.max(0, num(x && x.kg)) };
    if (x && x.t) s.t = String(x.t);
    return s;
  };

  function normalizar(dados) {
    const base = estadoInicial();
    base.atual = Number.isInteger(dados.atual) ? Math.min(Math.max(dados.atual, 0), TOTAL_TREINOS - 1) : 0;
    for (let i = 0; i < TOTAL_TREINOS; i++) {
      const t = dados.treinos[i];
      if (!t) continue;
      base.treinos[i].nome = String(t.nome || '');
      base.treinos[i].objetivo = String(t.objetivo || '');
      base.treinos[i].exercicios = (Array.isArray(t.exercicios) ? t.exercicios : []).map((e) => {
        const ex = {
          id: e.id || novoId(),
          cat: e.cat && CATALOGO[e.cat] ? e.cat : null,
          variacao: e.variacao ? String(e.variacao) : null,
          nome: String(e.nome || ''),
          series: Math.max(1, num(e.series, 1)),
          reps: String(e.reps ?? ''),
          carga: numOuVazio(e.carga),
          descanso: Math.max(0, num(e.descanso)),
          descansoFaixa: e.descansoFaixa ? String(e.descansoFaixa) : '',
          tipoCarga: ['total', 'halter', 'lado', 'corporal'].includes(e.tipoCarga) ? e.tipoCarga : null,
          video: String(e.video || ''),
          obs: String(e.obs || ''),
          nota: String(e.nota || ''),
          conferidos: Array.isArray(e.conferidos) ? e.conferidos.map(String) : [],
          feitas: [],
        };
        if (Array.isArray(e.feitas)) ex.feitas = e.feitas.map(serie);
        else { // versões antigas guardavam só a contagem
          const n = Number.isFinite(Number(e.seriesFeitas)) ? Number(e.seriesFeitas) : (e.feito ? ex.series : 0);
          for (let k = 0; k < Math.min(n, ex.series); k++) ex.feitas.push({ reps: metaReps(ex), kg: num(ex.carga) });
        }
        ex.feitas = ex.feitas.slice(0, ex.series);
        return ex;
      });
    }
    base.historico = Array.isArray(dados.historico) ? dados.historico.filter((x) => x && x.data).slice(0, 500) : [];
    if (dados.log && typeof dados.log === 'object') {
      for (const [id, lista] of Object.entries(dados.log)) {
        if (!Array.isArray(lista)) continue;
        base.log[id] = lista
          .filter((s) => s && s.data && Array.isArray(s.series))
          .map((s) => ({
            data: String(s.data), treino: num(s.treino),
            variacao: s.variacao ? String(s.variacao) : undefined,
            variacaoNome: s.variacaoNome ? String(s.variacaoNome) : undefined,
            series: s.series.map(serie), obs: s.obs ? String(s.obs) : undefined,
          }));
      }
    }
    const s = dados.sessao;
    if (s && Number.isInteger(s.treino) && base.treinos[s.treino]) base.sessao = s;
    if (dados.programa && dados.programa.id) base.programa = { id: String(dados.programa.id), instaladoEm: String(dados.programa.instaladoEm || '') };
    if (dados.perfil && dados.perfil.inicio) {
      base.perfil = {
        inicio: String(dados.perfil.inicio), peso: numOuVazio(dados.perfil.peso),
        altura: numOuVazio(dados.perfil.altura), idade: numOuVazio(dados.perfil.idade),
      };
    }
    if (Array.isArray(dados.avaliacoes)) {
      base.avaliacoes = dados.avaliacoes.filter((a) => a && a.data).map((a) => {
        const r = { id: String(a.id || novoId()), data: String(a.data), marco: MARCOS.includes(a.marco) ? a.marco : null, obs: String(a.obs || ''), fotos: {} };
        MEDIDAS.forEach(([k]) => { r[k] = numOuVazio(a[k]); });
        if (a.fotos && typeof a.fotos === 'object') for (const p of ['frente', 'costas', 'perfil']) if (a.fotos[p]) r.fotos[p] = String(a.fotos[p]);
        return r;
      });
    }
    if (Array.isArray(dados.descansos)) base.descansos = [...new Set(dados.descansos.map(String))].sort();
    if (Array.isArray(dados.arquivo)) base.arquivo = dados.arquivo;
    if (Array.isArray(dados.limpezas)) base.limpezas = dados.limpezas.map(String);
    if (dados.ultimoBackup) base.ultimoBackup = String(dados.ultimoBackup);
    return base;
  }

  let estado = carregar();

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); }
    catch (_) { alert('Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado. Exporte um backup.'); }
  }

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------- Instalação da ficha do Projeto V 4.0 ----------
  // Feita uma única vez. Não apaga nada: a ficha antiga vai para "arquivo" e o
  // histórico de cargas continua ligado ao exercício quando o nome coincide.
  const normNome = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  function instalarProjetoV() {
    if (!PROGRAMA || (estado.programa && estado.programa.id === PROGRAMA.id)) return false;
    const antigos = estado.treinos.flatMap((t) => t.exercicios);
    if (antigos.length) {
      estado.arquivo.push({ data: new Date().toISOString(), treinos: JSON.parse(JSON.stringify(estado.treinos)) });
    }
    const porNome = new Map();
    antigos.forEach((e) => { if (!porNome.has(normNome(e.nome))) porNome.set(normNome(e.nome), e.id); });
    const usados = new Set();

    estado.treinos = PROGRAMA.treinos.map((t) => ({
      nome: t.nome,
      objetivo: t.objetivo,
      exercicios: t.exercicios.map(([cat, series, reps]) => {
        const c = CATALOGO[cat];
        const nomes = [c.nome, ...c.variacoes.map((v) => v.nome)].map(normNome);
        let id = null;
        for (const n of nomes) { const achado = porNome.get(n); if (achado && !usados.has(achado)) { id = achado; break; } }
        if (!id) id = `pv-${cat}`;
        usados.add(id);
        return {
          id, cat, variacao: c.variacoes[0].id, nome: c.nome, series, reps,
          carga: '', descanso: c.descanso, descansoFaixa: c.descansoFaixa, tipoCarga: null,
          video: '', obs: '', nota: '', feitas: [],
        };
      }),
    }));
    estado.sessao = null;
    estado.atual = 0;
    estado.programa = { id: PROGRAMA.id, instaladoEm: new Date().toISOString() };
    if (!estado.perfil) estado.perfil = { ...PROGRAMA.perfil };
    if (!estado.avaliacoes.some((a) => a.marco === 0)) {
      // Dia 0 com os dados informados (só peso; medidas ainda não informadas ficam vazias)
      const a = { id: novoId(), data: estado.perfil.inicio, marco: 0, obs: '', fotos: {} };
      MEDIDAS.forEach(([k]) => { a[k] = ''; });
      a.peso = num(estado.perfil.peso, '') || '';
      estado.avaliacoes.push(a);
    }
    salvar();
    return true;
  }

  // ---------- Histórico: limpeza ----------
  // Apaga só o histórico de treinos (treinos concluídos, cargas registradas, séries em andamento,
  // dias de descanso). Mantém a ficha, vídeos, perfil e avaliações corporais.
  const LIMPEZA_TESTE = 'historico-teste-2026-11';
  const CHAVE_COPIA = 'projeto-v-copia-antes-limpeza';

  function temHistorico(st) {
    return st.historico.length > 0 || Object.values(st.log).some((l) => l.length) || st.descansos.length > 0
      || st.treinos.some((t) => t.exercicios.some((e) => e.feitas.length));
  }
  function limparHistorico() {
    estado.historico = [];
    estado.log = {};
    estado.sessao = null;
    estado.descansos = [];
    estado.treinos.forEach((t) => t.exercicios.forEach((e) => { e.feitas = []; e.nota = ''; }));
  }
  // Pedido do usuário: o histórico feito até agora era de teste. Roda uma única vez por aparelho,
  // guardando antes uma cópia local para poder desfazer.
  function limpezaDoHistoricoDeTeste() {
    if (estado.limpezas.includes(LIMPEZA_TESTE)) return;
    if (temHistorico(estado)) {
      const resumo = { treinos: estado.historico.length, exercicios: Object.values(estado.log).reduce((a, l) => a + l.length, 0), descansos: estado.descansos.length };
      try { localStorage.setItem(CHAVE_COPIA, JSON.stringify({ data: new Date().toISOString(), resumo, estado })); } catch (_) { /* sem espaço: segue sem cópia */ }
      limparHistorico();
    }
    estado.limpezas.push(LIMPEZA_TESTE);
    salvar();
  }
  function lerCopia() { try { return JSON.parse(localStorage.getItem(CHAVE_COPIA)); } catch (_) { return null; } }

  // ---------- Utilidades ----------
  const treinoAtual = () => estado.treinos[estado.atual];
  const rotulo = (i) => `Treino ${i + 1}`;
  const nomeTreino = (i) => `${rotulo(i).toUpperCase()}${estado.treinos[i] && estado.treinos[i].nome ? ' — ' + estado.treinos[i].nome : ''}`;
  const feito = (e) => e.feitas.length >= e.series;
  function metaReps(e) { const m = String(e.reps).match(/\d+/); return m ? Number(m[0]) : 10; }
  function faixa(e) {
    const m = String(e.reps).match(/(\d+)\s*[–—-]\s*(\d+)/);
    if (m) return [Number(m[1]), Number(m[2])];
    const u = String(e.reps).match(/\d+/);
    return u ? [Number(u[0]), Number(u[0])] : null;
  }
  const fmtKg = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const fmtNum = (v, casas = 1) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  const umRM = (s) => (s.kg > 0 && s.reps > 0 ? s.kg * (1 + s.reps / 30) : 0); // Epley
  const volume = (series) => series.reduce((t, s) => t + s.kg * s.reps, 0);
  const mmss = (seg) => {
    seg = Math.max(0, Math.floor(seg));
    const hh = Math.floor(seg / 3600);
    const m = String(Math.floor((seg % 3600) / 60)).padStart(2, '0');
    const s = String(seg % 60).padStart(2, '0');
    return hh ? `${hh}:${m}:${s}` : `${m}:${s}`;
  };
  const hoje = () => isoDia(new Date());
  function isoDia(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function diaLocal(s) { // 'AAAA-MM-DD' ou ISO completo -> Date (meia-noite local)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
    const d = new Date(s); d.setHours(0, 0, 0, 0); return d;
  }
  const somaDias = (s, n) => { const d = diaLocal(s); d.setDate(d.getDate() + n); return isoDia(d); };
  const difDias = (a, b) => Math.round((diaLocal(b) - diaLocal(a)) / 86400000);
  const dataCurta = (s) => diaLocal(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const dataLonga = (s) => diaLocal(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaCurta = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  function haQuanto(s) {
    const dias = difDias(s, hoje());
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    return `há ${dias} dias`;
  }

  // --- catálogo / variações / carga ---
  const catDe = (e) => (e && e.cat ? CATALOGO[e.cat] : null);
  function variacaoDe(e) {
    const c = catDe(e);
    if (!c) return null;
    return c.variacoes.find((v) => v.id === e.variacao) || c.variacoes[0];
  }
  const temVariacoes = (e) => { const c = catDe(e); return !!(c && c.variacoes.length > 1); };
  function tipoCargaDe(e) {
    if (e.tipoCarga) return e.tipoCarga;
    const v = variacaoDe(e);
    return (v && v.tipoCarga) || (catDe(e) && catDe(e).tipoCarga) || 'total';
  }
  const ROTULO_CARGA = { total: 'Carga total (kg)', halter: 'Kg por halter', lado: 'Kg por lado', corporal: 'Carga adicional (kg)' };
  const SUFIXO_CARGA = { total: 'kg', halter: 'kg/halter', lado: 'kg/lado', corporal: 'kg adic.' };
  const fmtSerie = (s, e) => `${fmtKg(s.kg)} ${SUFIXO_CARGA[e ? tipoCargaDe(e) : 'total']} × ${s.reps}`;
  function descricao(e) {
    const p = [`${e.series} × ${e.reps || '-'}`];
    if (e.carga !== '' && e.carga != null) p.push(`${fmtKg(e.carga)} kg`);
    if (e.descanso) p.push(`${e.descanso}s descanso`);
    return p.join(' · ');
  }
  function sessoesDe(e) {
    const l = estado.log[e.id] || [];
    if (!temVariacoes(e)) return l;
    const v = variacaoDe(e).id;
    const primeira = catDe(e).variacoes[0].id;
    return l.filter((s) => (s.variacao || primeira) === v);
  }
  const ultimaSessao = (e) => { const l = sessoesDe(e); return l[l.length - 1] || null; };

  // Sugestão de valores para a série i (nunca aumenta a carga sozinho):
  // série anterior de hoje → mesma série do último treino → meta cadastrada.
  function sugestao(e, i) {
    if (i > 0 && e.feitas[i - 1]) return { reps: e.feitas[i - 1].reps, kg: e.feitas[i - 1].kg };
    const u = ultimaSessao(e);
    if (u && u.series.length) { const s = u.series[i] || u.series[u.series.length - 1]; return { reps: s.reps, kg: s.kg }; }
    return { reps: metaReps(e), kg: num(e.carga) };
  }

  // Progressão: atingiu o topo da faixa em todas as séries do último treino?
  function progressao(e) {
    const u = ultimaSessao(e);
    const f = faixa(e);
    if (!u || !f || u.series.length < e.series) return null;
    const topo = f[1];
    if (!u.series.every((s) => s.reps >= topo)) return null;
    const kg = Math.max(...u.series.map((s) => s.kg));
    const tipo = tipoCargaDe(e);
    let txt;
    if (kg <= 0) txt = 'considere acrescentar uma carga pequena ou deixar o movimento mais difícil';
    else if (tipo === 'halter') txt = 'considere subir para o próximo halter (normalmente +1 a +2 kg por halter)';
    else {
      const r = (v) => Math.max(1, Math.round(v * 2) / 2);
      const lo = r(kg * 0.025); const hi = Math.max(lo, r(kg * 0.05));
      txt = `considere subir aos poucos, cerca de +${fmtKg(lo)}${hi > lo ? ` a +${fmtKg(hi)}` : ''} kg (2,5–5%)`;
    }
    return { topo, kg, texto: txt };
  }

  // ---------- Navegação ----------
  let vista = 'vInicio';
  function irPara(id) {
    vista = id;
    document.querySelectorAll('.vista').forEach((v) => { v.hidden = v.id !== id; });
    document.querySelectorAll('.menu button').forEach((b) => b.classList.toggle('ativo', b.dataset.ir === id));
    renderVista();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-ir]').forEach((b) => { b.onclick = () => irPara(b.dataset.ir); });

  function render() { renderVista(); }
  function renderVista() {
    if (vista === 'vInicio') renderInicio();
    else if (vista === 'vTreinos') { renderAbas(); renderTreino(); renderProximo(); }
    else if (vista === 'vExercicios') renderExercicios();
    else if (vista === 'vEvolucao') renderEvolucao();
  }

  // ---------- Início ----------
  const doPrograma = (x) => estado.programa && x.programa === estado.programa.id;

  function proximoTreinoApos(i) {
    for (let k = 1; k <= TOTAL_TREINOS; k++) {
      const j = (i + k) % TOTAL_TREINOS;
      if (estado.treinos[j].exercicios.length) return j;
    }
    return i;
  }
  function proximoDaSequencia() {
    const ultimo = estado.programa ? estado.historico.find(doPrograma) : estado.historico[0];
    if (!ultimo) return Math.max(0, estado.treinos.findIndex((t) => t.exercicios.length));
    return proximoTreinoApos(ultimo.treino);
  }

  function renderInicio() {
    const p = estado.perfil || (PROGRAMA && PROGRAMA.perfil);
    const dur = (PROGRAMA && PROGRAMA.duracaoDias) || 90;
    if (p) {
      const d = difDias(p.inicio, hoje());
      $('iDia').textContent = d < 0 ? `Começa em ${dataLonga(p.inicio)}` : `Dia ${Math.min(d, dur)} de ${dur}`;
      $('iBarra90').style.width = `${Math.max(0, Math.min(1, d / dur)) * 100}%`;
      $('iDatas').textContent = `Início ${dataLonga(p.inicio)} · término previsto ${dataLonga(somaDias(p.inicio, dur))}`;
    }
    const doProg = estado.historico.filter(doPrograma);
    $('iTreinos').textContent = String(doProg.length);
    $('iSeries').textContent = String(doProg.reduce((t, x) => t + num(x.series), 0));
    $('iDescansos').textContent = String(estado.descansos.filter((d) => !p || d >= p.inicio).length);

    // Treino atual
    const s = estado.sessao;
    const i = s ? s.treino : proximoDaSequencia();
    const t = estado.treinos[i];
    $('iAtualNome').textContent = nomeTreino(i);
    const nSeries = t.exercicios.reduce((a, e) => a + e.series, 0);
    $('iAtualInfo').textContent = s
      ? `Em andamento · ${t.exercicios.reduce((a, e) => a + e.feitas.length, 0)} de ${nSeries} séries feitas`
      : `${t.exercicios.length} exercícios · ${nSeries} séries${t.objetivo ? ' · ' + t.objetivo : ''}`;
    $('iAtualBtn').textContent = s ? 'CONTINUAR TREINO' : 'INICIAR TREINO';
    $('iAtualBtn').onclick = () => iniciarTreino(i);
    $('iAtualBtn').disabled = !t.exercicios.length;
    const descansouHoje = estado.descansos.includes(hoje());
    $('iDescanso').textContent = descansouHoje ? '✓ Descanso registrado hoje (toque para desfazer)' : 'Registrar dia de descanso';

    // Cards dos 5 treinos
    const lista = $('iTreinosLista');
    lista.innerHTML = '';
    estado.treinos.forEach((tr, k) => {
      const ult = estado.historico.find((x) => x.treino === k && doPrograma(x));
      const ns = tr.exercicios.reduce((a, e) => a + e.series, 0);
      lista.append(h('div', { class: 'card-treino' + (k === i ? ' proximo-treino' : '') },
        h('div', { class: 'num' }, `TREINO ${k + 1}`, k === i ? h('span', { class: 'selo', text: s ? 'em andamento' : 'próximo' }) : null),
        h('h3', { text: tr.nome || 'Sem nome' }),
        tr.objetivo ? h('p', { text: tr.objetivo }) : null,
        h('p', { text: `${tr.exercicios.length} exercícios · ${ns} séries · ${ult ? 'último: ' + haQuanto(ult.data) : 'ainda não feito'}` }),
        h('div', { class: 'linha-btns' },
          h('button', { class: 'btn primario', text: 'INICIAR TREINO', disabled: !tr.exercicios.length, onclick: () => iniciarTreino(k) }),
          h('button', { class: 'btn leve', text: 'Ver ficha', onclick: () => { estado.atual = k; salvar(); irPara('vTreinos'); } }),
        ),
      ));
    });
    renderHistorico();
    renderDados();
    renderAvisos();
  }

  function renderDados() {
    $('dUltimoBackup').textContent = estado.ultimoBackup
      ? `Último backup: ${dataLonga(estado.ultimoBackup)} (${haQuanto(estado.ultimoBackup)}).`
      : 'Nenhum backup feito ainda neste aparelho.';
    const c = lerCopia();
    $('dLimpeza').hidden = !c;
    if (c) {
      const r = c.resumo || {};
      $('dLimpezaTxt').textContent = `Em ${dataLonga(c.data)} o app apagou o histórico de teste (${r.treinos || 0} treino(s) concluído(s), ${r.exercicios || 0} registro(s) de exercício, ${r.descansos || 0} dia(s) de descanso). Uma cópia ficou guardada neste aparelho caso você queira desfazer.`;
    }
  }

  const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  function lerFlag(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function gravarFlag(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignora */ } }

  function renderAvisos() {
    $('iInstalar').hidden = !(ehIOS() && !instalado() && !lerFlag('projeto-v-ocultar-instalar'));
    const temDados = temHistorico(estado) || estado.avaliacoes.some((a) => a.marco !== 0 || Object.keys(a.fotos || {}).length);
    const dias = estado.ultimoBackup ? difDias(estado.ultimoBackup, hoje()) : null;
    const mostrar = temDados && (dias == null || dias >= 7);
    $('iBackupAviso').hidden = !mostrar;
    if (mostrar) $('iBackupTxt').textContent = `${dias == null ? 'Você ainda não fez nenhum backup.' : `Último backup há ${dias} dias.`} Seus registros ficam só neste aparelho — guarde uma cópia no app Arquivos ou no iCloud Drive.`;
  }
  $('iInstalarFechar').onclick = () => { gravarFlag('projeto-v-ocultar-instalar', '1'); renderAvisos(); };
  $('iBackupBtn').onclick = () => exportarBackup();

  $('btnApagarHist').onclick = () => {
    if (!temHistorico(estado)) { alert('Não há histórico de treinos para apagar.'); return; }
    if (!confirm('Apagar TODO o histórico de treinos (treinos concluídos, cargas registradas e dias de descanso)?\n\nA ficha, os vídeos e a evolução corporal continuam. Se quiser guardar uma cópia, exporte um backup antes.')) return;
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    limparHistorico();
    salvar(); fecharModo(); renderVista();
  };
  $('dLimpezaDesfazer').onclick = () => {
    const c = lerCopia();
    if (!c || !confirm('Restaurar o histórico que foi apagado? (o que você registrou depois da limpeza será substituído)')) return;
    estado = normalizar(c.estado);
    if (!estado.limpezas.includes(LIMPEZA_TESTE)) estado.limpezas.push(LIMPEZA_TESTE);
    salvar();
    try { localStorage.removeItem(CHAVE_COPIA); } catch (_) { /* ignora */ }
    renderVista();
  };
  $('dLimpezaDescartar').onclick = () => {
    if (!confirm('Descartar a cópia do histórico de teste? Depois disso não dá mais para desfazer.')) return;
    try { localStorage.removeItem(CHAVE_COPIA); } catch (_) { /* ignora */ }
    renderDados();
  };

  $('iDescanso').onclick = () => {
    const d = hoje();
    if (estado.descansos.includes(d)) estado.descansos = estado.descansos.filter((x) => x !== d);
    else estado.descansos = [...estado.descansos, d].sort();
    salvar(); renderInicio();
  };

  function renderHistorico() {
    const ul = $('historico');
    ul.innerHTML = '';
    const itens = [
      ...estado.historico.map((x) => ({ tipo: 'treino', data: x.data, x })),
      ...estado.descansos.map((d) => ({ tipo: 'descanso', data: d })),
    ].sort((a, b) => (diaLocal(b.data) - diaLocal(a.data)) || (b.data > a.data ? 1 : -1)).slice(0, 20);
    if (!itens.length) { ul.append(h('li', {}, h('span', { text: 'Nenhum treino concluído ainda.' }))); return; }
    itens.forEach((it) => {
      if (it.tipo === 'descanso') {
        ul.append(h('li', { class: 'descanso-dia' }, h('span', { text: '😴 Dia de descanso' }), h('span', { text: dataCurta(it.data) })));
        return;
      }
      const x = it.x;
      const partes = [`${rotulo(x.treino)}${x.nome ? ' — ' + x.nome : ''}`];
      if (x.series != null) partes.push(`${x.series}${x.seriesPlanejadas ? '/' + x.seriesPlanejadas : ''} séries`);
      else partes.push(`${x.feitos}/${x.total} exerc.`);
      if (x.duracao) partes.push(mmss(x.duracao));
      if (x.volume) partes.push(`${fmtKg(x.volume)} kg`);
      ul.append(h('li', {}, h('span', { text: partes.join(' · ') }), h('span', { text: dataCurta(x.data) })));
    });
  }

  function iniciarTreino(i) {
    const s = estado.sessao;
    if (s && s.treino !== i && !confirm(`O ${rotulo(s.treino)} está em andamento. Começar o ${rotulo(i)}? (as séries já feitas continuam salvas)`)) return;
    estado.atual = i;
    salvar();
    abrirModo();
  }

  // ---------- Treinos (ficha) ----------
  function renderAbas() {
    const abas = $('abas');
    abas.innerHTML = '';
    estado.treinos.forEach((t, i) => {
      abas.append(h('button', {
        class: 'aba' + (i === estado.atual ? ' ativa' : ''),
        'aria-label': rotulo(i) + (t.nome ? ` — ${t.nome}` : ''),
        onclick: () => { estado.atual = i; salvar(); renderVista(); },
      }, String(i + 1), h('small', { text: t.nome || `${t.exercicios.length} exerc.` })));
    });
  }

  function renderTreino() {
    const t = treinoAtual();
    const nome = $('nomeTreino');
    if (document.activeElement !== nome) nome.value = t.nome;
    nome.placeholder = `${rotulo(estado.atual)} — ex.: Peito e tríceps`;
    $('objetivoTreino').textContent = t.objetivo ? `Objetivo: ${t.objetivo}` : '';

    const lista = $('lista');
    lista.innerHTML = '';
    t.exercicios.forEach((e, idx) => lista.append(itemExercicio(e, idx, t.exercicios.length)));

    const total = t.exercicios.length;
    const feitos = t.exercicios.filter(feito).length;
    const nSeries = t.exercicios.reduce((a, e) => a + e.series, 0);
    $('vazio').hidden = total > 0;
    $('barra').style.width = total ? `${(feitos / total) * 100}%` : '0';
    $('contagem').textContent = total ? `${feitos} de ${total} exercícios feitos · ${nSeries} séries no treino` : '';
    $('btnConcluir').disabled = total === 0;
    const comecar = $('btnComecar');
    comecar.hidden = total === 0;
    comecar.textContent = sessaoDoAtual() ? 'CONTINUAR TREINO' : 'INICIAR TREINO';
  }

  function itemExercicio(e, idx, total) {
    const info = h('div', { class: 'info', onclick: () => abrirModo(idx) },
      h('div', { class: 'titulo', text: e.nome }),
      temVariacoes(e) ? h('div', { class: 'detalhes', text: `Variação: ${variacaoDe(e).nome}` }) : null,
      h('div', { class: 'detalhes', text: descricao(e) }),
    );
    if (e.feitas.length && !feito(e)) info.append(h('div', { class: 'detalhes series-mini', text: `${e.feitas.length}/${e.series} séries feitas` }));
    const u = ultimaSessao(e);
    if (u && u.series.length) {
      const melhor = u.series.reduce((a, b) => (b.kg > a.kg ? b : a));
      info.append(h('div', { class: 'detalhes ultima', text: `Última: ${fmtSerie(melhor, e)} (${haQuanto(u.data)})` }));
    }
    if (e.obs) info.append(h('div', { class: 'obs', text: e.obs }));

    const check = h('button', {
      class: 'check', text: feito(e) ? '✓' : '', 'aria-label': feito(e) ? 'Desmarcar' : 'Marcar como feito',
      onclick: () => {
        if (feito(e)) e.feitas = [];
        else while (e.feitas.length < e.series) e.feitas.push({ ...sugestao(e, e.feitas.length), t: new Date().toISOString() });
        salvar(); renderVista();
      },
    });
    return h('li', { class: 'item' + (feito(e) ? ' feito' : '') },
      check, info,
      h('button', { class: 'btn leve pequeno stats', text: '📊', 'aria-label': 'Resumo e histórico', onclick: () => abrirDetalhes(e.id) }),
      h('button', { class: 'btn leve pequeno editar', text: '✎', 'aria-label': 'Editar exercício', onclick: () => abrirForm(e.id) }),
      h('div', { class: 'mover' },
        botaoMini('▲', 'Mover para cima', idx === 0, () => moverExercicio(idx, -1)),
        botaoMini('▼', 'Mover para baixo', idx === total - 1, () => moverExercicio(idx, 1))),
    );
  }

  function botaoMini(txt, label, desativado, acao) {
    const b = h('button', { class: 'mini', text: txt, 'aria-label': label, onclick: acao });
    b.disabled = desativado;
    b.style.visibility = desativado ? 'hidden' : 'visible';
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

  function renderProximo() {
    const p = $('proximo');
    p.innerHTML = '';
    const prox = proximoDaSequencia();
    p.append('Próximo na sequência: ', h('b', { text: nomeTreino(prox) }));
  }

  $('nomeTreino').addEventListener('input', (ev) => { treinoAtual().nome = ev.target.value; salvar(); renderAbas(); });
  $('nomeTreino').addEventListener('change', renderVista);
  $('btnAdd').onclick = () => abrirForm();
  $('btnComecar').onclick = () => iniciarTreino(estado.atual);
  $('btnConcluir').onclick = () => {
    const t = treinoAtual();
    if (!t.exercicios.length) return;
    const feitas = t.exercicios.reduce((a, e) => a + e.feitas.length, 0);
    const total = t.exercicios.reduce((a, e) => a + e.series, 0);
    if (!feitas) { alert('Nenhuma série foi registrada neste treino ainda.'); return; }
    if (confirm(`Concluir ${rotulo(estado.atual)}? ${feitas} de ${total} séries registradas.`)) concluirTreino();
  };

  // ---------- Exercícios (lista com histórico) ----------
  function renderExercicios() {
    const box = $('exLista');
    box.innerHTML = '';
    estado.treinos.forEach((t, i) => {
      if (!t.exercicios.length) return;
      const g = h('div', { class: 'grupo-ex' }, h('h3', { text: nomeTreino(i) }));
      t.exercicios.forEach((e) => {
        const l = sessoesDe(e);
        const u = l[l.length - 1];
        const todas = l.flatMap((s) => s.series);
        const sub = u
          ? `Última: ${fmtSerie(u.series.reduce((a, b) => (b.kg > a.kg ? b : a)), e)} · Melhor carga: ${fmtKg(Math.max(...todas.map((s) => s.kg)))} kg`
          : 'Sem registros ainda';
        g.append(h('button', { class: 'ex-linha', onclick: () => abrirDetalhes(e.id) },
          h('div', {}, e.nome, temVariacoes(e) ? ` (${variacaoDe(e).nome})` : '', h('small', { text: `${e.series} × ${e.reps} · ${sub}` })),
          h('b', { text: '📊' })));
      });
      box.append(g);
    });
  }

  // ---------- Formulário de exercício ----------
  const dlg = $('dlg');
  const form = $('form');
  let editando = null; // { ti, id }

  function acharExercicio(id) {
    for (let ti = 0; ti < estado.treinos.length; ti++) {
      const e = estado.treinos[ti].exercicios.find((x) => x.id === id);
      if (e) return { e, ti };
    }
    return null;
  }

  function abrirForm(id = null, focarVideo = false) {
    const achado = id ? acharExercicio(id) : null;
    const e = achado ? achado.e : null;
    editando = { ti: achado ? achado.ti : estado.atual, id: e ? e.id : null };
    $('dlgTitulo').textContent = e ? 'Editar exercício' : `Novo exercício — ${rotulo(estado.atual)}`;
    $('dlgAviso').hidden = !(e && e.cat);
    form.nome.value = e ? e.nome : '';
    form.series.value = e ? e.series : 3;
    form.reps.value = e ? e.reps : '12';
    form.carga.value = e ? e.carga : '';
    form.descanso.value = e ? e.descanso : 90;
    form.tipoCarga.value = e && e.tipoCarga ? e.tipoCarga : '';
    form.video.value = e ? e.video : '';
    form.obs.value = e ? e.obs : '';
    $('btnExcluir').hidden = !e;
    $('btnRestaurar').hidden = !(e && e.cat && planoDe(e.cat));
    dlg.showModal();
    if (focarVideo) form.video.focus();
    else if (!e) form.nome.focus();
  }

  function planoDe(cat) {
    if (!PROGRAMA) return null;
    for (const t of PROGRAMA.treinos) for (const [c, series, reps] of t.exercicios) if (c === cat) return { series, reps };
    return null;
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = form.nome.value.trim();
    if (!nome) { form.nome.focus(); return; }
    const dados = {
      nome,
      series: Math.max(1, num(form.series.value, 1)),
      reps: form.reps.value.trim(),
      carga: numOuVazio(form.carga.value),
      descanso: Math.max(0, num(form.descanso.value)),
      tipoCarga: form.tipoCarga.value || null,
      video: form.video.value.trim(),
      obs: form.obs.value.trim(),
    };
    const lista = estado.treinos[editando.ti].exercicios;
    if (editando.id) {
      const e = lista.find((x) => x.id === editando.id);
      Object.assign(e, dados);
      e.feitas = e.feitas.slice(0, e.series);
    } else {
      lista.push({ id: novoId(), cat: null, variacao: null, descansoFaixa: '', nota: '', feitas: [], ...dados });
    }
    salvar(); dlg.close(); atualizarTudo(true);
  });

  $('btnRestaurar').onclick = () => {
    const e = acharExercicio(editando.id).e;
    const p = planoDe(e.cat);
    const c = CATALOGO[e.cat];
    form.nome.value = c.nome; form.series.value = p.series; form.reps.value = p.reps; form.descanso.value = c.descanso;
  };
  $('btnCancelar').onclick = () => dlg.close();
  $('btnExcluir').onclick = () => {
    if (!editando.id) return;
    if (!confirm('Excluir este exercício da ficha? O histórico de cargas dele continua guardado.')) return;
    const t = estado.treinos[editando.ti];
    const idx = t.exercicios.findIndex((x) => x.id === editando.id);
    t.exercicios.splice(idx, 1);
    const s = estado.sessao && estado.sessao.treino === editando.ti ? estado.sessao : null;
    if (s) {
      if (!t.exercicios.length) { estado.sessao = null; fecharModo(); }
      else {
        if (s.ex > idx || s.ex >= t.exercicios.length) s.ex = Math.max(0, s.ex - 1);
        if (s.prox > idx || s.prox >= t.exercicios.length) s.prox = Math.max(0, s.prox - 1);
        delete s.entrada;
      }
    }
    salvar(); dlg.close(); fecharDetalhes(); atualizarTudo(true);
  };

  function atualizarTudo(recarregarMidia) {
    renderVista();
    if (modoAberto()) { if (recarregarMidia) midiaDe = null; renderModo(); }
    if (!$('det').hidden) renderDetalhes();
  }

  // ---------- Conclusão do treino + resumo ----------
  function concluirTreino() {
    const ti = estado.atual;
    const t = treinoAtual();
    const s = sessaoDoAtual();
    const agora = new Date().toISOString();
    let vol = 0; let nSeries = 0;
    const linhas = [];
    t.exercicios.forEach((e) => {
      if (!e.feitas.length) return;
      const v = variacaoDe(e);
      (estado.log[e.id] = estado.log[e.id] || []).push({
        data: agora, treino: ti, variacao: v ? v.id : undefined, variacaoNome: temVariacoes(e) ? v.nome : undefined,
        series: e.feitas.map(serie), obs: e.nota || undefined,
      });
      vol += volume(e.feitas); nSeries += e.feitas.length;
      const top = e.feitas.reduce((a, b) => (b.kg > a.kg ? b : a));
      linhas.push([e.nome, `${e.feitas.length}/${e.series} · melhor ${fmtSerie(top, e)}`]);
    });
    const planejadas = t.exercicios.reduce((a, e) => a + e.series, 0);
    const duracao = s ? Math.round(((s.fimTreino || Date.now()) - s.inicio) / 1000) : 0;
    const anterior = estado.historico.find((x) => x.treino === ti && doPrograma(x)) || null;
    estado.historico.unshift({
      programa: estado.programa ? estado.programa.id : undefined,
      treino: ti, nome: t.nome, data: agora,
      feitos: t.exercicios.filter(feito).length, total: t.exercicios.length,
      series: nSeries, seriesPlanejadas: planejadas, duracao, volume: Math.round(vol),
    });
    estado.historico = estado.historico.slice(0, 500);
    t.exercicios.forEach((e) => { e.feitas = []; e.nota = ''; });
    estado.sessao = null;
    estado.atual = proximoTreinoApos(ti);
    salvar();
    fecharModo();
    renderVista();
    mostrarResumo(ti, t.nome, duracao, nSeries, planejadas, vol, linhas, anterior);
  }

  function mostrarResumo(ti, nome, duracao, nSeries, planejadas, vol, linhas, anterior) {
    if (anterior) {
      const dv = Math.round(vol) - num(anterior.volume);
      const pct = anterior.volume ? Math.round((dv / anterior.volume) * 100) : 0;
      $('rsComp').textContent = `Comparado ao ${rotulo(ti)} anterior (${haQuanto(anterior.data)}): volume ${dv >= 0 ? '+' : '−'}${fmtKg(Math.abs(dv))} kg (${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%) · séries ${num(anterior.series)} → ${nSeries}${anterior.duracao && duracao ? ` · tempo ${mmss(anterior.duracao)} → ${mmss(duracao)}` : ''}.`;
    } else {
      $('rsComp').textContent = `Primeiro ${rotulo(ti)} registrado. O próximo será comparado com este.`;
    }
    $('rsTitulo').textContent = `${rotulo(ti)}${nome ? ' — ' + nome : ''}`;
    const k = $('rsKpis'); k.innerHTML = '';
    k.append(
      h('div', {}, h('b', { text: duracao ? mmss(duracao) : '—' }), h('span', { text: 'duração' })),
      h('div', {}, h('b', { text: `${nSeries}/${planejadas}` }), h('span', { text: 'séries concluídas' })),
      h('div', {}, h('b', { text: `${fmtKg(Math.round(vol))}` }), h('span', { text: 'kg de volume' })),
    );
    const ul = $('rsLista'); ul.innerHTML = '';
    linhas.forEach(([a, b]) => ul.append(h('li', {}, h('span', { text: a }), h('span', { text: b }))));
    $('dlgResumo').showModal();
  }
  $('rsOk').onclick = () => $('dlgResumo').close();

  // ---------- Tela de treino ----------
  // sessao: { treino, inicio, ex, fase: 'serie'|'descanso'|'completo', desde, fim, pausa, descansoTotal, prox, fimTreino, entrada }
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
      irExercicio(exIdx);
    }
    salvar();
    $('modo').hidden = false;
    document.body.classList.add('treinando');
    midiaDe = null;
    $('mComo').open = false;
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
    renderVista();
  }

  function irExercicio(i) {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    if (!s || i < 0 || i >= t.exercicios.length) return;
    s.ex = i;
    s.fase = feito(t.exercicios[i]) && primeiroPendente(t) === -1 ? 'completo' : 'serie';
    s.desde = Date.now();
    delete s.fim; delete s.prox; delete s.entrada; delete s.pausa;
    if (s.fase === 'serie') delete s.fimTreino;
  }

  function exibido() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    const idx = s.fase === 'descanso' ? s.prox : s.ex;
    const e = t.exercicios[idx];
    return { s, t, idx, e, i: Math.min(e.feitas.length, e.series - 1) };
  }

  function entradaAtual() {
    const { s, e, i } = exibido();
    const chave = `${e.id}:${e.variacao}:${i}`;
    if (!s.entrada || s.entrada.chave !== chave) s.entrada = { chave, ...sugestao(e, i) };
    return s.entrada;
  }

  function iniciarDescanso(segundos, prox) {
    const s = sessaoDoAtual();
    s.fase = 'descanso'; s.desde = Date.now(); s.prox = prox;
    s.descansoTotal = segundos; s.fim = Date.now() + segundos * 1000;
    delete s.pausa;
  }

  function terminarSerie() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    const e = t.exercicios[s.ex];
    if (feito(e)) { irExercicio(Math.max(0, primeiroPendente(t, s.ex + 1))); salvar(); renderModo(); return; }
    const ent = entradaAtual();
    e.feitas.push({ reps: Math.max(0, Math.round(num(ent.reps))), kg: Math.max(0, num(ent.kg)), t: new Date().toISOString() });
    delete s.entrada;
    let prox = s.ex;
    if (feito(e)) {
      prox = primeiroPendente(t, s.ex + 1);
      if (prox === -1) {
        s.fase = 'completo'; s.fimTreino = Date.now();
        alertar();
        salvar(); renderModo();
        return;
      }
    }
    if (e.descanso > 0) iniciarDescanso(e.descanso, prox);
    else irExercicio(prox);
    salvar(); renderModo();
  }

  function fimDoDescanso() {
    const s = sessaoDoAtual();
    const ent = s.entrada; // mantém o que foi ajustado durante o descanso
    irExercicio(s.prox);
    if (ent) s.entrada = ent;
  }

  function tickModo() {
    const s = sessaoDoAtual();
    if (!s) return;
    if (s.fase === 'descanso' && s.pausa == null && Date.now() >= s.fim) {
      fimDoDescanso();
      salvar(); alertar(); renderModo();
      return;
    }
    atualizarTempos();
  }

  function atualizarTempos() {
    const s = sessaoDoAtual();
    if (!s) return;
    $('mTotal').textContent = mmss(((s.fimTreino || Date.now()) - s.inicio) / 1000);
    if (s.fase === 'descanso') {
      const resta = s.pausa != null ? s.pausa : s.fim - Date.now();
      $('mTempo').textContent = mmss(Math.ceil(resta / 1000));
    } else if (s.fase === 'serie' && !feito(treinoAtual().exercicios[s.ex])) {
      $('mTempo').textContent = mmss((Date.now() - s.desde) / 1000);
    }
  }

  function renderModo() {
    const s = sessaoDoAtual();
    const t = treinoAtual();
    if (!s || !t.exercicios.length) { fecharModo(); return; }
    const { idx, e, i } = exibido();
    const tipo = tipoCargaDe(e);

    $('mTreino').textContent = nomeTreino(estado.atual);
    $('mPosicao').textContent = `Exercício ${idx + 1} de ${t.exercicios.length}`;
    $('mNome').textContent = e.nome;
    const chaveMidia = `${e.id}|${e.variacao}|${e.video}`;
    if (midiaDe !== chaveMidia) { midiaDe = chaveMidia; renderMidia($('mMidia'), e); renderComo($('mComoCorpo'), e); }
    renderSeletorVariacao($('mVariacao'), e);

    const meta = $('mMeta');
    meta.innerHTML = '';
    meta.append(`Meta: ${e.reps || '-'} reps`);
    if (e.descansoFaixa) meta.append(h('span', { text: ` · descanso ${e.descanso}s (${e.descansoFaixa})` }));
    const u = ultimaSessao(e);
    if (u && u.series.length) meta.append(h('span', { text: ` · Última: ${fmtSerie(u.series[i] || u.series[u.series.length - 1], e)} reps` }));

    const pg = $('mProgressao');
    pg.innerHTML = '';
    const prog = progressao(e);
    if (prog) pg.append(h('div', { class: 'aviso-prog' }, h('b', { text: '💡 Hora de progredir? ' }),
      `No último treino você fez ${prog.topo}+ repetições (topo da faixa) em todas as séries. Se a execução foi boa, ${prog.texto}. A carga não muda sozinha: ajuste no campo de peso.`));

    // Lista de séries
    const ol = $('mSeries');
    ol.innerHTML = '';
    for (let k = 0; k < e.series; k++) {
      const x = e.feitas[k];
      if (x) {
        ol.append(h('li', { class: 'ok', title: 'Toque para editar', onclick: () => editarSerie(e.feitas, k, e) },
          h('span', { class: 's-n', text: `Série ${k + 1}` }),
          h('span', { class: 's-v', text: `${fmtKg(x.kg)} ${SUFIXO_CARGA[tipo]} — ${x.reps} reps` }),
          h('span', { class: 's-st', text: `✓ Concluída${x.t ? ' · ' + horaCurta(x.t) : ''}` })));
      } else {
        const agora = k === e.feitas.length && s.fase !== 'completo';
        ol.append(h('li', { class: agora ? 'agora' : '' },
          h('span', { class: 's-n', text: `Série ${k + 1}` }),
          h('span', { class: 's-v', text: `prevista ${e.reps} reps` }),
          h('span', { class: 's-st', text: agora ? (s.fase === 'descanso' ? 'a seguir' : 'em andamento') : 'pendente' })));
      }
    }
    $('mObs').textContent = [e.obs, e.nota ? `Hoje: ${e.nota}` : ''].filter(Boolean).join(' · ');
    $('mNota').textContent = e.nota ? '📝 Editar observação de hoje' : '📝 Adicionar observação';

    const bol = $('mBolinhas');
    bol.innerHTML = '';
    for (let k = 0; k < e.series; k++) {
      bol.append(h('div', {
        class: 'bolinha' + (k < e.feitas.length ? ' feita' : (k === e.feitas.length && s.fase !== 'completo' ? ' atual' : '')),
        text: k < e.feitas.length ? '✓' : String(k + 1),
      }));
    }

    $('mFase').className = 'fase ' + s.fase + (s.pausa != null ? ' pausado' : '');
    const acao = $('mAcao');
    const ent = s.fase !== 'completo' && !feito(e) ? entradaAtual() : null;
    $('mEntrada').hidden = !ent;
    $('inKgRotulo').textContent = ROTULO_CARGA[tipo];
    if (ent) {
      if (document.activeElement !== $('inReps')) $('inReps').value = ent.reps;
      if (document.activeElement !== $('inKg')) $('inKg').value = ent.kg;
    }
    if (s.fase === 'serie' && !feito(e)) {
      $('mRotulo').textContent = `Série ${i + 1} de ${e.series}`;
      $('mProx').textContent = `prevista: ${e.reps} reps`;
      acao.textContent = '✓ Concluir série';
      acao.className = 'btn sucesso enorme';
    } else if (s.fase === 'serie') {
      $('mRotulo').textContent = 'Exercício feito';
      $('mTempo').textContent = '✓';
      $('mProx').textContent = 'Toque numa série para corrigir';
      acao.textContent = 'Ir para o próximo ▶';
      acao.className = 'btn primario enorme';
    } else if (s.fase === 'descanso') {
      $('mRotulo').textContent = s.pausa != null ? 'Descanso (pausado)' : 'Descanso';
      $('mProx').textContent = idx === s.ex ? `A seguir: série ${i + 1} de ${e.series}` : `A seguir: ${e.nome} — série 1`;
      acao.textContent = 'Pular descanso ⏭';
      acao.className = 'btn primario enorme';
    } else {
      const feitas = t.exercicios.reduce((a, x) => a + x.feitas.length, 0);
      const plan = t.exercicios.reduce((a, x) => a + x.series, 0);
      const vol = t.exercicios.reduce((a, x) => a + volume(x.feitas), 0);
      $('mRotulo').textContent = 'Treino completo!';
      $('mTempo').textContent = '💪 Mandou bem';
      $('mProx').textContent = `${mmss(((s.fimTreino || Date.now()) - s.inicio) / 1000)} · ${feitas}/${plan} séries · ${fmtKg(Math.round(vol))} kg de volume`;
      acao.textContent = '✓ Finalizar e salvar treino';
      acao.className = 'btn sucesso enorme';
    }
    const desc = s.fase === 'descanso';
    ['mMenos15', 'mPausar', 'mReiniciar', 'mMais15'].forEach((id) => { $(id).hidden = !desc; });
    ['mAnterior', 'mDesfazer', 'mProximo'].forEach((id) => { $(id).hidden = desc; });
    $('mDescansar').hidden = desc || s.fase === 'completo';
    $('mPausar').textContent = s.pausa != null ? '▶ Retomar' : '⏸ Pausar';
    $('mDesfazer').disabled = t.exercicios[s.ex].feitas.length === 0;
    $('mAnterior').disabled = s.ex === 0;
    $('mProximo').disabled = s.ex >= t.exercicios.length - 1;
    atualizarTempos();
  }

  function renderSeletorVariacao(box, e) {
    box.innerHTML = '';
    if (!temVariacoes(e)) return;
    const sel = h('select', { 'aria-label': 'Variação do exercício' });
    catDe(e).variacoes.forEach((v) => sel.append(h('option', { value: v.id, text: `Variação: ${v.nome}` })));
    sel.value = variacaoDe(e).id;
    sel.onchange = () => {
      e.variacao = sel.value;
      const s = estado.sessao; if (s) delete s.entrada;
      salvar(); atualizarTudo(true);
    };
    box.append(sel);
  }

  function renderComo(box, e) {
    box.innerHTML = '';
    const v = variacaoDe(e);
    if (!v || !v.instrucoes) {
      box.append(h('p', { class: 'nota-peq', text: 'Instruções não cadastradas para este exercício. Use o vídeo como referência e, na dúvida, peça orientação ao professor da academia.' }));
      return;
    }
    const titulos = ['Posição inicial', 'Movimento', 'Descida / retorno', 'Erros comuns', 'Postura e amplitude'];
    box.append(h('ol', { class: 'passos' }, v.instrucoes.map((txt, k) => h('li', {}, h('b', { text: titulos[k] }), txt))));
    box.append(h('p', { class: 'nota-peq', text: 'Orientações gerais de execução. Em caso de dor ou dúvida, ajuste com um profissional de educação física.' }));
  }

  // --- steppers ---
  document.querySelectorAll('.stepper button').forEach((b) => {
    b.onclick = () => {
      const ent = entradaAtual();
      const campo = b.dataset.campo;
      ent[campo] = Math.max(0, Math.round((num(ent[campo]) + Number(b.dataset.passo)) * 10) / 10);
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
    $(id).addEventListener('blur', () => { if (modoAberto()) renderModo(); });
  });

  // --- botões da tela de treino ---
  $('mFechar').onclick = fecharModo;
  $('mEditar').onclick = () => abrirForm(exibido().e.id);
  $('mStats').onclick = () => abrirDetalhes(exibido().e.id);
  $('mNota').onclick = () => {
    const e = exibido().e;
    const r = prompt('Observação para este exercício hoje (aparece no histórico):', e.nota || '');
    if (r == null) return;
    e.nota = r.trim().slice(0, 200);
    salvar(); renderModo();
  };
  $('mAcao').onclick = () => {
    const s = sessaoDoAtual();
    if (!s) return;
    destravarAudio();
    if (s.fase === 'serie') terminarSerie();
    else if (s.fase === 'descanso') { fimDoDescanso(); salvar(); renderModo(); }
    else concluirTreino();
  };
  const ajustarDescanso = (ms) => {
    const s = sessaoDoAtual();
    if (!s || s.fase !== 'descanso') return;
    if (s.pausa != null) s.pausa = Math.max(0, s.pausa + ms);
    else s.fim = Math.max(Date.now(), s.fim + ms);
    salvar(); tickModo();
  };
  $('mMais15').onclick = () => ajustarDescanso(15000);
  $('mMenos15').onclick = () => ajustarDescanso(-15000);
  $('mPausar').onclick = () => {
    const s = sessaoDoAtual();
    if (!s || s.fase !== 'descanso') return;
    if (s.pausa != null) { s.fim = Date.now() + s.pausa; delete s.pausa; }
    else s.pausa = Math.max(0, s.fim - Date.now());
    salvar(); renderModo();
  };
  $('mReiniciar').onclick = () => {
    const s = sessaoDoAtual();
    if (!s || s.fase !== 'descanso') return;
    s.fim = Date.now() + (s.descansoTotal || 60) * 1000; delete s.pausa;
    salvar(); renderModo();
  };
  $('mDescansar').onclick = () => {
    const s = sessaoDoAtual();
    const e = treinoAtual().exercicios[s.ex];
    const ent = s.entrada;
    iniciarDescanso(e.descanso || 60, s.ex);
    if (ent) s.entrada = ent;
    salvar(); renderModo();
  };
  $('mDesfazer').onclick = () => {
    const s = sessaoDoAtual();
    const e = treinoAtual().exercicios[s.ex];
    const ultima = e.feitas.pop();
    s.fase = 'serie'; s.desde = Date.now(); delete s.fimTreino;
    if (ultima) s.entrada = { chave: `${e.id}:${e.variacao}:${e.feitas.length}`, reps: ultima.reps, kg: ultima.kg };
    salvar(); renderModo();
  };
  $('mAnterior').onclick = () => { irExercicio(sessaoDoAtual().ex - 1); salvar(); renderModo(); };
  $('mProximo').onclick = () => { irExercicio(sessaoDoAtual().ex + 1); salvar(); renderModo(); };

  // --- editar uma série já registrada (no treino de hoje ou no histórico) ---
  let serieCtx = null;
  function editarSerie(lista, k, e) {
    serieCtx = { lista, k };
    const f = $('formSerie');
    $('dsTitulo').textContent = `${e.nome} — série ${k + 1}`;
    $('dsKgRotulo').firstChild.textContent = `${ROTULO_CARGA[tipoCargaDe(e)]} `;
    f.kg.value = lista[k].kg; f.reps.value = lista[k].reps;
    $('dlgSerie').showModal();
  }
  $('formSerie').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const { lista, k } = serieCtx;
    lista[k] = { ...lista[k], kg: Math.max(0, num(f.kg.value)), reps: Math.max(0, Math.round(num(f.reps.value))) };
    salvar(); $('dlgSerie').close(); atualizarTudo(false);
  });
  $('dsExcluir').onclick = () => {
    if (!confirm('Excluir esta série?')) return;
    serieCtx.lista.splice(serieCtx.k, 1);
    salvar(); $('dlgSerie').close(); atualizarTudo(false);
  };
  $('dsCancelar').onclick = () => $('dlgSerie').close();

  // ---------- Player de demonstração ----------
  function idYoutube(url) {
    const m = String(url).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function demoDe(e) {
    if (e.video) {
      const y = idYoutube(e.video);
      if (y) return { tipo: 'youtube', id: y, titulo: 'Vídeo escolhido por você', autor: '', status: 'usuario' };
      if (/^https?:\/\/.+\.(mp4|webm|mov)(\?|#|$)/i.test(e.video)) return { tipo: 'video', url: e.video, status: 'usuario' };
      if (/^https?:\/\//i.test(e.video)) return { tipo: 'imagem', url: e.video, status: 'usuario' };
    }
    const v = variacaoDe(e);
    return v && v.demo && v.demo.tipo !== 'indisponivel' ? v.demo : null;
  }

  // Vídeos do catálogo que o usuário já assistiu e confirmou (por variação + vídeo)
  const chaveVideo = (e) => { const d = demoDe(e); return `${variacaoDe(e) ? variacaoDe(e).id : ''}:${d && d.id ? d.id : ''}`; };
  const conferido = (e) => (e.conferidos || []).includes(chaveVideo(e));

  const podeTelaCheia = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  function telaCheia(el) {
    const f = el.requestFullscreen || el.webkitRequestFullscreen;
    if (f) f.call(el);
  }

  function renderMidia(box, e) {
    box.innerHTML = '';
    const v = variacaoDe(e);
    const nomeEx = v ? v.nome : e.nome;
    const demo = demoDe(e);
    const midia = h('div', { class: 'midia' });
    const fonte = h('div', { class: 'fonte' });
    box.append(midia, fonte);
    const buscar = `https://www.youtube.com/results?search_query=${encodeURIComponent('como fazer ' + nomeEx + ' execução correta')}`;

    const indisponivel = (motivo) => {
      midia.innerHTML = '';
      midia.append(h('div', { class: 'sem-video' },
        h('b', { text: 'Demonstração indisponível' }),
        h('p', { text: motivo }),
        h('div', { class: 'linha-btns' },
          h('a', { class: 'btn primario pequeno', href: buscar, target: '_blank', rel: 'noopener', text: 'Buscar no YouTube' }),
          h('button', { class: 'btn leve pequeno', text: 'Adicionar vídeo', onclick: () => abrirForm(e.id, true) }))));
    };

    if (!demo) {
      indisponivel('Nenhum vídeo cadastrado para esta variação.');
      fonte.append(h('span', { text: nomeEx }));
      return;
    }

    if (demo.tipo === 'youtube') {
      const capa = h('button', { class: 'capa', 'aria-label': `Reproduzir demonstração: ${nomeEx}` },
        h('img', { src: `https://i.ytimg.com/vi/${demo.id}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
        h('span', { class: 'play', text: '▶' }),
        h('span', { class: 'capa-nome', text: nomeEx }));
      capa.querySelector('img').onerror = () => indisponivel('Não foi possível carregar este vídeo (sem internet, removido ou indisponível).');
      capa.onclick = () => { // só carrega o player quando você toca (economiza dados)
        midia.innerHTML = '';
        midia.append(h('iframe', {
          src: `https://www.youtube-nocookie.com/embed/${demo.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
          title: `Como fazer: ${nomeEx}`,
          allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowfullscreen: true,
        }));
        if (podeTelaCheia()) midia.append(h('button', { class: 'tela-cheia', text: '⛶', 'aria-label': 'Tela cheia', onclick: () => telaCheia(midia) }));
      };
      midia.append(capa);
      fonte.append(
        h('span', { text: `Fonte: YouTube${demo.autor ? ' · ' + demo.autor : ''} · “${demo.titulo || nomeEx}”` }),
        demo.status === 'nao-verificado' && !conferido(e)
          ? h('span', { class: 'aviso-fonte', text: '⚠ Vídeo encontrado por busca, ainda não conferido. Veja se mostra exatamente esta variação.' }) : null,
        demo.status === 'nao-verificado' && conferido(e) ? h('span', { class: 'aviso-fonte', text: '✓ Você conferiu este vídeo.' }) : null,
        h('a', { href: `https://www.youtube.com/watch?v=${demo.id}`, target: '_blank', rel: 'noopener', text: 'Abrir no YouTube ↗' }),
        h('button', { text: 'Trocar vídeo', onclick: () => abrirForm(e.id, true) }),
        demo.status === 'nao-verificado' && !conferido(e)
          ? h('button', { text: '✓ Vídeo correto', onclick: () => { e.conferidos = [...new Set([...(e.conferidos || []), chaveVideo(e)])]; salvar(); atualizarTudo(true); } }) : null,
      );
      return;
    }
    if (demo.tipo === 'video') {
      const vid = h('video', { src: demo.url, controls: true, playsinline: true, preload: 'metadata' });
      vid.onerror = () => indisponivel('Não foi possível carregar este vídeo.');
      midia.append(vid);
    } else {
      const img = h('img', { src: demo.url, alt: `Como fazer: ${nomeEx}` });
      img.onerror = () => indisponivel('Não foi possível carregar esta demonstração.');
      midia.append(img);
    }
    fonte.append(h('span', { text: `Fonte: ${demo.url}` }), h('button', { text: 'Trocar vídeo', onclick: () => abrirForm(e.id, true) }));
  }

  // ---------- Detalhes do exercício ----------
  let detId = null;
  let detAba = 'resumo';

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
    const melhor1RM = (s) => Math.max(0, ...s.series.map(umRM));
    let recorde = 0; let dataRecorde = null;
    sess.forEach((s) => { const v = melhor1RM(s); if (v > recorde) { recorde = v; dataRecorde = s.data; } });
    const melhorSerie = todas.reduce((a, b) => (umRM(b) > umRM(a) || (umRM(b) === umRM(a) && b.kg > a.kg) ? b : a));
    const vols = sess.map((s) => volume(s.series));
    const ult = sess[sess.length - 1];
    return {
      pesoMax: Math.max(...todas.map((s) => s.kg)),
      recorde, dataRecorde,
      evolucao: sess.length > 1 ? { de: melhor1RM(sess[0]), para: melhor1RM(ult) } : null,
      melhorSerie, ult,
      melhorVolume: Math.max(...vols),
      volumeTotal: vols.reduce((a, b) => a + b, 0),
      sessoes: sess.length, series: todas.length,
      reps: todas.reduce((t, s) => t + s.reps, 0),
    };
  }

  function cartao(linhas) {
    return h('div', { class: 'cartao' }, linhas.map(([rot, val, sub]) =>
      h('div', { class: 'linha-stat' }, h('span', { text: rot }), h('b', {}, val, sub ? h('small', { text: sub }) : null))));
  }
  const titulo3 = (txt) => h('h3', { text: txt });

  function renderDetalhes() {
    const achado = acharExercicio(detId);
    if (!achado) { fecharDetalhes(); return; }
    const e = achado.e;
    $('dNome').textContent = e.nome;
    $('dSub').textContent = `${rotulo(achado.ti)} · ${e.series} × ${e.reps}${temVariacoes(e) ? ' · ' + variacaoDe(e).nome : ''}`;
    document.querySelectorAll('.det-abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === detAba));
    const corpo = $('dCorpo');
    corpo.innerHTML = '';
    corpo.scrollTop = 0;
    const selVar = h('div', { class: 'variacao' });
    renderSeletorVariacao(selVar, e);
    if (temVariacoes(e)) corpo.append(selVar);

    if (detAba === 'como') {
      const p = h('div', { class: 'player' });
      corpo.append(p);
      renderMidia(p, e);
      corpo.append(titulo3('COMO EXECUTAR CORRETAMENTE'));
      const como = h('div', {});
      renderComo(como, e);
      corpo.append(como, titulo3('Na ficha'), cartao([
        ['Séries × repetições', `${e.series} × ${e.reps || '-'}`],
        ['Descanso', e.descanso ? `${e.descanso}s${e.descansoFaixa ? ' (' + e.descansoFaixa + ')' : ''}` : '—'],
        ['Registro da carga', ROTULO_CARGA[tipoCargaDe(e)]],
      ]));
      if (e.obs) corpo.append(titulo3('Observações'), h('p', { class: 'como-texto', text: e.obs }));
      return;
    }

    const st = estatisticas(e);
    if (!st) {
      corpo.append(h('p', { class: 'vazio-det', text: 'Ainda não há registros. Faça o exercício na tela de treino e finalize o treino: o resumo e o histórico aparecem aqui.' }));
      return;
    }

    if (detAba === 'resumo') {
      let evo = ['Evolução (1RM estimado)', '—', 'precisa de 2 treinos ou mais'];
      if (st.evolucao) {
        const d = st.evolucao.para - st.evolucao.de;
        const pct = st.evolucao.de ? Math.round((d / st.evolucao.de) * 100) : 0;
        evo = ['Evolução (1RM estimado)', `${d >= 0 ? '+' : '−'}${fmtKg(Math.abs(d))} kg (${pct >= 0 ? '+' : ''}${pct}%)`, 'do primeiro ao último treino'];
      }
      const ultTop = st.ult.series.reduce((a, b) => (b.kg > a.kg ? b : a));
      const prog = progressao(e);
      corpo.append(
        prog ? h('div', { class: 'aviso-prog' }, h('b', { text: '💡 Sugestão de progressão: ' }), `você atingiu ${prog.topo} reps em todas as séries. Se a execução foi boa, ${prog.texto}.`) : '',
        titulo3('Último treino'),
        cartao([
          ['Carga utilizada', `${fmtKg(ultTop.kg)} ${SUFIXO_CARGA[tipoCargaDe(e)]}`, haQuanto(st.ult.data)],
          ['Repetições', st.ult.series.map((s) => s.reps).join(' · ')],
          ['Volume', `${fmtKg(volume(st.ult.series))} kg`],
        ]),
        titulo3('Recordes pessoais'),
        cartao([
          ['Melhor carga', `${fmtKg(st.pesoMax)} kg`],
          ['Melhor 1RM (estimado)', st.recorde ? `${fmtKg(st.recorde)} kg` : '—'],
          evo,
          ['Último recorde', st.dataRecorde ? haQuanto(st.dataRecorde) : '—'],
          ['Melhor série', `${fmtKg(st.melhorSerie.kg)} kg × ${st.melhorSerie.reps} reps`],
        ]),
        titulo3('Volume (séries × repetições × carga)'),
        cartao([
          ['Melhor volume num treino', `${fmtKg(st.melhorVolume)} kg`],
          ['Volume total', `${fmtKg(st.volumeTotal)} kg`],
        ]),
        titulo3('Frequência'),
        cartao([
          ['Total de treinos', String(st.sessoes)],
          ['Total de séries', String(st.series)],
          ['Total de repetições', String(st.reps)],
        ]),
        titulo3('Evolução — maior carga por treino'),
        grafico(sessoesDe(e).map((s) => ({ data: s.data, v: Math.max(0, ...s.series.map((x) => x.kg)) })), 'kg', 'Maior carga por treino'),
      );
      return;
    }

    // Histórico
    sessoesDe(e).slice().reverse().forEach((s) => {
      corpo.append(h('div', { class: 'sessao' },
        h('div', { class: 'sessao-topo' },
          h('b', { text: `${dataCurta(s.data)} · ${horaCurta(s.data)} · ${haQuanto(s.data)}` }),
          h('button', {
            class: 'link-perigo', text: 'Apagar',
            onclick: () => {
              if (!confirm('Apagar este registro do histórico?')) return;
              const l = estado.log[e.id];
              l.splice(l.indexOf(s), 1);
              salvar(); renderDetalhes(); renderVista();
            },
          })),
        s.variacaoNome ? h('div', { class: 'nota-peq', text: s.variacaoNome }) : null,
        h('ol', {}, s.series.map((x, k) => h('li', { title: 'Toque para editar', onclick: () => editarSerie(s.series, k, e) },
          h('span', { text: `Série ${k + 1} — ${fmtKg(x.kg)} ${SUFIXO_CARGA[tipoCargaDe(e)]} — ${x.reps} reps` }),
          h('span', { text: x.t ? horaCurta(x.t) : '' })))),
        s.obs ? h('p', { class: 'obs', text: s.obs }) : null,
        h('div', { class: 'vol', text: `Volume: ${fmtKg(volume(s.series))} kg` })));
    });
  }

  // ---------- Gráfico de linha (uma série, eixo de tempo, toque para ver valores) ----------
  function grafico(pontos, unidade, rotuloAria) {
    const wrap = h('div', { class: 'grafico' });
    const pts = pontos.filter((p) => p.v !== '' && p.v != null && Number.isFinite(Number(p.v))).map((p) => ({ data: p.data, v: Number(p.v) }))
      .sort((a, b) => diaLocal(a.data) - diaLocal(b.data) || (a.data > b.data ? 1 : -1));
    if (pts.length < 2) {
      wrap.style.paddingTop = '0';
      wrap.append(h('p', { class: 'legenda-graf', text: 'O gráfico aparece a partir do 2º registro.' }));
      return wrap;
    }
    const W = 340, H = 170, ml = 36, mr = 14, mt = 26, mb = 24;
    const vals = pts.map((p) => p.v);
    const max = Math.max(...vals), min = Math.min(...vals);
    const folga = Math.max((max - min) * 0.2, max * 0.02, 1);
    const lo = Math.max(0, Math.floor(min - folga));
    const hi = Math.ceil(max + folga / 2);
    const t0 = new Date(pts[0].data).getTime();
    const t1 = new Date(pts[pts.length - 1].data).getTime();
    const x = (i) => ml + (t1 > t0 ? (new Date(pts[i].data).getTime() - t0) / (t1 - t0) : i / (pts.length - 1)) * (W - ml - mr);
    const y = (v) => mt + (1 - (v - lo) / (hi - lo || 1)) * (H - mt - mb);
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': rotuloAria });
    [lo, (lo + hi) / 2, hi].forEach((v) => {
      svg.append(el('line', { x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: '#2a2f37', 'stroke-width': 1 }));
      const t = el('text', { x: ml - 6, y: y(v) + 4, 'text-anchor': 'end', fill: '#9aa1ab', 'font-size': 10 });
      t.textContent = fmtNum(v, 1);
      svg.append(t);
    });
    [0, pts.length - 1].forEach((i) => {
      const t = el('text', { x: x(i), y: H - 6, 'text-anchor': i ? 'end' : 'start', fill: '#9aa1ab', 'font-size': 10 });
      t.textContent = diaLocal(pts[i].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      svg.append(t);
    });
    svg.append(el('polyline', {
      points: pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' '),
      fill: 'none', stroke: COR_GRAFICO, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    const guia = el('line', { y1: mt - 6, y2: H - mb, stroke: '#9aa1ab', 'stroke-width': 1, visibility: 'hidden' });
    svg.append(guia);
    const marcas = pts.map((p, i) => { const c = el('circle', { cx: x(i), cy: y(p.v), r: 4, fill: COR_GRAFICO, stroke: '#16191e', 'stroke-width': 2 }); svg.append(c); return c; });
    const ult = el('text', { x: x(pts.length - 1), y: y(pts[pts.length - 1].v) - 10, 'text-anchor': 'end', fill: '#f3f3f1', 'font-size': 11, 'font-weight': 700 });
    ult.textContent = `${fmtNum(pts[pts.length - 1].v)} ${unidade}`;
    svg.append(ult);

    const tip = h('div', { class: 'tip' }); tip.hidden = true;
    const mostrar = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      let i = 0; let melhor = Infinity;
      pts.forEach((_, k) => { const d = Math.abs(x(k) - px); if (d < melhor) { melhor = d; i = k; } });
      guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('visibility', 'visible');
      marcas.forEach((c, k) => c.setAttribute('r', k === i ? 6 : 4));
      tip.hidden = false; tip.innerHTML = '';
      tip.append(h('b', { text: `${fmtNum(pts[i].v)} ${unidade}` }), ` · ${dataCurta(pts[i].data)}`);
      tip.style.left = `${Math.max(15, Math.min(85, (x(i) / W) * 100))}%`;
    };
    svg.addEventListener('pointermove', mostrar);
    svg.addEventListener('pointerdown', mostrar);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; guia.setAttribute('visibility', 'hidden'); marcas.forEach((c) => c.setAttribute('r', 4)); });
    wrap.append(svg, tip);
    return wrap;
  }

  // ---------- Evolução corporal ----------
  const fotosDB = (() => {
    let dbp = null;
    const abrir = () => {
      if (!dbp) {
        dbp = new Promise((ok, erro) => {
          const r = indexedDB.open('projeto-v-fotos', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('fotos');
          r.onsuccess = () => ok(r.result);
          r.onerror = () => erro(r.error);
        });
      }
      return dbp;
    };
    const tx = async (modo, fn) => {
      const db = await abrir();
      return new Promise((ok, erro) => {
        const t = db.transaction('fotos', modo);
        const req = fn(t.objectStore('fotos'));
        t.oncomplete = () => ok(req ? req.result : undefined);
        t.onerror = () => erro(t.error);
      });
    };
    return {
      put: (k, blob) => tx('readwrite', (s) => s.put(blob, k)),
      get: (k) => tx('readonly', (s) => s.get(k)),
      del: (k) => tx('readwrite', (s) => s.delete(k)),
    };
  })();

  async function comprimirFoto(arquivo) {
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
      const r = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob((b) => ok(b || arquivo), 'image/jpeg', 0.82));
    } catch (_) { return arquivo; } finally { URL.revokeObjectURL(url); }
  }

  const avaliacoesOrdenadas = () => estado.avaliacoes.slice().sort((a, b) => diaLocal(a.data) - diaLocal(b.data));
  const temMedida = (a) => MEDIDAS.some(([k]) => a[k] !== '' && a[k] != null) || Object.keys(a.fotos || {}).length > 0 || !!a.obs;

  function renderEvolucao() {
    const p = estado.perfil || (PROGRAMA && PROGRAMA.perfil);
    const per = $('ePerfil');
    per.innerHTML = '';
    if (p) {
      per.append(
        h('div', {}, h('b', { text: dataLonga(p.inicio).slice(0, 5) }), h('span', { text: `referência ${diaLocal(p.inicio).getFullYear()}` })),
        h('div', {}, h('b', { text: p.peso !== '' ? `${fmtNum(p.peso)} kg` : '—' }), h('span', { text: 'peso inicial' })),
        h('div', {}, h('b', { text: p.altura !== '' ? `${fmtNum(p.altura, 0)} cm` : '—' }), h('span', { text: p.idade !== '' ? `altura · ${p.idade} anos` : 'altura' })),
      );
    }

    // Marcos 0/15/30/60/90 + extras
    const box = $('eAvaliacoes');
    box.innerHTML = '';
    const inicio = p ? p.inicio : hoje();
    MARCOS.forEach((m) => {
      const a = estado.avaliacoes.find((x) => x.marco === m);
      const prevista = somaDias(inicio, m);
      box.append(cardAvaliacao(a, `DIA`, String(m), a ? dataLonga(a.data) : `prevista para ${dataLonga(prevista)}`,
        () => abrirAvaliacao(a ? a.id : null, { marco: m, data: prevista })));
    });
    avaliacoesOrdenadas().filter((a) => a.marco == null).forEach((a) => {
      box.append(cardAvaliacao(a, 'EXTRA', '+', dataLonga(a.data), () => abrirAvaliacao(a.id)));
    });

    // Comparação
    const feitas = avaliacoesOrdenadas().filter(temMedida);
    const selA = $('eCompA'); const selB = $('eCompB');
    const valA = selA.value; const valB = selB.value;
    [selA, selB].forEach((s) => { s.innerHTML = ''; feitas.forEach((a) => s.append(h('option', { value: a.id, text: `${a.marco != null ? 'Dia ' + a.marco : 'Extra'} · ${dataLonga(a.data)}` }))); });
    if (feitas.length) { // padrão: primeira × última; mantém a escolha manual se ainda existir
      const vale = (v) => compManual && feitas.some((a) => a.id === v);
      selA.value = vale(valA) ? valA : feitas[0].id;
      selB.value = vale(valB) ? valB : feitas[feitas.length - 1].id;
    }
    renderComparacao();

    // Gráficos (um por medida — pequenos múltiplos)
    const g = $('eGraficos');
    g.innerHTML = '';
    let algum = false;
    MEDIDAS.forEach(([k, nome, un]) => {
      const pts = avaliacoesOrdenadas().filter((a) => a[k] !== '' && a[k] != null).map((a) => ({ data: a.data, v: a[k] }));
      if (pts.length < 2) return;
      algum = true;
      const d = pts[pts.length - 1].v - pts[0].v;
      g.append(h('div', { class: 'graf-card' },
        h('h4', {}, nome, h('span', { text: `${d >= 0 ? '+' : '−'}${fmtNum(Math.abs(d))} ${un} desde ${dataLonga(pts[0].data).slice(0, 5)}` })),
        grafico(pts, un, `${nome} ao longo do tempo`)));
    });
    if (!algum) g.append(h('p', { class: 'nota-peq', text: 'Os gráficos aparecem quando uma medida tiver 2 ou mais registros (ex.: Dia 0 e Dia 15).' }));
  }

  function cardAvaliacao(a, sup, grande, sub, onclick) {
    const ok = a && temMedida(a);
    const resumo = a ? MEDIDAS.filter(([k]) => a[k] !== '' && a[k] != null).map(([k, n, un]) => `${n} ${fmtNum(a[k])}${un === '%' ? '%' : ' ' + un}`).join(' · ') : '';
    const nFotos = a ? Object.keys(a.fotos || {}).length : 0;
    return h('button', { class: 'aval' + (ok ? ' feita' : ''), onclick },
      h('div', { class: 'marco' }, sup, h('b', { text: grande })),
      h('div', {}, sub, h('small', { text: resumo || 'Sem medidas registradas' }), nFotos ? h('small', { text: `📷 ${nFotos} foto(s)` }) : null),
      h('span', { class: 'status', text: ok ? '✓ registrada' : 'pendente' }));
  }

  function renderComparacao() {
    const box = $('eComparacao');
    box.innerHTML = '';
    const A = estado.avaliacoes.find((a) => a.id === $('eCompA').value);
    const B = estado.avaliacoes.find((a) => a.id === $('eCompB').value);
    if (!A || !B) { box.append(h('p', { class: 'nota-peq', text: 'Registre avaliações para comparar.' })); return; }
    const tab = h('table', { class: 'tabela-comp' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Medida' }), h('th', { text: dataLonga(A.data).slice(0, 5) }), h('th', { text: dataLonga(B.data).slice(0, 5) }), h('th', { text: 'Diferença' }))));
    const tb = h('tbody');
    MEDIDAS.forEach(([k, nome, un]) => {
      const a = A[k]; const b = B[k];
      const tem = (v) => v !== '' && v != null;
      const dif = tem(a) && tem(b) ? b - a : null;
      tb.append(h('tr', {}, h('td', { text: `${nome} (${un})` }), h('td', { text: tem(a) ? fmtNum(a) : '—' }), h('td', { text: tem(b) ? fmtNum(b) : '—' }),
        h('td', { text: dif == null ? '—' : `${dif > 0 ? '+' : dif < 0 ? '−' : ''}${fmtNum(Math.abs(dif))}` })));
    });
    tab.append(tb);
    box.append(tab);
  }
  let compManual = false;
  $('eCompA').onchange = () => { compManual = true; renderComparacao(); };
  $('eCompB').onchange = () => { compManual = true; renderComparacao(); };

  // --- diálogo da avaliação ---
  let avalCtx = null; // { id, marco, fotosNovas:{pos:blob}, fotosRemover:Set }
  const urlsFotos = [];
  function limparUrls() { while (urlsFotos.length) URL.revokeObjectURL(urlsFotos.pop()); }

  function mostrarFoto(label, blob) {
    label.querySelectorAll('img').forEach((i) => i.remove());
    if (!blob) return;
    const u = URL.createObjectURL(blob); urlsFotos.push(u);
    label.prepend(h('img', { src: u, alt: '' }));
  }

  function abrirAvaliacao(id, novo = {}) {
    const a = id ? estado.avaliacoes.find((x) => x.id === id) : null;
    avalCtx = { id: a ? a.id : null, marco: a ? a.marco : (novo.marco ?? null), fotosNovas: {}, fotosRemover: new Set() };
    const f = $('formAval');
    $('daTitulo').textContent = avalCtx.marco != null ? `Avaliação — Dia ${avalCtx.marco}` : 'Registro extra';
    f.data.value = a ? a.data : (novo.data || hoje());
    MEDIDAS.forEach(([k]) => { f[k].value = a ? a[k] : ''; });
    f.obs.value = a ? a.obs : '';
    $('daExcluir').hidden = !a;
    limparUrls();
    document.querySelectorAll('#formAval .foto').forEach((lb) => {
      mostrarFoto(lb, null);
      const k = a && a.fotos[lb.dataset.pos];
      if (k) fotosDB.get(k).then((b) => mostrarFoto(lb, b)).catch(() => {});
    });
    $('dlgAval').showModal();
  }

  document.querySelectorAll('#formAval .foto input').forEach((inp) => {
    inp.onchange = async () => {
      const arq = inp.files[0]; inp.value = '';
      if (!arq) return;
      const blob = await comprimirFoto(arq);
      const pos = inp.parentElement.dataset.pos;
      avalCtx.fotosNovas[pos] = blob;
      mostrarFoto(inp.parentElement, blob);
    };
  });

  $('formAval').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    let a = avalCtx.id ? estado.avaliacoes.find((x) => x.id === avalCtx.id) : null;
    if (!a) { a = { id: novoId(), marco: avalCtx.marco, fotos: {} }; estado.avaliacoes.push(a); }
    a.data = f.data.value || hoje();
    MEDIDAS.forEach(([k]) => { a[k] = numOuVazio(f[k].value.replace(',', '.')); });
    a.obs = f.obs.value.trim();
    for (const [pos, blob] of Object.entries(avalCtx.fotosNovas)) {
      const chave = `foto-${a.id}-${pos}`;
      try { await fotosDB.put(chave, blob); a.fotos[pos] = chave; }
      catch (_) { alert('Não foi possível salvar a foto neste navegador.'); }
    }
    salvar(); limparUrls(); $('dlgAval').close(); renderEvolucao();
  });
  $('daCancelar').onclick = () => { limparUrls(); $('dlgAval').close(); };
  $('daExcluir').onclick = () => {
    if (!avalCtx.id || !confirm('Excluir esta avaliação (medidas e fotos)?')) return;
    const a = estado.avaliacoes.find((x) => x.id === avalCtx.id);
    Object.values(a.fotos || {}).forEach((k) => fotosDB.del(k).catch(() => {}));
    estado.avaliacoes = estado.avaliacoes.filter((x) => x.id !== avalCtx.id);
    salvar(); limparUrls(); $('dlgAval').close(); renderEvolucao();
  };
  $('eNovaExtra').onclick = () => abrirAvaliacao(null, { marco: null, data: hoje() });

  // --- dados iniciais ---
  $('eEditarPerfil').onclick = () => {
    const p = estado.perfil || { ...PROGRAMA.perfil };
    const f = $('formPerfil');
    f.inicio.value = p.inicio; f.peso.value = p.peso; f.altura.value = p.altura; f.idade.value = p.idade;
    $('dlgPerfil').showModal();
  };
  $('formPerfil').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    estado.perfil = { inicio: f.inicio.value, peso: numOuVazio(f.peso.value), altura: numOuVazio(f.altura.value), idade: numOuVazio(f.idade.value) };
    salvar(); $('dlgPerfil').close(); renderVista();
  });
  $('dpCancelar').onclick = () => $('dlgPerfil').close();

  // ---------- Aviso de fim do descanso ----------
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
    try { if ('wakeLock' in navigator && modoAberto()) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) { /* não suportado */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && modoAberto()) { manterTelaLigada(); tickModo(); }
  });

  // ---------- Backup (arquivo .json com tudo, inclusive as fotos) ----------
  const blobParaDataURL = (b) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(r.error); r.readAsDataURL(b); });

  async function exportarBackup() {
    const fotosBackup = {};
    for (const a of estado.avaliacoes) {
      for (const k of Object.values(a.fotos || {})) {
        try { const b = await fotosDB.get(k); if (b) fotosBackup[k] = await blobParaDataURL(b); } catch (_) { /* foto indisponível */ }
      }
    }
    const nome = `projeto-v-backup-${hoje()}.json`;
    const conteudo = JSON.stringify({ app: 'projeto-v', exportadoEm: new Date().toISOString(), ...estado, fotosBackup });
    const arquivo = new File([conteudo], nome, { type: 'application/json' });
    // iPhone: abre o menu Compartilhar → "Salvar em Arquivos" / iCloud Drive
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: 'Backup Projeto V' });
        marcarBackup();
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // cancelado pelo usuário
      }
    }
    const a = h('a', { href: URL.createObjectURL(arquivo), download: nome });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    marcarBackup();
  }
  function marcarBackup() { estado.ultimoBackup = new Date().toISOString(); salvar(); renderVista(); }
  $('btnExportar').onclick = () => exportarBackup();

  $('inpImportar').onchange = async (ev) => {
    const arq = ev.target.files[0];
    ev.target.value = '';
    if (!arq) return;
    let dados;
    try {
      dados = JSON.parse(await arq.text());
      if (!dados || !Array.isArray(dados.treinos)) throw new Error('formato');
    } catch (_) { alert('Arquivo de backup inválido.'); return; }
    if (!confirm('Isso vai substituir os dados deste aparelho pelos do backup. Continuar?')) return;
    let fotosOk = 0;
    for (const [k, url] of Object.entries(dados.fotosBackup || {})) {
      try { await fotosDB.put(k, await (await fetch(url)).blob()); fotosOk++; } catch (_) { /* segue */ }
    }
    estado = normalizar(dados);
    if (!estado.limpezas.includes(LIMPEZA_TESTE)) estado.limpezas.push(LIMPEZA_TESTE); // não apagar o que foi importado
    salvar(); fecharModo(); renderVista();
    alert(`Backup importado${fotosOk ? ` (com ${fotosOk} foto(s))` : ''}.`);
  };

  // ---------- Service worker: offline + aviso de nova versão ----------
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    const tinhaControlador = !!navigator.serviceWorker.controller;
    let recarregando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!tinhaControlador || recarregando) return; // primeira instalação não precisa recarregar
      recarregando = true;
      location.reload(); // os dados estão salvos; o treino em andamento continua
    });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const avisar = (w) => {
        $('atualizacao').hidden = false;
        $('atualizarBtn').disabled = false;
        $('atualizarBtn').onclick = () => { $('atualizarBtn').disabled = true; w.postMessage({ tipo: 'ATUALIZAR' }); };
      };
      if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) avisar(w); });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }

  // ---------- Início ----------
  registrarServiceWorker();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // pede para o navegador não apagar os dados

  instalarProjetoV();
  limpezaDoHistoricoDeTeste();
  if (instalado()) document.documentElement.classList.add('instalado');
  renderVista();
})();
