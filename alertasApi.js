// =======================================================
// BUSCADOR DE ALERTAS (Corrigido para Coluna F)
// =======================================================
function buscarAlertasDelta(lastSyncDate) {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const abaAlertas = ss.getSheetByName(aba.ALERTAS);
  
  const lastRow = abaAlertas.getLastRow();
  const startRow = Math.max(2, lastRow - 50); 
  
  if (lastRow < 2) return []; 
  
  // 🚀 LENDO DA COLUNA A ATÉ A COLUNA G (1 a 7)
  const range = abaAlertas.getRange(startRow, 1, lastRow - startRow + 1, 7);
  const valores = range.getValues();
  
  const alertasNovos = [];
  const clienteDate = new Date(lastSyncDate);

  for (let i = 0; i < valores.length; i++) {
    let row = valores[i];
    
    let rawDate = row[2]; // Coluna C (Data)
    let rowDate;
    
    if (typeof rawDate === "string" && rawDate.includes("/")) {
      let parts = rawDate.split(" ");
      let dateParts = parts[0].split("/");
      rowDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || "00:00:00"}`);
    } else {
      rowDate = new Date(rawDate);
    }
    
    if (rowDate > clienteDate) {
      alertasNovos.push({
        id: rowDate.getTime().toString(), 
        mensagem: row[0],   // Coluna A
        programa: row[1],   // Coluna B
        data: rowDate.toISOString(), // Coluna C
        link: row[4],       // Coluna E
        metadados: row[6]   // 🚀 Coluna G (O JSON do seu Regex!)
      });
    }
  }
  return alertasNovos;
}

/**
 * 🚀 DISPARADOR DE PUSH (FCM v1)
 * Percorre os tokens ativos e envia o comando de sincronização.
 */
function enviarPushParaAtivos() {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const sheet = ss.getSheetByName('CONTROLE_ACESSO'); 
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  
  // 🚀 CORREÇÃO DOS ÍNDICES BASEADO NA SUA PLANILHA:
  // row[7] é a Coluna H (STATUS)
  // row[11] é a Coluna L (FCM_TOKEN) que você acabou de criar
  const tokens = data.filter(row => row[7] === "ATIVO" && row[10] && row[10].toString().trim() !== "")
                     .map(row => row[10]);

  if (tokens.length === 0) {
    console.log("Nenhum FCM Token ativo encontrado para envio.");
    return;
  }

  // Puxa a chave do cofre UMA ÚNICA VEZ
  const tokenAcesso = getAccessToken();
  if (!tokenAcesso) {
    console.error("❌ Falha ao obter token OAuth2. Abortando disparos.");
    return;
  }

// Payload conforme a API v1 do Firebase
  const payloadBase = {
    "message": {
      "notification": {
        "title": "🚨 Radar VIP: Nova Emissão!",
        "body": "Uma nova oportunidade acaba de ser detectada."
      },
      "data": {
        "action": "SYNC_ALERTS",
        "since": new Date().toISOString()
      },
      // 🚀 FURA O BLOQUEIO DE BATERIA DO ANDROID (MODO DOZE)
      "android": {
        "priority": "HIGH"
      },
      // 🚀 PRIORIDADE PARA iOS 
      "apns": {
        "headers": { "apns-priority": "10" } 
      }
    }
  };

  let sucessoCount = 0;

  tokens.forEach(fcmToken => {
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
        
        // 🚀 FAXINA AUTOMÁTICA DE TOKENS INVÁLIDOS [cite: 194-206]
        // Se o Firebase disser que o app foi desinstalado (404 / UNREGISTERED)
        if (responseCode === 404 || respostaErro.includes("UNREGISTERED") || respostaErro.includes("INVALID_ARGUMENT")) {
           for (let i = 0; i < data.length; i++) {
             // row[10] é a Coluna K no array (índice 10)
             if (data[i][10] === fcmToken) { 
               // i + 1 porque as linhas do Sheets começam em 1
               // 11 é o número da Coluna K no Sheets
               sheet.getRange(i + 1, 11).setValue(''); 
               console.log("🧹 Token morto removido da linha " + (i + 1));
               break;
             }
           }
        }
      }

    } catch (e) {
      console.error("Erro fatal ao enviar para token: " + fcmToken, e);
    }
  });

  console.log(`✅ Push finalizado! Entregue para ${sucessoCount} de ${tokens.length} dispositivos.`);
}

// 🚀 BUSCADOR DE AEROPORTOS (Lê a aba TAXAS_AERO)
function buscarAeroportos() {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  
  // 🐛 CORREÇÃO: Variável renomeada para não conflitar com o objeto global 'aba'
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