# Projeto V 4.0 — Hipertrofia e Definição

App pessoal de academia (HTML/CSS/JavaScript puro, sem build e sem bibliotecas).
Funciona no celular e no computador, offline, e salva tudo no próprio aparelho.

## O que tem

- **Início**: progresso dos 90 dias, treino atual (sequência 1 → 5, sem dias fixos da semana),
  treinos concluídos, séries feitas, dias de descanso, os 5 treinos com **INICIAR TREINO**
  e o histórico recente.
- **Ficha do Projeto V 4.0** (104 séries por ciclo):
  Treino 1 Costas + Bíceps (21) · Treino 2 Peito + Tríceps (20) · Treino 3 Pernas + Abdômen (24) ·
  Treino 4 Ombros + Braços (23) · Treino 5 Especialização Shape em V (16).
- **Tela de treino**: vídeo do exercício, instruções "Como executar corretamente", meta de
  repetições, carga e reps de cada série (− / +), lista "Série 1 — 20 kg — 10 reps — Concluída",
  edição de série já feita, observação do dia, cronômetro de descanso automático
  (pausar, retomar, reiniciar, ±15 s, aviso sonoro/visual) e resumo final
  (duração, séries e volume).
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

## Histórico de teste

Na versão de 14/11/2026 o app apaga uma única vez, ao abrir, o histórico de treinos feito
durante os testes (treinos concluídos, cargas, dias de descanso). Ficha, vídeos e evolução
corporal são mantidos. Uma cópia fica guardada no aparelho e pode ser restaurada em
Início → Dados e backup → **Desfazer** (ou descartada). Também há o botão
**Apagar histórico de treinos** para fazer isso manualmente.

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
