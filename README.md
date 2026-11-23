# Projeto V 4.0 — Hipertrofia e Definição

App pessoal de academia (HTML/CSS/JavaScript puro, sem build e sem bibliotecas).
Funciona no celular e no computador, offline, e salva tudo no próprio aparelho.

## O que tem

- **Progresso semanal** (segunda a domingo, zera toda segunda às 00h): dias treinados em verde
  com T1…T5, dias de descanso, check verde em cada treino feito na semana (também nos cards e
  nas abas), tabela com dia, hora, treino, tempo, séries e volume, e total de horas da semana.
  Semanas anteriores ficam salvas (‹ ›).
- **Início**: progresso dos 90 dias, treino atual (sequência 1 → 5, sem dias fixos da semana),
  treinos concluídos, séries feitas, dias de descanso, os 5 treinos com **INICIAR TREINO**
  e o histórico recente.
- **Ficha do Projeto V 4.0** (104 séries por ciclo):
  Treino 1 Costas + Bíceps (21) · Treino 2 Peito + Tríceps (20) · Treino 3 Pernas + Abdômen (24) ·
  Treino 4 Ombros + Braços (23) · Treino 5 Especialização Shape em V (16).
- **Tela de treino** (layout limpo): vídeo no topo, nome do exercício, "Série 1 de 3", meta e
  última carga, repetições e peso (− / +), bolinhas das séries (toque para corrigir), botão
  **Concluir série / Concluir exercício** e **Adiar exercício · Pular série · Pular exercício**.
  No topo: tempo de treino, **Pausar** treino, barra de progresso e lista de exercícios
  ("Exercício 1 de 6 ▾"). O descanso abre em tela própria com anel de contagem, próximo
  exercício, ±15 s, **Pular descanso**, pausar e reiniciar. Resumo final com duração, séries e
  volume.
- **Extras do treino** (na tela de fim): cardio (minutos), abdominal (séries × repetições),
  prancha (séries × segundos) ou outro, com observação. Aparecem no card, no resumo, no
  histórico e no progresso semanal; o app lembra os últimos valores de cada extra.
- **Fim do treino**: card premium do treino (V dourado, duração, séries, volume, exercícios e
  semana) em imagem 1080×1350 para **Compartilhar / salvar imagem** (no iPhone: Salvar Imagem,
  Instagram…). Se algum exercício/série foi pulado, ao finalizar o app pergunta se quer fazer agora.
- **Variações**: "Agachamento ou hack" e "Barra fixa ou puxada alta" (também crucifixo inverso
  halteres/máquina e tríceps unilateral polia/halter), cada uma com seu vídeo e histórico.
- **Carga clara**: total, por halter, por lado ou carga adicional (peso corporal).
- **Histórico por exercício (📊)**: último treino, melhor carga, repetições, 1RM estimado,
  volume (séries × reps × carga), gráfico de evolução e sugestão de progressão quando bater o
  topo da faixa em todas as séries. A carga nunca sobe sozinha.
- **Evolução de 90 dias**: dados iniciais, avaliações dos dias 0, 15, 30, 60 e 90 e registros
  extras (peso, cintura, peitoral, braço, coxa, % gordura, fotos de frente/costas/perfil e
  observações), comparação entre avaliações e gráficos.
- **Backup**: exportar/importar arquivo `.json` com tudo, inclusive fotos.

## Onde ficam os dados (e segurança)

- Tudo fica **somente no aparelho**: `localStorage` (chave `meus-treinos-v1`) para ficha, cargas,
  histórico e avaliações; `IndexedDB` (`projeto-v-fotos`) para as fotos de evolução.
- Não existe servidor nem banco de dados: o site publicado entrega só o app (HTML/JS/CSS).
  Quem abrir o link vê um app vazio — os seus registros não saem do seu iPhone.
  Por isso não há login: uma tela de senha num site estático seria só visual.
  A proteção dos registros é a do próprio iPhone (código/Face ID).
- Atenção: o código é público (repositório/GitHub Pages), incluindo a ficha e os dados
  iniciais de `programa.js` (idade, altura e peso inicial).
