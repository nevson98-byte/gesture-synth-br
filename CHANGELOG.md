# Changelog

## 0.9.0 Beta — 2026-08-13

### Adicionado
- Arquitetura modular em HTML/CSS/JavaScript ES Modules.
- MediaPipe Hand Landmarker moderno com duas mãos e handedness.
- Suporte a mão dominante direita/esquerda.
- Velocidade de movimentos calculada com delta de tempo em vez de pixels por frame.
- Piano virtual compacto, polifônico e com teclas pretas.
- Violão virtual compacto com rasgueado ascendente/descendente.
- Bateria virtual com duas mãos.
- Sintetizador gestual com expressão suavizada.
- Reset central de estados ao trocar modos/calibrar/perder mãos.
- Configurações de qualidade, sensibilidade, volume e debug.
- Adaptação automática de câmera em FPS baixo.
- Aula demonstrativa e MIDI com agrupamento de acordes.
- Pontuação com dificuldade e tolerância temporal.
- YouTube via player incorporado.
- Pix Copia e Cola, QR Code e link de cobrança.
- Modal de privacidade.
- README e checklist de testes.

### Limitações conhecidas
- Análise de MP3/WAV exige backend ainda não implementado.
- YouTube ainda não está sincronizado à linha do tempo da aula.
- Hand Landmarker roda no thread principal nesta Beta.
