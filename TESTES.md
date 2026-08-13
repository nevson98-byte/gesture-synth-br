# Checklist de testes — Gesture Synth BR 0.9.0 Beta

## Inicialização
- [ ] Site abre sem erros visíveis.
- [ ] Tela de boas-vindas aparece.
- [ ] Negar câmera mostra mensagem adequada.
- [ ] Permitir câmera ativa o vídeo.
- [ ] Ativar som funciona após gesto/clique do usuário.

## Rastreamento
- [ ] Uma mão é detectada.
- [ ] Duas mãos são detectadas.
- [ ] Handedness esquerda/direita corresponde às mãos anatômicas.
- [ ] Cruzar as mãos não troca permanentemente as funções.
- [ ] Perder as mãos não deixa som preso.
- [ ] Reaparecer após perda não gera nota/batida fantasma.

## Destro / canhoto
- [ ] Mão dominante Direita funciona.
- [ ] Mão dominante Esquerda funciona.
- [ ] Violão troca acorde/rasgueado corretamente para canhoto.

## Piano
- [ ] Ordem visual: Dó Ré Mi Fá Sol Lá Si Dó.
- [ ] Teclas pretas estão no lugar correto.
- [ ] Um toque descendente dispara uma única nota.
- [ ] Dedo parado não repete a nota.
- [ ] Dois ou mais dedos podem tocar simultaneamente.
- [ ] Sensibilidade baixa/normal/alta muda o comportamento.

## Violão
- [ ] Zona é compacta e não ocupa a tela inteira.
- [ ] Acorde muda após gesto estável.
- [ ] Rasgueado descendente toca cordas em sequência.
- [ ] Rasgueado ascendente funciona.
- [ ] Dedo parado não repete cordas.

## Bateria
- [ ] Todos os pads aparecem.
- [ ] Duas mãos funcionam simultaneamente.
- [ ] Batida descendente dispara pad.
- [ ] Mão parada não repete som.
- [ ] Modo gestos funciona.

## Synth
- [ ] Nota sustentada não fica picotando.
- [ ] Segunda mão altera expressão suavemente.
- [ ] Remover mão encerra nota.

## Calibração / configurações
- [ ] Calibração 3-2-1 funciona.
- [ ] Instrumentos mudam de altura após calibrar.
- [ ] Qualidade da câmera troca corretamente.
- [ ] Volume geral funciona.
- [ ] Landmarks podem ser ocultados.
- [ ] Espelhamento pode ser desligado.
- [ ] Debug exibe FPS e confiança.
- [ ] Trocar câmera funciona no celular quando disponível.

## Aula / MIDI
- [ ] Demonstração carrega.
- [ ] MIDI carrega.
- [ ] Acordes simultâneos do MIDI permanecem agrupados.
- [ ] Fácil, Normal e Completa têm comportamentos diferentes.
- [ ] Fluxo normal avança pelo tempo.
- [ ] Treino espera a nota correta.
- [ ] Pontuação registra acertos/erros.
- [ ] Metrônomo inicia e para.

## YouTube
- [ ] Link youtube.com funciona.
- [ ] Link youtu.be funciona.
- [ ] Link Shorts funciona.
- [ ] Link inválido mostra erro.

## Pix
- [ ] Modal abre.
- [ ] QR Code aparece.
- [ ] Copiar Pix funciona.
- [ ] Código é o mesmo payload configurado.
- [ ] Link Nubank abre em nova aba.

## Mobile
- [ ] Android Chrome horizontal.
- [ ] Android Chrome vertical mostra aviso.
- [ ] iPhone Safari horizontal.
- [ ] iPhone Safari vertical mostra aviso.
- [ ] Dock é rolável e não bloqueia controles.
- [ ] Tela cheia funciona quando suportada.

## Sessão longa
- [ ] Usar por 30 minutos sem travamento progressivo.
- [ ] Trocar instrumentos repetidamente sem aumento perceptível de bugs.
