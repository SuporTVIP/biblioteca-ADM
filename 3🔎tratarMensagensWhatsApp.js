// =================================================================
// 3. ROBÔ DE MARKETING (marketingBot.gs) - VERSÃO FINAL TURBO 🚀
// =================================================================

/**
 * Controlador Principal: Recebe o texto, extrai dados, monta a mensagem e envia.
 * ATUALIZAÇÃO: Se não identificar cidades (Origem/Destino), IGNORA a mensagem em vez de mandar genérico.
 */
function processarMarketingRedirecionamento(textoBruto, fromId) {
  try {
    if (textoBruto.includes("💎 Comunidade FãMilhas")) return;

    // A. Filtro Lixo Inicial
    const motivoBloqueio = verificarMensagemLixo(textoBruto);
    if (motivoBloqueio) {
      console.log(`🗑️ Bloqueado: ${motivoBloqueio}`);
      return;
    }

    // 🚀 PERFORMANCE: Leitura Única
    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const sheetTaxas = ss.getSheetByName(aba.TAXAS_AERO);
    const sheetConfig = ss.getSheetByName(aba.CONFIGURACOES);

    // Carrega dados para Memória
    const dadosTaxasRaw = sheetTaxas.getRange(intvConfig.TAB_TAXAS_AERO + sheetTaxas.getLastRow()).getValues();
    const dadosPrecosRaw = sheetConfig.getRange(intvConfig.TAB_CPM_VPM + sheetConfig.getLastRow()).getValues();
    const templateRaw = sheetConfig.getRange(intvConfig.MSG_ALERTA_GP).getValue();

    const templateWpp = sheetConfig.getRange(intvConfig.MSG_WPP_TEMPLATE).getValue(); 
    const margemEmissao = sheetConfig.getRange(intvConfig.MARGEM_EMISSAO).getValue();
    const templateBalcao = sheetConfig.getRange(intvConfig.MSG_WPP_BALCAO_TEMPLATE).getValue(); // <--- NOVA LINHA

    // B. Extração
    const dados = extrairMetadadosCompleto(textoBruto, dadosTaxasRaw);
    
    // =================================================================
    // 🛡️ BLOQUEIO DE SEGURANÇA (Fim do "Brasil -> Mundo")
    // =================================================================
    if (!dados.origem || !dados.destino) {
      // Se não achou as cidades pelos padrões rígidos (Setas ou "Origem:"),
      // assumimos que é uma notícia, blog ou conversa aleatória.
      console.log("🗑️ Ignorado: Cidades não identificadas (Estrutura inválida).");
      return; // <--- AQUI ESTÁ A MÁGICA: Aborta a execução.
    }

    // C. Preparação e Limpeza
    let corpoOferta = limparCorpoOferta(textoBruto);
    
    // Reformata datas para layout VIP
    corpoOferta = transformarDatasParaLayoutVIP(corpoOferta); 
    
    const linkLongo = gerarLinkBusca(dados);
    const nomeBaseLink = dados.programa || "oferta"; 
    const linkCurto = criarLinkCurto(linkLongo, nomeBaseLink);

    // D. Montagem
    const mensagemFinal = montarTemplateVIP(dados, corpoOferta, linkCurto, dadosTaxasRaw, dadosPrecosRaw, templateRaw, templateWpp, margemEmissao, templateBalcao);
    
// E. Envio
    console.log(`✅ Oferta Válida! Enviando...`);
    enviarMensagemWppConnect(configGeral.ID_GRUPO_VIP_DESTINO, mensagemFinal);
    salvarNaPlanilha(mensagemFinal, configGeral.ID_GRUPO_VIP_DESTINO, linkCurto);

  } catch (e) {
    console.error("🔥 Erro Bot:", e.message);
  }
}

// --- 3. LÓGICA DE NEGÓCIO ---

/**
 * Monta a mensagem final usando o Template da Planilha (Aba CONFIGURAÇÕES).
 * Substitui os placeholders {PROGRAMA}, {ORIGEM}, {DESTINO}, {CORPO} e {LINK}.
 * * @param {object} dados - Metadados do voo (origem, destino, programa, etc).
 * @param {string} corpo - Texto bruto original limpo.
 * @param {string} linkPronto - Link encurtado ou original.
 * @param {Array} dadosTaxas - Array da aba TAXAS_AERO para busca rápida.
 * @param {Array} dadosPrecos - Array da aba CONFIGURAÇÕES para cálculo.
 * @param {string} templateString - O texto do template vindo da célula J3.
 * @return {string} A mensagem final formatada para envio.
 */

