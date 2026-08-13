# Gesture Synth BR — Beta 0.9.0

Instrumentos musicais virtuais controlados pelas mãos usando visão computacional no navegador.

## O que esta Beta oferece

- 🎹 Piano: modo por gestos e piano virtual compacto, polifônico, com teclas brancas e pretas.
- 🎸 Violão: modo por gestos e violão virtual com acordes em uma mão e rasgueado na outra.
- 🥁 Bateria: modo por gestos e pads virtuais com duas mãos.
- 🎛️ Sintetizador: notas por gesto e expressão pela segunda mão.
- ✋ MediaPipe Hand Landmarker com até duas mãos e handedness real.
- 🪞 Espelhamento somente da câmera/landmarks; interface e instrumentos permanecem corretos.
- 🎯 Calibração de altura.
- ⚙️ Mão dominante, sensibilidade, qualidade da câmera, volume, landmarks e debug.
- 🎧 Aula demonstrativa e importação de MIDI com preservação de acordes próximos no tempo.
- 🔗 Player oficial do YouTube apenas para exibição.
- 💚 Pix para apoio voluntário.

## Limitações atuais

- A análise automática de MP3/WAV ainda não está habilitada. O front-end já possui a função `analyzeAudio()`, mas ela só funcionará quando um backend real for configurado.
- O player do YouTube ainda não controla a linha do tempo da aula. Ele é apenas incorporado na Beta 0.9.0.
- Piano e violão usam síntese do Tone.js; samples reais podem ser adicionados depois.
- O processamento do Hand Landmarker ocorre no thread principal nesta Beta. O código foi modularizado para facilitar uma futura migração de partes do processamento para Worker quando tecnicamente conveniente.

## Privacidade

Nesta versão, os quadros da webcam são processados no navegador para detecção das mãos. O Gesture Synth BR não implementa upload, gravação ou armazenamento do vídeo da webcam ou dos landmarks.

O site carrega bibliotecas/modelos por CDN/Google, portanto a conexão com esses provedores segue as políticas deles. Nenhum frame da webcam é enviado pelo código do Gesture Synth BR.

## Estrutura

```text
gesture-synth-br/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── config.js
│   ├── camera.js
│   ├── hands.js
│   ├── gestures.js
│   ├── audio.js
│   ├── piano.js
│   ├── guitar.js
│   ├── drums.js
│   ├── synth.js
│   ├── lessons.js
│   ├── midi.js
│   ├── youtube.js
│   ├── audio-analysis.js
│   ├── pix.js
│   ├── analytics.js
│   ├── ui.js
│   └── utils.js
├── assets/
├── CHANGELOG.md
├── TESTES.md
├── INICIAR_LOCAL.bat
└── .gitignore
```

## Como executar no computador

### Opção 1 — VS Code + Live Server

1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html`.
4. Escolha **Open with Live Server**.

### Opção 2 — Python

Na pasta do projeto:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

No Windows, também é possível dar dois cliques em `INICIAR_LOCAL.bat` se o Python estiver instalado.

> Recomenda-se servidor local em vez de abrir o arquivo `index.html` diretamente, porque módulos JavaScript, câmera e recursos externos se comportam melhor em contexto HTTP/HTTPS.

## Como publicar na Vercel

O projeto é estático: não exige processo de build nesta Beta.

### Fluxo recomendado

```text
VS Code
  ↓
Git / GitHub Desktop
  ↓
GitHub
  ↓
