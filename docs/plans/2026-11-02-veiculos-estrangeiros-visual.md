# Seleção compacta de veículos e documentos estrangeiros

Alterações solicitadas para o aplicativo original `ctb-agente`; a prévia Sites é independente.

- Seletor de veículos com miniaturas compactas e linhas menores, mantendo código, eixos, nome e limite. Os detalhes técnicos ficam disponíveis ao expandir o desenho.
- SVGs com volume vetorial, faces superiores e laterais, acabamento metálico, vidro e rodas sombreadas. Mantidos os eixos, unidades e engates do catálogo; nenhuma dependência WebGL adicionada.
- Miniaturas não executam animação de entrada. A vista ampliada mantém a preferência de movimento reduzido.
- Bandeiras locais dos 11 países estrangeiros soberanos da América do Sul. Brasil segue o fluxo de registro brasileiro; o catálogo internacional completo continua disponível ao motor de análise.
- Acrescentados códigos e gentílicos de Colômbia, Equador, Guiana e Venezuela aos registros já existentes, sem alterar os instrumentos internacionais catalogados. Selecionar Suriname não presume tratado ausente.
- Seis diagramas documentais originais sob demanda: habilitação, identificação, registro do veículo, seguro, entrada e PID. São esquemas didáticos de campos, explicitamente distintos de modelos oficiais nacionais, com links à base normativa do módulo.
- Bandeiras de `flag-icons` 7.6.0, licença MIT incluída; nenhuma dependência de rede para carregar esses recursos.

## Verificação

- Build de produção e TypeScript aprovados.
- Suíte completa: 154 suítes, 1.163 testes aprovados.
- Testes finais dos componentes afetados: 17 aprovados.
- Playwright: 8 testes aprovados (desktop/mobile), incluindo seleção e desenho ampliado em 320, 390 e 1440px, teclado, bandeiras e imagens documentais.
- Conferência das 12 configurações: quantidades de eixos e unidades preservadas.
- Corrigido o dimensionamento mínimo da coluna da calculadora ao expandir detalhes em telas estreitas; regressão verificada em navegador.
- Seis imagens documentais carregadas e seleção de Suriname sem confirmação automática de tratado.