- Se o armazenamento do Safari/app for apagado, os dados se perdem. Use **Exportar backup**
  (gera um `.json` com tudo, inclusive fotos; no iPhone abre o menu Compartilhar →
  "Salvar em Arquivos"/iCloud Drive). O app lembra de fazer backup a cada 7 dias.
- No iPhone, o app instalado na Tela de Início tem armazenamento **separado** do Safari.
  Para levar dados de um para o outro: Exportar backup num, Importar backup no outro.

## Início do projeto e limpezas

O Projeto V começa em **19/11/2026** (Dia 0). Ao abrir esta versão, o app faz uma única vez:
apaga os treinos feitos antes (treinos concluídos, cargas, dias de descanso e treino em andamento),
muda a data de início para 19/11/2026 e move a avaliação do Dia 0 para essa data. Ficha, vídeos e
demais avaliações são mantidos. Uma cópia fica no aparelho: Início → Dados e backup →
**Desfazer** (ou **Descartar cópia**). O botão **Apagar histórico de treinos** faz a limpeza manualmente.

## Semana e sequência dos treinos

A semana vai de segunda a domingo. Toda **segunda-feira às 00h** o progresso semanal zera e o
**treino atual volta para o Treino 1**. Durante a semana, o próximo é o primeiro treino ainda não
feito depois do último feito (T1 → T2 → T3 → T4 → T5). Treino aberto e não finalizado da semana
anterior é descartado na virada; o histórico das semanas anteriores continua salvo (‹ ›).

## Ordem dos exercícios

**INICIAR TREINO** sempre começa no exercício 1 e segue a ordem da ficha. Tocar num exercício da
ficha abre "Como fazer" (não inicia o treino no meio). Se um treino ficou sem finalizar, o app
pergunta se quer continuar de onde parou ou começar do exercício 1; começar outro treino descarta
o que não foi finalizado.

## PWA / iPhone

- `manifest.json`: nome "Projeto V", `display: standalone`, ícones 192, 512 e 512 maskable.
- `icons/apple-touch-icon.png` (180×180) para a Tela de Início do iPhone; `icons/icone.svg` é a arte original.
- Barra de status translúcida, áreas seguras (Dynamic Island, barra inferior), campos com 16 px (sem zoom).
- `sw.js`: guarda o app no aparelho para abrir **sem internet**; os vídeos do YouTube precisam de conexão.
  Quando há versão nova, aparece o aviso **Atualizar**. Ao publicar mudanças, aumente `VERSAO` em `sw.js`.

## Instalar no iPhone

1. Abra o endereço HTTPS do app no **Safari** (GitHub Pages).
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Deixe **Abrir como App** ativado, se aparecer.
5. Toque em **Adicionar** — o ícone dourado do Projeto V aparece na Tela de Início.

## Arquivos

- `index.html` — telas e diálogos
- `style.css` — visual (preto/grafite + dourado)
- `programa.js` — ficha aprovada, descansos, vídeos e instruções de cada exercício
- `app.js` — lógica do app
- `sw.js`, `manifest.json`, `icons/` — PWA: offline, atualização e ícones
- `testes/e2e.js` — teste automático de ponta a ponta

## Vídeos demonstrativos

Cada variação em `programa.js` tem `demo` com o ID do vídeo do YouTube, título e `status`.
Os vídeos foram encontrados por busca e estão como `nao-verificado`: no app aparece um aviso
até você tocar em **✓ Vídeo correto**. Para trocar um vídeo: ✎ no exercício → cole o link.
O player só carrega o YouTube quando você toca no ▶ (começa pausado).

## Como abrir / publicar

- Online: GitHub Pages (Settings → Pages → escolha a branch). O GitHub Pages já usa HTTPS,
  que é obrigatório para o modo offline.
- No computador:
  ```
  python3 -m http.server 8000
  # abra http://localhost:8000
  ```

## Testes

Não há etapa de build. Teste automático (precisa do Playwright instalado):
```
python3 -m http.server 8765 &
node testes/e2e.js
```
