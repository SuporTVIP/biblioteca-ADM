function buscarAlertasDelta(lastSyncIso) {
  const sheet = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM).getSheetByName(aba.ALERTAS);
  const data = sheet.getDataRange().getValues();
  const novos = [];
  
  const dataCorte = new Date(lastSyncIso).getTime();

  for (let i = 1; i < data.length; i++) {
    const dataLinha = new Date(data[i][2]).getTime(); 
    
    if (dataLinha > dataCorte) {
      let metadados = {};
      try {
         metadados = data[i][6] ? JSON.parse(data[i][6]) : {};
      } catch(e) {}

      // 🚀 A MÁGICA DA BLINDAGEM DE ID ESTÁ AQUI
      const idUnico = metadados.id_app ? metadados.id_app : "SYS_" + dataLinha + "_L" + i;

      novos.push({
        id: idUnico, 
        mensagem: data[i][0] || "",
        programa: data[i][1] || "OUTROS",
        data: data[i][2],
        link: data[i][4] || "",
        link_agencia: data[i][5]|| "https://api.whatsapp.com/send?phone=5583989073178",
        taxas: metadados.taxasAereas || "N/A",
        trecho: metadados.trecho || "N/A",
        dataIda: metadados.data_ida || "N/A",
        dataVolta: metadados.data_volta || "N/A",
        milhas: metadados.milhas || "N/A",
        valorFabricado: metadados.valor_fabricado || "N/A",
        valorBalcao: metadados.valor_balcao || "N/A",
        valorEmissao: metadados.valor_emissao || "N/A",
        detalhes: metadados.detalhes || "",
        mensagemBalcao: metadados.mensagem_balcao || "N/A"
      });
    }
  }
  return novos;
}

/**
 * 🚀 DISPARADOR DE PUSH NINJA (FCM v1) - DATA ONLY
 * Percorre os tokens ativos usando Mapeamento Dinâmico e envia o pacote.
 */