function montarTemplateVIP(dados, corpo, linkPronto, dadosTaxas, dadosPrecos, templateString, templateWpp, margemPct, templateBalcao) {
  console.log(`[TEMPLATE] Iniciando montagem para: ${dados.programa}`);

  // =================================================================
  // 1. CÁLCULO DE TAXAS (Lógica Original - Não mexer)
  // =================================================================
  let valorTaxas = 0;
  const buscarTaxa = (iata) => {
      if(!iata) return { dom: 0, int: 0 };
      const linha = dadosTaxas.find(r => r[1] == iata);
      if(linha) return { dom: normalizarDinheiro(linha[2]), int: normalizarDinheiro(linha[3]) };
      return { dom: 0, int: 0 };
  };
  
  const taxasOrigem = buscarTaxa(dados.iataOrigem);
  const taxasDestino = buscarTaxa(dados.iataDestino);
  const ehInternacional = (taxasDestino.int > 0 && taxasDestino.dom === 0);

  if (taxasOrigem) {
    if (ehInternacional) valorTaxas += (taxasOrigem.int > 0) ? taxasOrigem.int : taxasOrigem.dom;
    else valorTaxas += taxasOrigem.dom;
  }
  if (dados.dataVolta && taxasDestino) {
    valorTaxas += (taxasDestino.int > taxasDestino.dom) ? taxasDestino.int : taxasDestino.dom;
  }
  const textoTaxasDisplay = valorTaxas > 0 ? valorTaxas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : "A consultar";

 // =================================================================
  // 2. CÁLCULO DE PREÇOS (Com Link do Balcão)
  // =================================================================
  let blocoPrecos = "";
  let valorBalcaoNumerico = 0;

  if (dados.milhas > 0) {
    const resultado = calcularPrecosMemoria(dados.programa, dados.milhas, dadosPrecos);
    if (resultado.venda > 0) {
      const totalMilheiro = resultado.custo + valorTaxas;
      const totalCliente = resultado.venda + valorTaxas;

      valorBalcaoNumerico = totalCliente;

      blocoPrecos = `\n💰 *Fabricado:* ${totalMilheiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n\n💎 *Balcão:* ${totalCliente.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n_(Taxas de ${textoTaxasDisplay} inclusas)_`;
      
      // --- NOVO: LINK DO BALCÃO VIP ---
      if (templateBalcao) {
          // 1. Calcula o CPM e Valor Total (Milhas * CPM)
          const cpmUsado = resultado.venda / (dados.milhas / 1000);
          const valorSemTaxas = resultado.venda;

          // 2. Substitui as variáveis no texto
          let msgBalcao = templateBalcao;
          msgBalcao = msgBalcao.replace(/{LINK_EMISSAO}/g, linkPronto)
                               .replace(/{MILHAS_TOTAIS}/g, dados.milhas.toLocaleString('pt-BR'))
                               .replace(/{ORIGEM}/g, dados.origem || "")
                               .replace(/{DESTINO}/g, dados.destino || "")
                               .replace(/{VALOR}/g, totalCliente.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}))
                               .replace(/{CPM}/g, cpmUsado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}))
                               .replace(/{VALOR_TOTAL}/g, valorSemTaxas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));

        // 3. Monta e encurta o link (SEM número fixo, para você poder enviar pro Grupo)
          const linkZapBalcao = `https://api.whatsapp.com/send?text=${encodeURIComponent(msgBalcao)}`;
          const linkBalcaoCurto = criarLinkCurto(linkZapBalcao, "vip-" + (dados.programa || "oferta"));

          // 4. Adiciona no alerta visual
          blocoPrecos += `\n🔗 *Fechar no Balcão:* ${linkBalcaoCurto}`;
      }
      // ---------------------------------

    } else {
      blocoPrecos = `\n⚠️ Cálculo indisponível.\n_(Taxas de ${textoTaxasDisplay} inclusas)_`;
    }
  } else {
      blocoPrecos = `\n_(Taxas de ${textoTaxasDisplay} inclusas)_`;
  }

  // =================================================================
  // 🆕 CÁLCULO DE EMISSÃO COM A AGÊNCIA
  // =================================================================
  let blocoEmissao = "";
  
  if (valorBalcaoNumerico > 0 && margemPct) {
      const precoAgencia = valorBalcaoNumerico * (1 + Number(margemPct));
      
      let msgZap = templateWpp || "Olá, gostaria de emitir: {LINK_EMISSAO}";
      msgZap = msgZap.replace(/{LINK_EMISSAO}/g, linkPronto);
      msgZap = msgZap.replace(/{MILHAS_TOTAIS}/g, dados.milhas.toLocaleString('pt-BR'));
      msgZap = msgZap.replace(/{ORIGEM}/g, dados.origem || "");
      msgZap = msgZap.replace(/{DESTINO}/g, dados.destino || "");
      msgZap = msgZap.replace(/{VALOR}/g, precoAgencia.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));

      const linkZapFinal = `https://api.whatsapp.com/send?phone=${configGeral.TELEFONE_AGENCIA}&text=${encodeURIComponent(msgZap)}`;

      // 1. Gera Link do Balcão
      const scriptUrl = ScriptApp.getService().getUrl(); // Pega a URL do seu Web App
      
      // Monta os parâmetros para o formulário saber de qual voo estamos falando
      const paramsBalcao = `?venda=true` +
                           `&prog=${encodeURIComponent(dados.programa)}` +
                           `&orig=${encodeURIComponent(dados.origem)}` +
                           `&dest=${encodeURIComponent(dados.destino)}` +
                           `&ref=${encodeURIComponent(linkPronto)}`; // Link da oferta original como referência
      
      const linkBalcaoLongo = scriptUrl + paramsBalcao;
      
      // 2. Encurta o link (opcional, mas recomendado)
      const slugBalcao = "vender-" + (dados.programa || "milhas");
      const linkBalcaoCurto = criarLinkCurto(linkBalcaoLongo, slugBalcao);

      // 3. Adiciona ao Visual
      // Adicionamos o botão/link vermelho de venda logo abaixo do de emissão
      blocoEmissao += `\n\n💼 *Tem milhas e quer vender?*\n🔴 *Vender para Agência:* ${linkBalcaoCurto}`;

      // Define um nome para o link (ex: emitir-latam)
      const slugEmissao = "emitir" + (dados.programa || "oferta");

      // Usa a SUA função existente para encurtar
      const linkZapCurto = criarLinkCurto(linkZapFinal, slugEmissao);
      // -----------------------------------------------

      blocoEmissao = `\n🏢 *Emitindo com a FãMilhas:* ${precoAgencia.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}\n🔗 *Clique para Emitir:* ${linkZapCurto}`;
  }


  // =================================================================
  // 3. MONTAGEM DO CORPO DINÂMICO
  // =================================================================
  
  // Limpeza básica
  let corpoLimpo = corpo ? corpo.replace(/\+\s*taxas\s*aeroportuárias/gi, "").trim() : "";
  
  // Detecção Iberia/Avios
  const isIberia = (dados.programa || "").toUpperCase().includes("IBERIA");
  const nomeMoeda = isIberia ? "Avios" : "milhas";

  // Tenta extrair linhas de milhas existentes
  const linhasDeMilhas = corpoLimpo.split('\n').filter(l => l.match(/milhas|pontos|avios/i) && !l.match(/Disponibilidades/));
  let textoMilhasDisplay = "";

  if (linhasDeMilhas.length > 0) {
     textoMilhasDisplay = "" + linhasDeMilhas.join("\n").replace(/\+\s*taxas/gi, "").trim();
     if (isIberia) textoMilhasDisplay = textoMilhasDisplay.replace(/milhas/gi, "Avios");
  } else if (dados.milhas > 0) {
     // Se não achou no texto, cria manual
     const milhasFormatadas = (dados.milhas).toLocaleString('pt-BR');
     if (corpo && corpo.match(/Volta|Retorno|⬅/)) {
        textoMilhasDisplay = `\n➡ Ida e Volta: ${milhasFormatadas} ${nomeMoeda}`; 
     } else {
        textoMilhasDisplay = `\n➡ Ida: ${milhasFormatadas} ${nomeMoeda}`; 
     }
  }
  
  // =================================================================
  // 4. CAPTURA E FORMATAÇÃO DE DATAS (Versão Flexível)
  // =================================================================
  let blocoDatasFinal = "";
  
  if (corpoLimpo) {
    // Captura o bloco inteiro, ignorando se já tem crases ou não
    const matchDatas = corpoLimpo.match(/((?:`{3})?Disponibilidades[\s\S]*)/i);
    
    if (matchDatas && matchDatas[1]) {
        let texto = matchDatas[1].trim();

        // 1. HIGIENIZAÇÃO: Remove TODAS as crases existentes para não duplicar
        texto = texto.replace(/`/g, "");

        // 2. RECONSTRUÇÃO IDA (Com Regex Flexível \s* para ignorar espaços extras)
        // Transforma "Disponibilidades - IDA" em "```Disponibilidades - IDA```"
        // Adiciona \n antes para garantir que o WhatsApp reconheça o bloco
        texto = texto.replace(/Disponibilidades\s*-\s*IDA/gi, "\n`Disponibilidades - IDA`");

        // 3. RECONSTRUÇÃO VOLTA (Com Regex Flexível)
        // Adiciona \n\n antes para dar o espaçamento vertical que você queria
        texto = texto.replace(/Disponibilidades\s*-\s*VOLTA/gi, "\n`Disponibilidades - VOLTA`");
        
        blocoDatasFinal = texto;
    }
  }

  // Junta as partes dinâmicas
  const corpoDinamico = [
      textoMilhasDisplay, 
      blocoPrecos, 
      blocoEmissao,
      blocoDatasFinal
  ].join("\n");

  // =================================================================
  // 4. INJEÇÃO NO TEMPLATE (Onde estava o problema)
  // =================================================================
  
  // Pega o template da planilha ou usa um fallback seguro
  let msgFinal = templateString;
  if (!msgFinal || msgFinal === "") {
      msgFinal = "🚀 ALERTA FãMilhaSVIP - {PROGRAMA}\n\n🌍 *{ORIGEM}*   ✈️   *{DESTINO}*\n\n{CORPO}\n\n ⚠️ _Preços promocionais não esperam e ainda estão sujeitos a disponibilidades da companhia!_ \n\n📲 *Acesse:* {LINK}";
  }

  // Substitui as variáveis
  msgFinal = msgFinal.replace(/{PROGRAMA}/g, dados.programa || "OFERTA");
  msgFinal = msgFinal.replace(/{ORIGEM}/g, dados.origem || "Brasil");
  msgFinal = msgFinal.replace(/{DESTINO}/g, dados.destino || "Mundo");
  msgFinal = msgFinal.replace(/{LINK}/g, linkPronto || "https://familha.suportvip.com");
  
  // Injeta o miolo calculado
  msgFinal = msgFinal.replace(/{CORPO}/g, corpoDinamico);

  console.log("[TEMPLATE] Mensagem montada com sucesso.");
  return msgFinal;
}

