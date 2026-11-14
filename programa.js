// PROJETO V 4.0 — Hipertrofia e Definição
// Ficha aprovada (exercícios, séries e repetições NÃO devem ser alterados aqui)
// e catálogo de demonstrações / instruções de execução de cada exercício.
//
// Cada exercício do catálogo pode ter variações (ex.: "Agachamento ou hack").
// Cada variação tem uma demonstração:
//   demo.tipo:   'youtube' | 'video' (arquivo local/URL mp4) | 'animacao' | 'indisponivel'
//   demo.id:     ID do vídeo no YouTube (só para tipo 'youtube')
//   demo.titulo / demo.autor: título e canal do vídeo (fonte)
//   demo.status: 'verificado' (existe e permite incorporação, conferido pelo oEmbed oficial)
//                'nao-verificado' (link encontrado em busca, não foi possível conferir)
//                'pendente' (falta escolher um vídeo)
// O usuário pode trocar o vídeo de qualquer exercício pelo app (✎ → link do vídeo).

(function () {
  'use strict';

  // Descansos iniciais (podem ser alterados por exercício no app)
  const PESADO = { descanso: 150, descansoFaixa: '120–180 s' };   // agachamento, leg press, terra, supinos, remadas, puxadas, desenvolvimento
  const ISOLADO = { descanso: 90, descansoFaixa: '60–120 s' };    // isolados de bíceps, tríceps, ombros (e demais isolados)
  const ABDOMEN = { descanso: 75, descansoFaixa: '60–90 s' };     // abdominais

  const yt = (id, titulo, autor, status = 'nao-verificado') => ({ tipo: 'youtube', id, titulo, autor, status });

  // Instruções: [posição inicial, movimento, retorno/descida, erros comuns, postura e amplitude]
  const CATALOGO = {
    'puxada-alta-pronada': {
      nome: 'Puxada alta pronada', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Puxada alta pronada',
        demo: yt('G7ZAG9GMIik', 'PUXADA ALTA PEGADA PRONADA: como fazer corretamente - EXECUÇÃO', ''),
        instrucoes: [
          'Sente-se com as coxas presas sob o apoio e segure a barra com as palmas para a frente, um pouco mais aberto que a largura dos ombros. Braços estendidos.',
          'Leve o peito levemente para cima e puxe a barra em direção à parte alta do peito, levando os cotovelos para baixo e para os lados.',
          'Volte devagar até estender os braços, deixando as escápulas subirem de forma controlada.',
          'Jogar o tronco muito para trás, puxar a barra atrás da nuca, usar impulso e encolher os ombros.',
          'Tronco estável com leve inclinação para trás, coluna neutra e amplitude completa sem perder o controle.',
        ],
      }],
    },
    'remada-articulada': {
      nome: 'Remada articulada', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Remada articulada (máquina)',
        demo: yt('NHoOrhLr9mc', 'Como fazer Remada Articulada Apoiada com Pegada Pronada Máquina', ''),
        instrucoes: [
          'Ajuste o banco para que as pegadas fiquem na altura do meio do tronco e apoie o peito no suporte. Pés firmes, braços estendidos.',
          'Puxe as pegadas em direção ao corpo levando os cotovelos para trás e aproximando as escápulas no final.',
          'Retorne devagar até estender os braços, sentindo as costas alongarem.',
          'Tirar o peito do apoio, usar o balanço do tronco, encolher os ombros e encurtar o movimento.',
          'Peito sempre apoiado, pescoço neutro e amplitude completa na ida e na volta.',
        ],
      }],
    },
    'puxada-neutra': {
      nome: 'Puxada neutra', ...PESADO, descanso: 120, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Puxada neutra (triângulo)',
        demo: yt('76zk3CD2JJQ', 'PUXADA ALTA PEGADA NEUTRA: como fazer corretamente - EXECUÇÃO', ''),
        instrucoes: [
          'Sente-se com as coxas presas sob o apoio e segure o triângulo (pegada neutra, palmas uma de frente para a outra). Braços estendidos.',
          'Com o peito levemente para cima, puxe o triângulo em direção à parte alta do peito, levando os cotovelos para baixo, junto ao corpo.',
          'Suba de forma controlada até estender os braços.',
          'Jogar o tronco para trás a cada repetição, puxar só com os braços e encolher os ombros.',
          'Tronco estável, coluna neutra e cotovelos apontando para baixo durante a puxada.',
        ],
      }],
    },
    'pulldown-braco-estendido': {
      nome: 'Pulldown braço estendido', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Pulldown com braços estendidos (polia alta)',
        demo: yt('3uIW1Wmc2_I', 'Pulldown com braços estendidos', ''),
        instrucoes: [
          'Em pé, de frente para a polia alta, segure a barra ou a corda com os braços estendidos e os cotovelos levemente flexionados. Incline o tronco um pouco à frente.',
          'Leve a barra em direção às coxas fazendo um arco com os braços, sem dobrar mais os cotovelos.',
          'Volte devagar até os braços ficarem na altura da cabeça, sentindo as costas alongarem.',
          'Transformar em tríceps (dobrar e esticar os cotovelos), balançar o tronco e encolher os ombros.',
          'Cotovelos com a mesma leve flexão do início ao fim e tronco parado.',
        ],
      }],
    },
    'rosca-direta-w': {
      nome: 'Rosca direta barra W', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Rosca direta com barra W',
        demo: yt('017j7Gbxipo', 'Rosca Direta com Barra W - Exercício para Bíceps', ''),
        instrucoes: [
          'Em pé, segure a barra W com as palmas para cima, mãos na largura dos ombros e braços estendidos ao lado do corpo.',
          'Flexione os cotovelos levando a barra em direção aos ombros, mantendo os cotovelos junto ao tronco.',
          'Desça devagar até quase estender os braços.',
          'Balançar o corpo, jogar a lombar para trás e levar os cotovelos para a frente ou abri-los.',
          'Abdômen contraído, coluna neutra e só os antebraços se movendo.',
        ],
      }],
    },
    'rosca-inclinada': {
      nome: 'Rosca inclinada', ...ISOLADO, tipoCarga: 'halter',
      variacoes: [{
        id: 'padrao', nome: 'Rosca no banco inclinado com halteres',
        demo: yt('T7g4u2w2w_k', 'Rosca Direta Banco 45° Halter', ''),
        instrucoes: [
          'Sente-se em um banco inclinado com as costas apoiadas, um halter em cada mão, braços estendidos para baixo e palmas para a frente.',
          'Flexione os cotovelos levando os halteres em direção aos ombros, sem tirar as costas do banco.',
          'Desça devagar até estender os braços por completo.',
          'Levar os cotovelos para a frente, tirar as costas e a cabeça do banco e descer sem controle.',
          'Ombros e costas apoiados; os braços ficam pendurados atrás da linha do tronco no início.',
        ],
      }],
    },

    'supino-inclinado-halteres': {
      nome: 'Supino inclinado com halteres', ...PESADO, tipoCarga: 'halter',
      variacoes: [{
        id: 'padrao', nome: 'Supino inclinado com halteres',
        demo: yt('G-i3jMIbDmo', 'Supino inclinado com halteres: Execução correta e músculos solicitados', ''),
        instrucoes: [
          'Deite no banco inclinado com os halteres na linha do peito, pés firmes no chão e escápulas encaixadas para trás e para baixo.',
          'Empurre os halteres para cima até quase estender os cotovelos.',
          'Desça de forma controlada até sentir o peito alongar, com os antebraços na vertical.',
          'Tirar os ombros do banco, abrir demais os cotovelos, bater os halteres no alto e perder o controle na descida.',
          'Escápulas presas no banco, lombar estável e amplitude confortável para o ombro.',
        ],
      }],
    },
    'supino-reto': {
      nome: 'Supino reto', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Supino reto com barra',
        demo: yt('ZN7SuDQpNMk', 'Supino reto com barra - Execução Correta', ''),
        instrucoes: [
          'Deite no banco com os olhos abaixo da barra, pés firmes no chão, escápulas encaixadas e pegada um pouco mais aberta que os ombros.',
          'Retire a barra e empurre para cima até quase estender os cotovelos.',
          'Desça a barra de forma controlada até a linha do meio do peito.',
          'Quicar a barra no peito, tirar o quadril do banco, abrir os cotovelos a 90° do tronco e elevar os ombros.',
          'Escápulas presas, punhos alinhados com os antebraços e, com cargas altas, use um auxiliar.',
        ],
      }],
    },
    'crossover': {
      nome: 'Crossover', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Crossover na polia alta',
        demo: yt('Ixx_nBb1yqo', 'Como fazer o crossover na polia alta', ''),
        instrucoes: [
          'Fique no centro do crossover segurando as pegadas das polias altas, um pé à frente e o tronco levemente inclinado. Cotovelos levemente flexionados.',
          'Traga as mãos para a frente e para baixo, em arco, até se encontrarem na frente do corpo.',
          'Volte devagar abrindo os braços até sentir o peito alongar.',
          'Dobrar e esticar os cotovelos (vira um supino), usar o peso do corpo e deixar os ombros irem para a frente.',
          'Cotovelos fixos na mesma flexão, peito aberto e tronco estável.',
        ],
      }],
    },
    'crucifixo-maquina': {
      nome: 'Crucifixo máquina', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Crucifixo máquina (voador / peck deck)',
        demo: yt('zEcIgGm7fxU', 'Como executar Crucifixo Máquina / Voador / Peck-Deck', ''),
        instrucoes: [
          'Ajuste o banco para que as pegadas fiquem na altura do peito. Costas apoiadas e cotovelos levemente flexionados.',
          'Feche os braços à frente do corpo até as mãos se aproximarem.',
          'Abra devagar até sentir o peito alongar, sem passar da linha confortável do ombro.',
          'Tirar as costas do encosto, usar impulso e deixar o peso bater ao voltar.',
          'Costas e cabeça apoiadas, ombros para baixo e movimento controlado.',
        ],
      }],
    },
    'triceps-frances': {
      nome: 'Tríceps francês', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Tríceps francês com halter (sentado)',
        demo: yt('9EkGm94Q2Ms', 'COMO FAZER TRÍCEPS FRANCÊS SENTADO COM HALTER', ''),
        instrucoes: [
          'Sentado com as costas apoiadas, segure um halter com as duas mãos acima da cabeça, braços estendidos.',
          'Desça o halter atrás da cabeça dobrando só os cotovelos.',
          'Estenda os cotovelos levando o halter de volta ao alto, sem travar com força.',
          'Abrir muito os cotovelos, arquear a lombar e mover os ombros junto.',
          'Cotovelos apontando para cima e próximos da cabeça, abdômen contraído.',
        ],
      }],
    },
    'triceps-corda': {
      nome: 'Tríceps corda', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Tríceps na polia alta com corda',
        demo: yt('7le1JRUUagM', 'Tríceps na polia alta com corda: Execução e postura correta', ''),
        instrucoes: [
          'De frente para a polia alta, segure a corda com as palmas viradas uma para a outra e os cotovelos junto ao corpo, dobrados.',
          'Estenda os cotovelos levando a corda para baixo e afastando as pontas no final.',
          'Volte devagar até os antebraços passarem um pouco da linha horizontal.',
          'Deixar os cotovelos irem para a frente, usar o peso do corpo e balançar o tronco.',
          'Cotovelos fixos ao lado do tronco, tronco levemente inclinado e parado.',
        ],
      }],
    },

    'agachamento-ou-hack': {
      nome: 'Agachamento ou hack', ...PESADO, tipoCarga: 'total',
      variacoes: [
        {
          id: 'agachamento', nome: 'Agachamento livre com barra',
          demo: yt('rM6SDUdl9fs', 'Agachamento livre com barra - Como fazer corretamente', ''),
          instrucoes: [
            'Barra apoiada no trapézio (não no pescoço), pés na largura dos ombros com as pontas levemente para fora, tronco firme.',
            'Desça levando o quadril para trás e para baixo, dobrando joelhos e quadril ao mesmo tempo.',
            'Suba empurrando o chão com o pé inteiro, mantendo o tronco firme.',
            'Joelhos caindo para dentro, calcanhares saindo do chão, arredondar a coluna e olhar para cima ou para baixo demais.',
            'Coluna neutra, joelhos na direção das pontas dos pés e profundidade que você consiga controlar. Use o rack com as travas de segurança.',
          ],
        },
        {
          id: 'hack', nome: 'Agachamento no hack (máquina)',
          demo: yt('Whp712OHPl8', 'Hack Machine - Execução Correta e Cuidados', ''),
          instrucoes: [
            'Costas e ombros apoiados no encosto, pés na plataforma na largura dos ombros. Destrave a máquina.',
            'Desça dobrando os joelhos até as coxas ficarem próximas do paralelo à plataforma.',
            'Empurre a plataforma com o pé inteiro até quase estender os joelhos, sem travar.',
            'Tirar a lombar ou o quadril do encosto, joelhos caindo para dentro e calcanhares saindo da plataforma.',
            'Lombar e glúteos colados no encosto, joelhos alinhados com os pés e descida controlada.',
          ],
        },
      ],
    },
    'leg-press': {
      nome: 'Leg press', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Leg press 45°',
        demo: yt('waAxlYvtCcI', 'Exercício Leg Press 45° - Execução Correta', ''),
        instrucoes: [
          'Costas e cabeça apoiadas, pés na plataforma na largura dos ombros com as pontas levemente para fora. Destrave a máquina.',
          'Desça a plataforma dobrando os joelhos de forma controlada.',
          'Empurre a plataforma com o pé inteiro até quase estender os joelhos.',
          'Travar os joelhos no alto, descer tanto que o quadril sai do banco e joelhos caindo para dentro.',
          'Lombar e quadril sempre apoiados; a amplitude vai até onde o quadril não descola.',
        ],
      }],
    },
    'terra-romeno': {
      nome: 'Terra romeno', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Levantamento terra romeno',
        demo: yt('DPF-eEi0qe0', 'Levantamento Terra Romeno', ''),
        instrucoes: [
          'Em pé, segure a barra na frente das coxas, pés na largura do quadril e joelhos levemente flexionados.',
          'Leve o quadril para trás, descendo a barra rente às pernas, mantendo a mesma leve flexão dos joelhos.',
          'Volte empurrando o quadril para a frente até ficar em pé, contraindo os glúteos.',
          'Arredondar as costas, afastar a barra das pernas, dobrar demais os joelhos (vira agachamento) e hiperestender a lombar no topo.',
          'Coluna neutra o tempo todo; desça só até onde consegue manter a coluna reta, sentindo alongar a parte de trás das coxas.',
        ],
      }],
    },
    'cadeira-extensora': {
      nome: 'Cadeira extensora', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Cadeira extensora',
        demo: yt('WKqCZh9hdCc', 'CADEIRA EXTENSORA - como executar corretamente', ''),
        instrucoes: [
          'Ajuste o encosto para que o joelho fique alinhado com o eixo da máquina e o rolo fique sobre a parte baixa da canela, perto do tornozelo.',
          'Estenda os joelhos até as pernas ficarem quase retas.',
          'Desça devagar, sem deixar o peso bater.',
          'Usar impulso, tirar o quadril do banco e apoiar o rolo no meio da canela.',
          'Segure as alças laterais, mantenha o quadril no banco e controle a descida.',
        ],
      }],
    },
    'mesa-flexora': {
      nome: 'Mesa flexora', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Mesa flexora',
        demo: yt('bWOSPZfMAZg', 'Como executar corretamente o exercício Mesa Flexora - Clube.Fitness', ''),
        instrucoes: [
          'Deite de barriga para baixo, joelhos logo após a borda do banco (alinhados ao eixo da máquina) e o rolo acima dos calcanhares.',
          'Flexione os joelhos puxando o rolo em direção aos glúteos.',
          'Desça devagar até quase estender os joelhos.',
          'Tirar o quadril do banco, usar impulso e deixar o peso cair na volta.',
          'Quadril pressionado no banco, segure as pegadas e controle as duas fases.',
        ],
      }],
    },
    'panturrilha-em-pe': {
      nome: 'Panturrilha em pé', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Panturrilha em pé (máquina)',
        demo: yt('4_bpk2pfB8A', 'Fast Fit - Panturrilha em pé na máquina', ''),
        instrucoes: [
          'Ombros sob o apoio, ponta dos pés na plataforma e calcanhares para fora, joelhos estendidos sem travar.',
          'Suba na ponta dos pés o máximo que conseguir.',
          'Desça devagar até alongar bem a panturrilha (calcanhares abaixo da plataforma).',
          'Movimento curto e rápido, quicar embaixo e dobrar os joelhos para ajudar.',
          'Tronco reto, abdômen contraído e amplitude completa, com uma pausa breve em cima.',
        ],
      }],
    },
    'abdominal-polia': {
      nome: 'Abdominal na polia', ...ABDOMEN, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Abdominal na polia alta (ajoelhado, com corda)',
        demo: yt('eB-LUPltCfM', 'Como fazer o abdominal na polia corretamente', ''),
        instrucoes: [
          'Ajoelhado de frente para a polia alta, segure a corda ao lado da cabeça.',
          'Enrole o tronco para baixo, aproximando as costelas do quadril, contraindo o abdômen.',
          'Volte devagar até o tronco ficar reto de novo.',
          'Sentar nos calcanhares (puxar com o quadril), puxar com os braços e mover a corda para longe da cabeça.',
          'Quadril parado; o movimento é de flexão da coluna, não do quadril.',
        ],
      }],
    },

    'desenvolvimento-halteres': {
      nome: 'Desenvolvimento com halteres', ...PESADO, tipoCarga: 'halter',
      variacoes: [{
        id: 'padrao', nome: 'Desenvolvimento com halteres (sentado)',
        demo: yt('0uB7PH3oFVo', 'DESENVOLVIMENTO COM HALTERES SENTADO - APRENDA O PASSO A PASSO DE COMO FAZER', ''),
        instrucoes: [
          'Sentado com as costas apoiadas, halteres na altura dos ombros, palmas para a frente e cotovelos um pouco à frente do corpo.',
          'Empurre os halteres para cima até quase estender os cotovelos.',
          'Desça devagar até a altura das orelhas/ombros.',
          'Arquear muito a lombar, bater os halteres em cima e descer rápido demais.',
          'Abdômen contraído, costas no encosto e antebraços na vertical.',
        ],
      }],
    },
    'elevacao-lateral': {
      nome: 'Elevação lateral', ...ISOLADO, tipoCarga: 'halter',
      variacoes: [{
        id: 'padrao', nome: 'Elevação lateral com halteres',
        demo: yt('gURBTU9VSJg', 'Como fazer a elevação lateral com halteres', ''),
        instrucoes: [
          'Em pé, halteres ao lado do corpo, cotovelos levemente flexionados e tronco firme.',
          'Eleve os braços para os lados até a altura dos ombros.',
          'Desça devagar até perto do corpo, sem relaxar totalmente.',
          'Balançar o tronco, encolher os ombros e subir as mãos acima da linha dos ombros.',
          'Cotovelos guiando o movimento, carga que permita subir sem impulso.',
        ],
      }],
    },
    'crucifixo-inverso': {
      nome: 'Crucifixo inverso', ...ISOLADO, tipoCarga: 'halter',
      variacoes: [
        {
          id: 'halteres', nome: 'Crucifixo inverso com halteres', tipoCarga: 'halter',
          demo: yt('jS4Z8nzh9v0', 'Crucifixo inverso halter', ''),
          instrucoes: [
            'Em pé, tronco inclinado à frente com a coluna reta, joelhos levemente flexionados e halteres abaixo do peito.',
            'Abra os braços para os lados e para trás, com os cotovelos levemente flexionados, até a altura dos ombros.',
            'Desça devagar até a posição inicial.',
            'Levantar o tronco durante a subida, usar impulso e encolher os ombros.',
            'Coluna neutra e carga leve: o foco é a parte de trás do ombro.',
          ],
        },
        {
          id: 'maquina', nome: 'Crucifixo inverso na máquina', tipoCarga: 'total',
          demo: yt('KO3pa-Ov8P4', 'crucifixo inverso - crucifixo invertido na máquina', ''),
          instrucoes: [
            'Sente de frente para o encosto do voador, peito apoiado, pegadas na altura dos ombros.',
            'Abra os braços para trás com os cotovelos levemente flexionados.',
            'Volte devagar até os braços ficarem à frente do corpo.',
            'Tirar o peito do apoio, encolher os ombros e usar impulso.',
            'Peito apoiado, ombros para baixo e movimento controlado.',
          ],
        },
      ],
    },
    'rosca-scott': {
      nome: 'Rosca Scott', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Rosca Scott com barra W',
        demo: yt('9WXNkESgmzY', 'COMO FAZER ROSCA SCOTT COM BARRA W CORRETAMENTE', ''),
        instrucoes: [
          'Ajuste o banco Scott para que a axila fique encaixada no apoio e a parte de trás dos braços fique toda apoiada. Segure a barra com as palmas para cima.',
          'Flexione os cotovelos levando a barra em direção aos ombros.',
          'Desça devagar até quase estender os braços, sem soltar o peso no final.',
          'Tirar os cotovelos do apoio, levantar o quadril do banco e descer de uma vez com o braço travado.',
          'Braços apoiados o tempo todo; a descida controlada é a parte mais importante.',
        ],
      }],
    },
    'rosca-martelo': {
      nome: 'Rosca martelo', ...ISOLADO, tipoCarga: 'halter',
      variacoes: [{
        id: 'padrao', nome: 'Rosca martelo com halteres',
        demo: yt('ZiasEcCg0wg', 'Fast Fit - Rosca martelo com halteres', ''),
        instrucoes: [
          'Em pé, um halter em cada mão ao lado do corpo, palmas viradas para o corpo (pegada neutra).',
          'Flexione os cotovelos levando os halteres em direção aos ombros, mantendo a pegada neutra.',
          'Desça devagar até estender os braços.',
          'Balançar o tronco, levar os cotovelos para a frente e girar os punhos.',
          'Cotovelos junto ao corpo e tronco parado.',
        ],
      }],
    },
    'triceps-testa': {
      nome: 'Tríceps testa', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Tríceps testa com barra W',
        demo: yt('VKHSZBypfpc', 'Tríceps Testa com Barra W', ''),
        instrucoes: [
          'Deitado no banco, segure a barra W com os braços estendidos acima do peito.',
          'Dobre só os cotovelos, descendo a barra em direção à testa (ou um pouco atrás da cabeça).',
          'Estenda os cotovelos levando a barra de volta ao alto.',
          'Abrir os cotovelos, mover os ombros junto e descer sem controle perto da cabeça.',
          'Cotovelos apontando para cima e estáveis; se sentir dor no cotovelo, reduza a carga.',
        ],
      }],
    },
    'triceps-unilateral': {
      nome: 'Tríceps unilateral', ...ISOLADO, tipoCarga: 'total',
      variacoes: [
        {
          id: 'polia', nome: 'Tríceps unilateral na polia', tipoCarga: 'total',
          demo: yt('t1YbC9qaCL4', 'Tríceps unilateral na polia', ''),
          instrucoes: [
            'De frente para a polia alta, segure a pegada com uma mão, cotovelo junto ao corpo e dobrado.',
            'Estenda o cotovelo até o braço ficar reto.',
            'Volte devagar até o antebraço passar um pouco da horizontal.',
            'Cotovelo saindo do lado do corpo, girar o tronco e usar impulso.',
            'Tronco parado; faça todas as repetições de um lado e depois do outro.',
          ],
        },
        {
          id: 'halter', nome: 'Tríceps francês unilateral com halter', tipoCarga: 'halter',
          demo: yt('MhKsLQ1G4EY', 'Tríceps Francês com Halter Unilateral', ''),
          instrucoes: [
            'Sentado ou em pé, segure um halter com uma mão acima da cabeça, braço estendido.',
            'Desça o halter atrás da cabeça dobrando só o cotovelo.',
            'Estenda o cotovelo levando o halter de volta ao alto.',
            'Abrir o cotovelo para o lado e arquear a lombar.',
            'Cotovelo apontando para cima; use a outra mão para estabilizar o braço se precisar.',
          ],
        },
      ],
    },

    'barra-fixa-ou-puxada': {
      nome: 'Barra fixa ou puxada alta', ...PESADO, tipoCarga: 'total',
      variacoes: [
        {
          id: 'barra', nome: 'Barra fixa (pegada pronada)', tipoCarga: 'corporal',
          demo: yt('_wH1BwSL_qg', 'COMO FAZER BARRA FIXA PEGADA PRONADA CORRETAMENTE', ''),
          instrucoes: [
            'Pendure-se na barra com as palmas para a frente, mãos um pouco mais abertas que os ombros, braços estendidos.',
            'Puxe o corpo para cima levando os cotovelos para baixo até o queixo passar a barra.',
            'Desça devagar até estender os braços.',
            'Balançar o corpo (kipping), fazer meia repetição e soltar o corpo na descida.',
            'Abdômen contraído e pernas paradas. Registre a carga adicional (0 se for só o peso do corpo).',
          ],
        },
        {
          id: 'puxada', nome: 'Puxada alta (pronada)', tipoCarga: 'total',
          demo: yt('G7ZAG9GMIik', 'PUXADA ALTA PEGADA PRONADA: como fazer corretamente - EXECUÇÃO', ''),
          instrucoes: [
            'Sente-se com as coxas presas sob o apoio e segure a barra com as palmas para a frente, um pouco mais aberto que os ombros.',
            'Puxe a barra em direção à parte alta do peito, levando os cotovelos para baixo e para os lados.',
            'Volte devagar até estender os braços.',
            'Jogar o tronco para trás, puxar atrás da nuca e encolher os ombros.',
            'Tronco estável, coluna neutra e amplitude completa.',
          ],
        },
      ],
    },
    'remada-baixa': {
      nome: 'Remada baixa', ...PESADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Remada baixa (polia, triângulo)',
        demo: yt('HZPqEGzrLRg', 'REMADA baixa com TRIÂNGULO na POLIA - Execução CORRETA e Análise CINESIOLÓGICA do Exercício', ''),
        instrucoes: [
          'Sentado de frente para a polia baixa, pés apoiados, joelhos levemente flexionados, segure o triângulo com os braços estendidos e tronco ereto.',
          'Puxe o triângulo em direção ao abdômen, levando os cotovelos para trás junto ao corpo e aproximando as escápulas.',
          'Volte devagar até estender os braços, sem arredondar as costas.',
          'Balançar o tronco para a frente e para trás, arredondar a coluna e encolher os ombros.',
          'Tronco quase parado e coluna neutra; o movimento vem dos braços e das escápulas.',
        ],
      }],
    },
    'supino-inclinado-maquina': {
      nome: 'Supino inclinado máquina', ...PESADO, descanso: 120, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Supino inclinado na máquina (articulado)',
        demo: yt('Q9wHSxunDlU', 'Como executar corretamente o exercício Supino Inclinado Articulado - Clube.Fitness', ''),
        instrucoes: [
          'Ajuste o banco para que as pegadas fiquem na altura da parte alta do peito. Costas apoiadas e pés firmes.',
          'Empurre as pegadas até quase estender os cotovelos.',
          'Volte devagar até sentir o peito alongar.',
          'Tirar as costas do encosto, elevar os ombros e travar os cotovelos com força.',
          'Escápulas encaixadas no banco e movimento controlado nas duas fases.',
        ],
      }],
    },
    'elevacao-lateral-polia': {
      nome: 'Elevação lateral na polia', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Elevação lateral na polia (unilateral)',
        demo: yt('CCekl3JkW3w', 'Elevação lateral na polia', ''),
        instrucoes: [
          'De lado para a polia baixa, segure a pegada com a mão mais afastada da máquina, cabo passando na frente do corpo.',
          'Eleve o braço para o lado até a altura do ombro, com o cotovelo levemente flexionado.',
          'Desça devagar, mantendo a tensão do cabo.',
          'Inclinar o tronco para longe da polia para ajudar, encolher o ombro e subir acima da linha do ombro.',
          'Tronco estável; faça todas as repetições de um lado e depois do outro.',
        ],
      }],
    },
    'face-pull': {
      nome: 'Face pull', ...ISOLADO, tipoCarga: 'total',
      variacoes: [{
        id: 'padrao', nome: 'Face pull (polia com corda)',
        demo: yt('YxQivR_kljk', 'Face Pull Corda na Polia', ''),
        instrucoes: [
          'Polia na altura do rosto ou um pouco acima. Segure a corda com os polegares apontando para você e braços estendidos.',
          'Puxe a corda em direção ao rosto, afastando as pontas e mantendo os cotovelos altos, na linha dos ombros.',
          'Volte devagar até estender os braços.',
          'Jogar o tronco para trás, puxar com os cotovelos baixos (vira remada) e usar carga alta.',
          'Tronco parado, ombros para baixo e escápulas se aproximando no final.',
        ],
      }],
    },
  };

  // Ficha aprovada do Projeto V 4.0 (não alterar séries nem repetições)
  const PROGRAMA = {
    id: 'projeto-v-4.0',
    nome: 'Projeto V 4.0',
    subtitulo: 'Hipertrofia e definição',
    duracaoDias: 90,
    perfil: { inicio: '2026-11-13', peso: 80, altura: 172, idade: 26 },
    treinos: [
      {
        nome: 'Costas + Bíceps',
        objetivo: 'Largura e espessura das costas, desenvolvimento dos bíceps.',
        exercicios: [
          ['puxada-alta-pronada', 4, '6–10'],
          ['remada-articulada', 4, '8–10'],
          ['puxada-neutra', 3, '8–12'],
          ['pulldown-braco-estendido', 3, '12–15'],
          ['rosca-direta-w', 4, '8–10'],
          ['rosca-inclinada', 3, '10–12'],
        ],
      },
      {
        nome: 'Peito + Tríceps',
        objetivo: 'Hipertrofia do peitoral, principalmente região superior, e tríceps.',
        exercicios: [
          ['supino-inclinado-halteres', 4, '6–10'],
          ['supino-reto', 4, '8–10'],
          ['crossover', 3, '10–15'],
          ['crucifixo-maquina', 3, '12–15'],
          ['triceps-frances', 3, '8–12'],
          ['triceps-corda', 3, '10–15'],
        ],
      },
      {
        nome: 'Pernas + Abdômen',
        objetivo: 'Desenvolvimento completo de quadríceps, posteriores, glúteos, panturrilhas e abdômen.',
        exercicios: [
          ['agachamento-ou-hack', 4, '6–10'],
          ['leg-press', 4, '10–12'],
          ['terra-romeno', 3, '8–10'],
          ['cadeira-extensora', 3, '12–15'],
          ['mesa-flexora', 3, '10–12'],
          ['panturrilha-em-pe', 4, '10–15'],
          ['abdominal-polia', 3, '12–15'],
        ],
      },
      {
        nome: 'Ombros + Braços',
        objetivo: 'Ombros largos, deltoides desenvolvidos e braços volumosos.',
        exercicios: [
          ['desenvolvimento-halteres', 4, '6–10'],
          ['elevacao-lateral', 4, '10–15'],
          ['crucifixo-inverso', 3, '12–15'],
          ['rosca-scott', 3, '8–12'],
          ['rosca-martelo', 3, '10–12'],
          ['triceps-testa', 3, '8–12'],
          ['triceps-unilateral', 3, '10–15'],
        ],
      },
      {
        nome: 'Especialização Shape em V',
        objetivo: 'Reforçar dorsais, peitoral superior e ombros para desenvolver o formato em V.',
        exercicios: [
          ['barra-fixa-ou-puxada', 3, '6–10'],
          ['remada-baixa', 3, '8–12'],
          ['supino-inclinado-maquina', 3, '8–12'],
          ['elevacao-lateral-polia', 4, '12–15'],
          ['face-pull', 3, '12–15'],
        ],
      },
    ],
  };

  window.PROJETO_V = PROGRAMA;
  window.CATALOGO = CATALOGO;
})();