function enviarPushParaAtivos(dadosPush) {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const sheet = ss.getSheetByName(aba.CONTROLE_ACESSO); 
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  // =================================================================
  // 🚀 MAPEAMENTO DINÂMICO (A Vacina contra quebras de colunas)
  // =================================================================
  const cabecalhosRaw = data[0]; // Pega a linha 1 inteira
  
  const normalizar = (texto) => {
    if (!texto) return "";
    return texto.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  };

  const cabecalhosNormalizados = cabecalhosRaw.map(normalizar);
  const buscarIdx = (nomeChave) => cabecalhosNormalizados.indexOf(normalizar(nomeChave));

  const idxStatus    = buscarIdx(COLUNAS_CONTROLE_ACESSO.STATUS);
  const idxFcmMobile = buscarIdx(COLUNAS_CONTROLE_ACESSO.FCM_MOBILE);
  const idxFcmWeb    = buscarIdx(COLUNAS_CONTROLE_ACESSO.FCM_WEB);

  // Proteção: Se alguém deletar a coluna de FCM, o robô avisa e não quebra
  if (idxStatus === -1 || idxFcmMobile === -1 || idxFcmWeb === -1) {
     console.error("❌ [PUSH] ERRO: Colunas de Status ou Tokens não encontradas no cabeçalho.");
     return;
  }

  // 🚀 O NOVO MOTOR DE DISPARO DUPLO (Mobile + Web)
  let todosTokens = [];
  let mapaTokens = {}; // Guarda a "coordenada" do token para a faxina rápida

  // Loop começa de 1 para pular o cabeçalho
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Lê usando as variáveis dinâmicas em vez de números fixos
    if (String(row[idxStatus]).trim().toUpperCase() === "ATIVO") {
      const tokenMobile = row[idxFcmMobile] ? row[idxFcmMobile].toString().trim() : "";
      const tokenWeb    = row[idxFcmWeb] ? row[idxFcmWeb].toString().trim() : "";    

      let linhaReal = i + 1; // Index 0 do array = Linha 1 da planilha

      if (tokenMobile !== "") {
        todosTokens.push(tokenMobile);
        // Salva a coordenada exata somando +1 ao index do array
        mapaTokens[tokenMobile] = { linha: linhaReal, coluna: idxFcmMobile + 1 }; 
      }
      
      if (tokenWeb !== "") {
        todosTokens.push(tokenWeb);
        mapaTokens[tokenWeb] = { linha: linhaReal, coluna: idxFcmWeb + 1 }; 
      }
    }
  }

  if (todosTokens.length === 0) {
    console.log("Nenhum FCM Token ativo encontrado para envio.");
    return;
  }

  const tokenAcesso = getAccessToken();
  if (!tokenAcesso) {
    console.error("❌ Falha ao obter token OAuth2. Abortando disparos.");
    return;
  }

  // 🚀 O VERDADEIRO PAYLOAD NINJA 100% PUSH (Tudo convertido para String)
  const payloadBase = {
    "message": {
      "data": {
        "tipo": "NOVO_ALERTA",
        "action": "SYNC_ALERTS",
        "id": String(dadosPush.idApp || `FCM_${Date.now()}`),
        "programa": String(dadosPush.programa || "Geral"),
        "trecho": String(dadosPush.trecho || "Nova Oportunidade VIP!"),
        "mensagem": String(dadosPush.texto || "").substring(0, 200), // Proteção de 4KB
        "data": new Date().toISOString(),
        "link": String(dadosPush.linkUrl || ""),
        "data_ida": String(dadosPush.dataIda || "N/A"),
        "data_volta": String(dadosPush.dataVolta || "N/A"),
        "milhas": String(dadosPush.milhas || "N/A"),
        "valor_fabricado": String(dadosPush.valorFabricado || "N/A"),
        "valor_emissao": String(dadosPush.valorEmissao || "N/A"),
        "valor_balcao": String(dadosPush.valorBalcao || "N/A"),
        "detalhes": String(dadosPush.detalhes || "").substring(0, 300), // Proteção de 4KB
        "link_agencia": String(dadosPush.linkEmissaoFamilhas || "N/A"),
        "mensagem_balcao": String(dadosPush.msgBalcao || "N/A").substring(0, 150), // Proteção de 4KB
        "taxas": String(dadosPush.taxasAereas || "N/A")
      },
      "android": { "priority": "HIGH" },
      "apns": {
        "headers": { "apns-priority": "10" },
        "payload": { "aps": { "content-available": 1 } }
      }
    }
  };

  let sucessoCount = 0;

  // Atira em todos os tokens mapeados!
  todosTokens.forEach(fcmToken => {
    try {
      payloadBase.message.token = fcmToken;
      
      const response = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/plamilhasvipaddondevsadm/messages:send', {
        'method': 'post',
        'contentType': 'application/json',
        'headers': {
          'Authorization': 'Bearer ' + tokenAcesso
        },
        'payload': JSON.stringify(payloadBase),
        'muteHttpExceptions': true
      });

      const responseCode = response.getResponseCode();
      if (responseCode === 200) {
        sucessoCount++;
      } else {
        const respostaErro = response.getContentText();
        console.error("Erro no token " + fcmToken + ". Firebase: " + respostaErro);
        
        // 🧹 Faxina Inteligente e Imediata! (Agora usando as coordenadas dinâmicas)
        if (responseCode === 404 || respostaErro.includes("UNREGISTERED") || respostaErro.includes("INVALID_ARGUMENT")) {
            const coordenada = mapaTokens[fcmToken];
            if (coordenada) {
              sheet.getRange(coordenada.linha, coordenada.coluna).setValue(''); 
              console.log(`🧹 Token morto removido da linha ${coordenada.linha}, coluna ${coordenada.coluna}`);
            }
        }
      }

    } catch (e) {
      console.error("Erro fatal ao enviar para token: " + fcmToken, e);
    }
  });

  console.log(`✅ Push Ninja finalizado! Entregue para ${sucessoCount} de ${todosTokens.length} dispositivos.`);
}

// 🚀 BUSCADOR DE AEROPORTOS (Lê a aba TAXAS_AERO)
function buscarAeroportos() {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  
  const abaAero = ss.getSheetByName(aba.TAXAS_AERO); 
  const lastRow = abaAero.getLastRow();
  
  if (lastRow < 2) return [];
  
  // Pega Coluna B (Cidade) e C (Sigla IATA)
  const range = abaAero.getRange(2, 2, lastRow - 1, 2);
  const valores = range.getValues();
  
  const listaFormatada = [];
  
  for (let i = 0; i < valores.length; i++) {
    let cidade = valores[i][0].toString().trim();
    let iata = valores[i][1].toString().trim();
    
    // Só adiciona se tiver uma sigla válida
    if (iata.length === 3) {
      listaFormatada.push(`${iata} - ${cidade}`);
    }
  }
  
  // Remove duplicatas caso existam e retorna a lista
  return [...new Set(listaFormatada)];
}

const DEBUG_MODE = true; // 🚀 A CHAVE MESTRA DO SERVIDOR

function logger(msg, type = "INFO") {
  if (!DEBUG_MODE) return;
  
  if (type === "ERROR") {
    console.error(msg);
  } else {
    console.log(msg);
  }
}