// Versão Otimizada (Recebe Array, não abre planilha)
function calcularPrecosMemoria(programa, milhasTotais, dadosArray) {
  if (!milhasTotais || milhasTotais === 0) return { custo: 0, venda: 0 };

  try {
    const progBusca = programa.toUpperCase().replace(" PASS", "").trim(); 

    const regra = dadosArray.find(linha => {
      const pPlanilha = String(linha[0]).toUpperCase().trim();
      if (!pPlanilha) return false;
      const min = Number(linha[1]); 
      const max = Number(linha[2]); 
      
      const matchProg = pPlanilha.includes(progBusca) || progBusca.includes(pPlanilha);
      const matchRange = milhasTotais >= min && milhasTotais <= max;
      return matchProg && matchRange;
    });

    if (regra) {
      const cpmCusto = normalizarDinheiro(regra[3]);
      const cpmVenda = normalizarDinheiro(regra[4]);
      return {
        custo: (milhasTotais / 1000) * cpmCusto,
        venda: (milhasTotais / 1000) * cpmVenda
      };
    } 
  } catch (e) {}
  return { custo: 0, venda: 0 };
}

// --- 4. EXTRATORES ---

// Agora recebe dadosTaxas para buscar IATA na memória
function extrairMetadadosCompleto(texto, dadosTaxas) {
  let origemLimpa = null;
  let destinoLimpo = null;

  // 1. TENTATIVA A: Padrão Clássico
  const regexOrigem = /[\\*_]*Origem[\\*_]*[\s:_-]*(?:🛫|🛬|✈|✈️)?\s*([^\n\r]*)/i;
  const regexDestino = /[\\*_]*Destino[\\*_]*[\s:_-]*(?:🛫|🛬|✈|✈️)?\s*([^\n\r]*)/i;
  
  const mO = texto.match(regexOrigem);
  const mD = texto.match(regexDestino);

  if (mO && mD) {
    origemLimpa = limparNome(mO[1]);
    destinoLimpo = limparNome(mD[1]);
  }

  // 2. TENTATIVA B: Padrão Telegram/Emoji
  if (!origemLimpa || !destinoLimpo) {
    const linhas = texto.split('\n');
    for (const linha of linhas) {
      if ((linha.includes('✈️') || linha.includes('✈')) && !linha.match(/\d{2}\/\d{2}/)) {
        const partes = linha.split(/✈️|✈/);
        if (partes.length >= 2) {
          let ladoEsq = partes[0].replace(/[🚨💥✨➡]|Origem|Saindo de/gi, "").trim();
          let ladoDir = partes[1].replace(/[🇧🇷🇺🇸🇪🇺🇵🇹🇦🇷⬅]|Destino|Indo para/gi, "").trim();
          if (ladoEsq.length > 2 && ladoDir.length > 2) {
             origemLimpa = limparNome(ladoEsq);
             destinoLimpo = limparNome(ladoDir);
             break;
          }
        }
      }
    }
  }

  const datas = extrairDatasDoTexto(texto);
  const milhas = extrairQuantidadeMilhas(texto); 
  
  // Converte IATA usando memória (Performance)
  const iataO = converterParaIataMemoria(origemLimpa, dadosTaxas);
  const iataD = converterParaIataMemoria(destinoLimpo, dadosTaxas);

  return {
    programa: detectingProgramaSimples(texto),
    origem: origemLimpa,
    destino: destinoLimpo,
    iataOrigem: iataO,
    iataDestino: iataD,
    dataIda: datas.ida,
    dataVolta: datas.volta,
    milhas: milhas
  };
}