Vercel
```

1. Crie um repositório no GitHub.
2. Se não quiser deixar o código público, use um **repositório privado**.
3. Envie esta pasta ao repositório.
4. Na Vercel, importe o repositório do GitHub.
5. Framework Preset: **Other** / site estático, se solicitado.
6. Não é necessário comando de build.
7. O diretório de saída é a própria raiz do projeto.

A Vercel fornecerá HTTPS, necessário para uso normal da câmera em produção.

## Como atualizar o site

Fluxo recomendado com duas branches:

```text
main = produção
dev  = desenvolvimento/testes
```

1. Abra a branch `dev` no GitHub Desktop.
2. Faça as alterações no VS Code.
3. Teste localmente.
4. No GitHub Desktop, revise as mudanças.
5. Faça um commit, por exemplo: `melhora sensibilidade da bateria`.
6. Clique em **Push origin**.
7. A Vercel cria um Preview Deployment para a branch/alteração.
8. Teste o preview no computador e no celular.
9. Quando estiver estável, faça merge de `dev` para `main`.
10. A Vercel publica a nova produção automaticamente.

Se uma versão quebrar, use o histórico do Git/GitHub ou o rollback de deployment da Vercel.

## Onde modificar cada coisa

| O que deseja mudar | Arquivo principal |
|---|---|
| Cores, layout e mobile | `css/style.css` |
| Fluxo geral e botões | `js/app.js` |
| Pix e URLs públicas | `js/config.js` |
| Câmera e qualidade | `js/camera.js` |
| MediaPipe / handedness | `js/hands.js` |
| Contagem de dedos | `js/gestures.js` |
| Sons | `js/audio.js` |
| Piano | `js/piano.js` |
| Violão | `js/guitar.js` |
| Bateria | `js/drums.js` |
| Synth | `js/synth.js` |
| Aulas e pontuação | `js/lessons.js` |
| MIDI | `js/midi.js` |
| YouTube | `js/youtube.js` |
| Backend futuro de áudio | `js/audio-analysis.js` |

## Segurança

O Pix no `config.js` é público intencionalmente. **Nunca coloque neste repositório**:

- senhas;
- tokens de API;
- chaves privadas;
- segredos de banco de dados;
- credenciais de serviços externos.

Quando o backend do Basic Pitch for criado, segredos devem ficar em variáveis de ambiente do servidor/Vercel, nunca no JavaScript entregue ao navegador.

## Dependências fixadas

- MediaPipe Tasks Vision: `1.0.1`
- Tone.js: `15.1.22`
- @tonejs/midi: `2.0.28`
- qrcodejs: `1.0.0`

## Mão dominante

Em **Configurações**, o usuário escolhe Direita ou Esquerda. No violão:

- destro: mão esquerda escolhe acorde; direita rasgueia;
- canhoto: mão direita escolhe acorde; esquerda rasgueia.

A identificação anatômica usa o handedness retornado pelo MediaPipe e não apenas a posição X na tela.

## Análise de música — arquitetura futura

```text
frontend
   ↓ POST /api/analyze
backend Python
   ↓
Basic Pitch
   ↓
JSON / MIDI
   ↓
modo Aula
```

Formato esperado do backend:

```json
{
  "bpm": 92,
  "key": "G",
  "events": [
    {"time": 0.52, "duration": 0.40, "notes": ["C4"]},
    {"time": 1.02, "duration": 0.55, "notes": ["C4", "E4", "G4"]}
  ]
}
```

## Analytics futuro

Existe a função `trackEvent()` em `js/analytics.js`. Na Beta ela não envia dados. Ela já está preparada para eventos como:

- `camera_allowed`
- `instrument_selected`
- `mode_selected`
- `lesson_started`
- `midi_imported`
- `pix_opened`
- `pix_copied`

Nenhum frame de câmera ou landmark deve ser enviado para analytics.

## Roadmap

### 0.9 Beta
- instrumentos virtuais;
- handedness;
- calibração;
- MIDI;
- aula experimental;
- Pix.

### 1.0
- testes extensivos em mobile;
- melhorias de acessibilidade e desempenho;
- samples musicais melhores;
- estabilidade de longa duração.

### 1.1
- gravação de performance;
- compartilhamento de resultados.

### 1.2
- backend com Basic Pitch;
- transcrição de áudio para notas/MIDI.

### 1.3
- biblioteca de músicas e exercícios.

### 2.0
- contas, progresso, planos e recursos premium.
