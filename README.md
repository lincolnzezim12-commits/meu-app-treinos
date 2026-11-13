# Meus Treinos

App simples para organizar os treinos da academia: **Treino 1, 2, 3, 4 e 5**.

## O que dá pra fazer
- Dar nome a cada treino (ex.: "Peito e tríceps", "Costas e bíceps", "Pernas"...).
- Adicionar exercícios com séries, repetições, carga (kg), descanso e observações.
- Tocar em ✎ para editar ou excluir; usar ▲▼ para mudar a ordem.
- **Tela de treino** (botão "Começar treino" ou tocar no exercício):
  - mostra o vídeo de como fazer (link do YouTube, GIF ou MP4 colado no exercício)
    ou um botão para buscar o vídeo no YouTube;
  - cronômetro da série e do treino inteiro;
  - "Terminei a série" marca a série e começa o descanso;
  - quando o descanso acaba, toca um bip, vibra, a tela pisca e já passa para a
    próxima série (ou para o próximo exercício);
  - botões para pular o descanso, +15s, desfazer série e trocar de exercício.
- **Concluir treino**: salva no histórico (com o tempo total), zera as séries e já abre o próximo treino da sequência.
- Exportar/importar backup em arquivo `.json`.

Os dados ficam salvos no próprio celular (no navegador). Funciona offline.

## Como usar
Abra o `index.html` num navegador, ou publique a pasta no **GitHub Pages**
(Settings → Pages → Branch) e acesse o link pelo celular. No celular, use
"Adicionar à tela inicial" para usar como aplicativo.

Para testar localmente:
```
python3 -m http.server 8000
# abra http://localhost:8000
```