// Versão Otimizada (Busca IATA no Array)
function converterParaIataMemoria(nomeCidade, dadosTaxas) {
  if (!nomeCidade) return null;

  let busca = nomeCidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (MAPA_CORRECAO[busca]) busca = MAPA_CORRECAO[busca];

  // Loop no Array em vez de abrir planilha
  for (let i = 0; i < dadosTaxas.length; i++) {
    // dadosTaxas[i][0] é Cidade, [1] é IATA
    const cidadeSheet = String(dadosTaxas[i][0]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const iata = dadosTaxas[i][1];
    
    if (cidadeSheet && (cidadeSheet === busca || cidadeSheet.includes(busca) || busca.includes(cidadeSheet))) {
      return iata;
    }
  }
  return null;
}

function extrairQuantidadeMilhas(texto) {
  // 1. LIMPEZA PROFUNDA
  let textoLimpo = texto.replace(/https?:\/\/[^\s]+/gi, '')
                        .replace(/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[^\s]+/gi, '')
                        .replace(/[*_]/g, '');

  // 2. REGEX ATUALIZADO (O PULO DO GATO 🐱)
  // Adicionei |\s*avios|\s*pontos dentro dos grupos de captura
  const regexSetas = /(?:➡|⬅|Ida|Volta).*?(\d+(?:[.,]\d+)?)\s*(k|mil|m\b|\s*milhas|\s*avios|\s*pontos)/gi;
  
  let somaSetas = 0;
  let achouSeta = false;
  let match;

  while ((match = regexSetas.exec(textoLimpo)) !== null) {
    achouSeta = true;
    somaSetas += processarValorMilhas(match[1], match[2]);
  }
  
  if (achouSeta && somaSetas > 100) return somaSetas;

  // 3. Fallback Geral (Também atualizado para Avios)
  const regexGeral = /(\d+(?:[.,]\d+)?)\s*(k|mil|m\b|\s*milhas|\s*avios|\s*pontos)/gi;
  let maiorValor = 0;
  while ((match = regexGeral.exec(textoLimpo)) !== null) {
    let valor = processarValorMilhas(match[1], match[2]);
    if (valor > maiorValor) maiorValor = valor;
  }

  return maiorValor > 100 ? maiorValor : 0;
}

function processarValorMilhas(numRaw, sufixo) {
   let valor = 0;
   const suf = sufixo.toLowerCase().trim();
   if (suf.includes('k') || suf.includes('mil') && !suf.includes('milhas') || suf === 'm') {
     let v = parseFloat(numRaw.replace(',', '.'));
     valor = v * 1000;
   } else {
     if (numRaw.includes('.')) {
        valor = parseFloat(numRaw.replace(/\./g, ''));
     } else {
        let v = parseFloat(numRaw.replace(',', '.'));
        if (v < 100) valor = v * 1000; 
        else valor = v;
     }
   }
   return valor;
}

function extrairDatasDoTexto(texto) {
  const regexIda = /(?:➡|Ida).*?(\d{1,2}\/\d{1,2})/i;
  const regexVolta = /(?:⬅|Volta).*?(\d{1,2}\/\d{1,2})/i;
  const mIda = texto.match(regexIda);
  const mVolta = texto.match(regexVolta);
  return {
    ida: mIda ? converterStringParaData(mIda[1]) : null,
    volta: mVolta ? converterStringParaData(mVolta[1]) : null
  };
}

// --- 5. INTEGRAÇÕES ---

function gerarLinkBusca(dados) {
  if (!dados.dataIda || !dados.iataOrigem || !dados.iataDestino) return obterLinkGenerico(dados.programa);
  
  const DATE_HELPERS = {
    us: (d) => Utilities.formatDate(d, Session.getScriptTimeZone(), "MM/dd/yyyy"),
    iso: (d) => Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    smiles: (d) => d.getTime(),
    latamSuffix: "T12:00:00.000Z"
  };
  
  const o = dados.iataOrigem; const d = dados.iataDestino;
  const ida = dados.dataIda; const volta = dados.dataVolta; 
  const isOneWay = !dados.dataVolta;
  const prog = dados.programa.toUpperCase();

  try {
    if (prog.includes("AZUL")) {
       const leg1 = `c[0].ds=${o}&c[0].std=${DATE_HELPERS.us(ida)}&c[0].as=${d}`;
       const leg2 = isOneWay ? "" : `&c[1].ds=${d}&c[1].std=${DATE_HELPERS.us(volta)}&c[1].as=${o}`;
       return `https://www.voeazul.com.br/br/pt/home/selecao-voo?${leg1}${leg2}&p[0].t=ADT&p[0].c=1&p[0].cp=false&f.dl=3&f.dr=3&cc=PTS`;
    }
    if (prog.includes("SMILES")) {
       const trip = isOneWay ? "1" : "2";
       const dates = `&departureDate=${DATE_HELPERS.smiles(ida)}` + (isOneWay ? "" : `&returnDate=${DATE_HELPERS.smiles(volta)}`);
       return `https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ALL&children=0&infants=0&searchType=g3&segments=1&originAirportIsAny=true&destinAirportIsAny=true&novo-resultado-voos=true${dates}&tripType=${trip}&originAirport=${o}&destinationAirport=${d}`;
    }
    if (prog.includes("LATAM")) {
       const base = `https://www.latamairlines.com/br/pt/oferta-voos?origin=${o}&destination=${d}&adt=1&chd=0&inf=0&cabin=Economy&sort=PRICE%2Casc`;
       const dates = `&outbound=${DATE_HELPERS.iso(ida)}${DATE_HELPERS.latamSuffix}` + (isOneWay ? "" : `&inbound=${DATE_HELPERS.iso(volta)}${DATE_HELPERS.latamSuffix}`);
       const trip = isOneWay ? "&trip=OW" : "&trip=RT";
       return `${base}${dates}${trip}&redemption=true`;
    }
    if (prog.includes("IBERIA")) return `https://www.iberia.com/br/`;
    if (prog.includes("TAP")) return `https://www.flytap.com/pt-br/reservar-voos`;
    if (prog === "AZUL PELO MUNDO")  return `https://interline.tudoazul.com.br/`; // Link base para emissões parceiras


  } catch(e) {}
  
  return obterLinkGenerico(dados.programa);
}

/**
 * Função Principal: Conecta na API externa e retorna o link curto.
 * ATUALIZAÇÃO: Usa lógica de contador sequencial e fallback seguro.
 */
function criarLinkCurto(linkOriginal, nomeBaseOuSlug) {

  // 1. VALIDAÇÃO BÁSICA
  // Se não tiver link ou já for encurtado, devolve o original e encerra.
  if (!linkOriginal || linkOriginal.trim() === "" || linkOriginal.includes("familha.suportvip.com")) {
    return linkOriginal;
  }

  // 2. DEFINIÇÃO DO SLUG
  var slugFinal = nomeBaseOuSlug;
  
  // Se não tiver hífen OU for curto, entendemos que é um NOME BASE e geramos a sequência.
  if (!slugFinal || slugFinal.indexOf('-') === -1 || slugFinal.length < 10) {
      // Usa a nova função geradora robusta
      slugFinal = gerarIdentificadorUnicoDiario(slugFinal || "oferta"); 
  }

  // 3. MONTAGEM DA REQUISIÇÃO
  var payload = { 
    'action': 'fami_criar', 
    'chave': controlAcess.SENHA_ENCURTADOR, 
    'slug': slugFinal, 
    'link': linkOriginal 
  };

  var options = { 
    'method': 'post', 
    'payload': payload, 
    'muteHttpExceptions': true 
  };

  // 4. CHAMADA DE REDE COM FALLBACK
  try {
    // Pequena pausa (Jitter) para evitar flood na API
    Utilities.sleep(Math.floor(Math.random() * 100) + 50);
    
    var response = UrlFetchApp.fetch(controlAcess.URL_ENCURTADOR, options);
    var json = JSON.parse(response.getContentText());

    if (json.success) { 
      // SUCESSO: Remove barras invertidas e retorna link curto
      return json.data.link_final.replace(/\\\//g, "/");
    } else { 
      // ERRO DA API (Ex: Slug duplicado): Loga e devolve o ORIGINAL
      console.warn("⚠️ API Encurtador recusou: " + json.data + " | Usando link original.");
      return linkOriginal; 
    }

  } catch (e) {
    // ERRO DE CONEXÃO: Loga e devolve o ORIGINAL
    console.error("❌ Falha crítica no encurtador: " + e.toString());
    return linkOriginal;
  }
}

/**
 * Gera um slug único sequencial (Ex: promocao-livelo-250101-1).
 * Usa LockService para evitar duplicidade se dois bots rodarem juntos.
 */
function gerarIdentificadorUnicoDiario(nomeBase) {
  // 1. LOCKSERVICE (Sinal de Trânsito)
  var lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); // Espera até 10s por exclusividade
  } catch (e) {
    // Se estourar o tempo, usa timestamp simples para não travar
    console.error("[LOCK TIMEOUT] Usando fallback de data.");
    return nomeBase + "-" + new Date().getTime(); 
  }

  try {
    // 2. LÓGICA DE INCREMENTO
    var props = PropertiesService.getScriptProperties();
    var hoje = new Date();
    
    // Formata DDMMAAAA
    var dia = ("0" + hoje.getDate()).slice(-2);
    var mes = ("0" + (hoje.getMonth() + 1)).slice(-2);
    var ano = hoje.getFullYear();
    var dataFormatada = dia + mes + ano;

    var ultimaData = props.getProperty("ULTIMA_DATA");
    var contador = Number(props.getProperty("CONTADOR_DIARIO")) || 0;

    if (ultimaData !== dataFormatada) {
      contador = 1; // Virou o dia, reseta
      props.setProperty("ULTIMA_DATA", dataFormatada);
    } else {
      contador = contador + 1; // Mesmo dia, incrementa
    }
    
    props.setProperty("CONTADOR_DIARIO", contador.toString());

    // 3. LIMPEZA DO NOME
    var nomeLimpo = nomeBase.toString().toLowerCase()
      .replace(/\s+/g, '-')       
      .replace(/[^a-z0-9\-]/g, '');

    // Retorna slug: latam-10022026-1
    return nomeLimpo + "-" + dataFormatada + "-" + contador;

  } catch (erro) {
    console.error("Erro ao gerar slug sequencial: " + erro.message);
    return nomeBase + "-" + new Date().getTime(); // Fallback final
  } finally {
    lock.releaseLock(); // Solta a trava
  }
}

