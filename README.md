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
- **Backup**: exportar/importar arquivo `.json` (as fotos ficam só no aparelho).

## Onde ficam os dados

- `localStorage` (chave `meus-treinos-v1`): ficha, cargas, histórico, avaliações.
- `IndexedDB` (`projeto-v-fotos`): fotos de evolução (comprimidas).
- A ficha do Projeto V é instalada uma única vez. A ficha anterior é guardada em `arquivo`
  e o histórico de cargas de exercícios com o mesmo nome continua ligado a eles.

## Arquivos

- `index.html` — telas e diálogos
- `style.css` — visual (preto/grafite + dourado)
- `programa.js` — ficha aprovada, descansos, vídeos e instruções de cada exercício
- `app.js` — lógica do app
- `sw.js`, `manifest.json`, `icon.svg` — funcionamento offline e "Adicionar à tela inicial"
- `testes/e2e.js` — teste automático de ponta a ponta

## Vídeos demonstrativos

Cada variação em `programa.js` tem `demo` com o ID do vídeo do YouTube, título e `status`.
Os vídeos foram encontrados por busca e estão como `nao-verificado`: no app aparece um aviso
até você tocar em **✓ Vídeo correto**. Para trocar um vídeo: ✎ no exercício → cole o link.
O player só carrega o YouTube quando você toca no ▶ (começa pausado).

## Como abrir

- Online: GitHub Pages (Settings → Pages → escolha a branch) e abra o link no celular.
  No iPhone: Compartilhar → **Adicionar à Tela de Início**.
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