function salvarNaPlanilha(texto, id, linkUrl) {
  try {
    const sheet = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM).getSheetByName(aba.ALERTAS);
    let programa = "OUTROS";
    const t = texto.toUpperCase();
    
    // Identificação do Programa
    if (t.includes("LATAM")) programa = "LATAM";
    else if (t.includes("SMILES")) programa = "SMILES";
    else if (t.includes("AZUL")) programa = "AZUL";
    
    // Fallback de Link
    if (!linkUrl) { 
      const m = texto.match(/https?:\/\/[^\s]+/); 
      if(m) linkUrl = m[0]; 
    }

// =================================================================
    // 1. EXTRAÇÃO DE METADADOS PARA A COLUNA G (Para o App) - VERSÃO BLINDADA
    // =================================================================
    let trecho = "N/A";
    let dataIda = "N/A";
    let dataVolta = "N/A";
    let milhas = "N/A";
    let valorFabricado = "N/A";
    let valorBalcao = "N/A";
    let valorEmissao = "N/A";
    let detalhes = ""; // <-- NOVA VARIÁVEL PARA O APP

    // Extrair Trecho (Ex: Natal ✈️ Recife)
    const matchTrecho = texto.match(/\*?([^*]+)\*?\s*✈️\s*\*?([^*]+)\*?/);
    if (matchTrecho) {
      // Forçamos o UPPERCASE em cada parte do trecho individualmente
      const cidadeOrigem = matchTrecho[1].trim().toUpperCase();
      const cidadeDestino = matchTrecho[2].trim().toUpperCase();
      trecho = `${cidadeOrigem} - ${cidadeDestino}`;
    }

    // Extrair Milhas
    const matchMilhas = texto.match(/Ida:.*?\s*\*?([\d.,]+)\*?\s*(?:milhas|pontos|avios)/i);
    if (matchMilhas) milhas = matchMilhas[1];

    // =================================================================
    // DATAS
    // =================================================================
    const matchIda = texto.match(/Ida:\s*\*?(\d{2}\/\d{2})/i);
    if (matchIda) dataIda = matchIda[1];

    const matchVolta = texto.match(/Volta:\s*\*?(\d{2}\/\d{2})/i);
    if (matchVolta) dataVolta = matchVolta[1];

   // =================================================================
    // DATAS FALLBACK: Se não achou, pega o primeiro dia nas Disponibilidades
    // =================================================================
    if (dataIda === "N/A") {
      const blocoIda = texto.match(/Disponibilidades\s*-\s*IDA[\s\S]*?(?=\n\n|\n`|$)/i);
      if (blocoIda) {
        // Nova Regex blindada: Aceita asterisco antes ou depois dos dois pontos (:)
        const matchDataIda = blocoIda[0].match(/\*?([a-zA-ZçÇ]+)\*?\s*:\s*\*?\s*(\d{1,2})/);
        if (matchDataIda) dataIda = `${matchDataIda[2]}/${matchDataIda[1]}`;
      }
    }

    if (dataVolta === "N/A") {
      const blocoVolta = texto.match(/Disponibilidades\s*-\s*VOLTA[\s\S]*?(?=\n\n|\n`|$)/i);
      if (blocoVolta) {
        // Nova Regex blindada
        const matchDataVolta = blocoVolta[0].match(/\*?([a-zA-ZçÇ]+)\*?\s*:\s*\*?\s*(\d{1,2})/);
        if (matchDataVolta) dataVolta = `${matchDataVolta[2]}/${matchDataVolta[1]}`;
      }
    }

    // Extrair Valores Financeiros
    const matchFabricado = texto.match(/Fabricado[\s:*]*(R\$\s*[\d.,]+)/i);
    if (matchFabricado) valorFabricado = matchFabricado[1];

    const matchBalcao = texto.match(/Balcão[\s:*]*(R\$\s*[\d.,]+)/i);
    if (matchBalcao) valorBalcao = matchBalcao[1];

    const matchValor = texto.match(/Emitindo com a FãMilhas.*?(R\$\s*[\d.,]+)/i);
    if (matchValor) valorEmissao = matchValor[1];

    // =================================================================
    // EXTRATOR DO BLOCO DE DETALHES (Disponibilidades + Aviso)
    // =================================================================
    // Captura tudo a partir de "Disponibilidades - IDA" até antes de "Acesse a Oferta" ou "📲"
    const matchDetalhes = texto.match(/(Disponibilidades\s*-\s*IDA[\s\S]*?)(?=\n*📲|\n*Acesse a Oferta|$)/i);
    if (matchDetalhes) {
      // Remove crases, asteriscos e underlines da formatação do WhatsApp
      detalhes = matchDetalhes[1].replace(/[`*_]/g, "").trim();
    }

// 🚀 Geração de ID Semântico para o Teste de Stress
// Exemplo gerado: 20260226143400_SMILES_SALVADOR-PARIS
const timestamp = Utilities.formatDate(new Date(), "GMT-3", "yyyyMMddHHmmssSSS");
const programaLimpo = (programa || "OUTROS").toUpperCase().replace(/\s+/g, '');
const trechoLimpo = (trecho || "N/A").toUpperCase().replace(/\s+/g, '').replace("-", "_");

const idApp = `${timestamp}_${programaLimpo}_${trechoLimpo}`;
    // Monta o objeto JSON com os metadados
    const metadadosJson = JSON.stringify({
      id_app: idApp,
      trecho: trecho,
      data_ida: dataIda,
      data_volta: dataVolta,
      milhas: milhas,
      valor_fabricado: valorFabricado,
      valor_balcao: valorBalcao,
      valor_emissao: valorEmissao,
      detalhes: detalhes // <-- INSERIDO NO JSON

    });
    
    // =================================================================
    // 2. INSERÇÃO NO TOPO (LINHA 2) DA PLANILHA
    // =================================================================
    
    // Insere uma nova linha logo abaixo do cabeçalho
    sheet.insertRowBefore(2);
    
    // Prepara o array de dados para as colunas A até G
    // A: Mensagem | B: Programa | C: Data | D: ID | E: Link | F: Vazio | G: Metadados
    const dadosRow = [[texto, programa, new Date(), id, linkUrl, "", metadadosJson]];
    
    // Grava os dados na nova linha 2
    sheet.getRange(2, 1, 1, dadosRow[0].length).setValues(dadosRow);
    
    // =================================================================
    // 3. FORMATAÇÃO DA NOVA LINHA
    // =================================================================
    
    // Alinha ao meio e ativa a quebra de texto (exceto para colunas de Link e JSON)
    sheet.getRange(2, 1, 1, 4).setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(2, 5, 1, 3).setVerticalAlignment("middle").setWrap(false); // Colunas E, F e G sem wrap

  } catch(e) {
    console.error("Erro ao salvar na planilha:", e);
  }
}

/**
 * 🧹 MANUTENÇÃO: Limpa as linhas mais antigas da aba ALERTAS
 * Deve ser configurada para rodar diariamente via Acionador (Trigger).
 */
function limparAbaAlertasDiariamente() {
  try {
    const limite = configGeral.LIMITE_LINHAS_ALERTAS || 1000;
    const qtdExcluir = configGeral.QTD_EXCLUIR_ALERTAS || 400;
    
    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const sheet = ss.getSheetByName(aba.ALERTAS);
    
    if (!sheet) return console.error("Aba ALERTAS não encontrada para limpeza.");
    
    const ultimaLinha = sheet.getLastRow();
    
    // Verifica se a quantidade de linhas ultrapassou o limite configurado
    if (ultimaLinha > limite) {
      
      // Calcula a linha inicial de baixo para cima
      let linhaInicio = ultimaLinha - qtdExcluir + 1;
      let linhasParaExcluir = qtdExcluir;
      
      // Trava de segurança: Garante que nunca exclua o cabeçalho (Linha 1)
      if (linhaInicio <= 1) {
        linhaInicio = 2;
        linhasParaExcluir = ultimaLinha - 1; // Apaga tudo, menos o cabeçalho
      }
      
      // Exclui as linhas em lote (muito mais rápido)
      sheet.deleteRows(linhaInicio, linhasParaExcluir);
      console.log(`🧹 Limpeza Automática: ${linhasParaExcluir} alertas antigos foram excluídos.`);
      
    } else {
      console.log(`✅ Aba ALERTAS dentro do limite seguro (${ultimaLinha}/${limite} linhas).`);
    }
    
  } catch (e) {
    console.error("🔥 Erro na limpeza da aba ALERTAS:", e.message);
  }
}

// --- 6. HELPERS ---

function normalizarDinheiro(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
     if (!val.trim()) return 0;
     let limpo = val.replace(/[^\d,-]/g, '').replace(',', '.');
     let num = parseFloat(limpo);
     return isNaN(num) ? 0 : num;
  }
  return 0;
}

function converterStringParaData(str) {
  if (!str) return null;
  const p = str.split('/');
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0); 

  const dia = parseInt(p[0]);
  const mes = parseInt(p[1]) - 1; 
  let ano = hoje.getFullYear();

  let dataFinal = new Date(ano, mes, dia);

  // 🔴 CORREÇÃO CRÍTICA (Data Passada = Ano que Vem)
  if (dataFinal < hoje) {
    dataFinal.setFullYear(ano + 1);
  }

  return dataFinal;
}

function limparNome(s) { 
  if (!s) return null;
  let t = s;

  // 1. REMOÇÃO POR LISTA BRANCA (A Solução Definitiva)
  // Mantém apenas: Letras (a-z), Acentos (\u00C0-\u00FF), Números, Espaços e Hífen.
  // Tudo que for emoji, bandeira, losango () ou símbolo estranho será deletado.
  t = t.replace(/[^\w\s\u00C0-\u00FF\-]/g, "");

  // 2. LIMPEZA FINAL
  // Remove espaços duplos que sobraram após apagar os emojis
  return t.replace(/\s+/g, " ").trim().toUpperCase(); 
}

/**
 * Limpa o corpo da mensagem removendo lixo e padronizando formatos.
 * CORREÇÃO: Remoção agressiva da frase "Ei, cuida, visse!" antes do processamento.
 */
/**
 * Limpa o corpo da mensagem removendo lixo, links soltos e ajustando espaços.
 */
function limparCorpoOferta(texto) {
  // 1. LIMPEZA INICIAL
  let textoBase = texto;
  textoBase = textoBase.replace(/➡/g, "🛫 Ida:"); 
  textoBase = textoBase.replace(/⬅/g, "🛬 Volta:");
  
  // Remove frases indesejadas antes de qualquer processamento
  textoBase = textoBase.replace(/.*acabar em dois palitos.*/gi, "");
  textoBase = textoBase.replace(/.*Ei, cuida, visse.*/gi, "");
  
  // Corrige milhar com vírgula
  textoBase = textoBase.replace(/(\d{1,3}),(\d{3})\s*(milhas|pontos|avios)/gi, "$1.$2 $3");

  const linhas = textoBase.split('\n');
  let linhasFiltradas = [];
  
  for (let i = 0; i < linhas.length; i++) {
    let l = linhas[i].trim();
    
    // Pula linhas vazias
    if (l === "") continue;
    
    // Pula cabeçalhos de cidade (já extraímos)
    if (l.includes("✈") && (l.includes("🚨") || l.includes("🇧🇷") || l.includes("➡") || l.includes("🛫") || l.includes("LONDRINA") || l.includes("SÃO PAULO"))) continue; 

    // Pula metadados inúteis
    if (l.match(/Atendente|Companhia:|Programa de Milhas:|Origem:|Destino:|Programa:/i)) continue;
    if (l.match(/\[\d{2}\/\d{2}\/\d{4}/) || l.includes("AleMilhas") || l.includes("Encaminhada")) continue;

    // --- NOVO: Remove linhas que são apenas LINKS (pois o bot já gera o botão) ---
    if (l.startsWith("http://") || l.startsWith("https://")) continue;


    
    if (BLACKLIST_PROPAGANDAS.some(termo => l.includes(termo))) continue;
    
    // Remove preços soltos
    if (l.match(/^[💰💎].*R\$/) || l.match(/^R\$\s*\d+/)) continue;

    // Pontos de parada
    if (l.includes("Atalho para emissão")) break;
    if (l.includes("Grupo de Emissões")) break;
    if (l.includes("⚠") && l.includes("valores informados")) break;
    if (l.includes("Acesse a Oferta")) break; 

    linhasFiltradas.push(linhas[i]);
  }
  
  // Junta tudo
  let textoLimpo = linhasFiltradas.join('\n').trim();
  
  // --- CORREÇÃO DE ESPAÇOS FINAIS ---
  // Garante que não tenha buracos gigantes (troca 3 ou mais enters por 2)
  textoLimpo = textoLimpo.replace(/\n{3,}/g, "\n\n");

  return transformarDatasParaLayoutVIP(textoLimpo);
}

function transformarDatasParaLayoutVIP(texto) {
  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  function processarLinha(linha) {
    const regexData = /(\d{2})\/(\d{2})\/(\d{4})/g;
    let match;
    const grupos = {};
    while ((match = regexData.exec(linha)) !== null) {
      const dia = parseInt(match[1]); 
      const mesIndex = parseInt(match[2]) - 1;
      const mesNome = mesesNomes[mesIndex];
      if (!grupos[mesNome]) grupos[mesNome] = [];
      if (!grupos[mesNome].includes(dia)) grupos[mesNome].push(dia);
    }
    return grupos;
  }

  // ✨ MONTAGEM DO BLOCO (Dark Mode Limpo)
  function montarBloco(titulo, grupos) {
    if (Object.keys(grupos).length === 0) return "";
    
    // Formato: ```TITULO``` (sem espaços dentro para garantir Dark Mode)
    // Começa sem \n pois vamos controlar o espaçamento fora da função
    let bloco = `\`\`\`${titulo}\`\`\`\n`; 
    
    for (const [mes, dias] of Object.entries(grupos)) {
      dias.sort((a, b) => a - b); 
      bloco += `*${mes}:* ${dias.join(', ')}\n`;
    }
    return bloco; 
  }

  const regexLinhaIda = /(?:🛫|➡|Ida).*?(\d{2}\/\d{2}\/\d{4}.*)/i;
  const regexLinhaVolta = /(?:🛬|⬅|Volta|Retorno).*?(\d{2}\/\d{2}\/\d{4}.*)/i;

  const matchIda = texto.match(regexLinhaIda);
  const matchVolta = texto.match(regexLinhaVolta);

  let novoBlocoDatas = "";
  
  // 1. Adiciona IDA (Com 2 quebras de linha antes para afastar do texto superior)
  if (matchIda) {
    novoBlocoDatas += "\n\n" + montarBloco("Disponibilidades - IDA", processarLinha(matchIda[0]));
  }
  
  // 2. Adiciona VOLTA (Com 2 quebras de linha antes para afastar da IDA)
  if (matchVolta) {
    // Isso garante: Meses IDA -> Linha Vazia -> Cabeçalho Volta
    novoBlocoDatas += "\n" + montarBloco("Disponibilidades - VOLTA", processarLinha(matchVolta[0]));
  }

  if (!novoBlocoDatas) return texto;

  let textoFinal = texto;
  // Limpa cabeçalhos antigos e linhas de data originais
  textoFinal = textoFinal.replace(/🗓️.*Datas/i, "").replace(/Datas/i, "");
  
  if (matchIda) textoFinal = textoFinal.replace(matchIda[0], "");
  if (matchVolta) textoFinal = textoFinal.replace(matchVolta[0], "");
  
  // Remove buracos excessivos criados pela limpeza, mas preserva estrutura
  // (Evita juntar tudo num bloco só)
  textoFinal = textoFinal.replace(/\n{4,}/g, "\n\n"); 

  return textoFinal + novoBlocoDatas;
}

function verificarMensagemLixo(texto) {
  const t = texto.toLowerCase();
  if (BLACKLIST_MSG_CAPTURA.some(p => t.includes(p))) return "Palavra proibida";
  
  return PALAVRA_CHAVE_CAPTURA.some(termo => t.includes(termo)) ? null : "Sem termos de oferta";
}

function detectingProgramaSimples(t) {
   const up = (t || "").toUpperCase();
   
   // --- NOVA REGRA AZUL PELO MUNDO ---
   if (up.includes("AZUL")) {
     const parceirosInterline = ["TURKISH", "ROYAL AIR MAROC", "AIR CANADÁ", "AIR CANADA"];
     if (parceirosInterline.some(p => up.includes(p))) {
       return "AZUL PELO MUNDO";
     }
     return "AZUL";
   }
   // ----------------------------------

   if(up.includes("LATAM")) return "LATAM";
   if(up.includes("SMILES") || up.includes("GOL")) return "SMILES";
   if(up.includes("IBERIA") || up.includes("IBÉRIA") || up.includes("AVIOS")) return "IBERIA";
   if(up.includes("TAP")) return "TAP";
   if(up.includes("AADVANTAGE") || up.includes("AMERICAN")) return "AADVANTAGE";
   return "OUTROS";
}

function obterLinkGenerico(prog) {
   if (!prog) return "https://familha.suportvip.com";
   const p = prog.toUpperCase();
   if (p.includes("LATAM")) return "https://www.latamairlines.com/br/pt";
   if (p.includes("SMILES")) return "https://www.smiles.com.br";
   if (p.includes("AZUL")) return "https://www.voeazul.com.br";
   if (p.includes("IBERIA")) return "https://www.iberia.com/br/";
   if (p.includes("TAP")) return "https://www.flytap.com/pt-br";
   return "https://familha.suportvip.com"; 
}