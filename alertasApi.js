// =======================================================
// BUSCADOR DE ALERTAS (Corrigido para Coluna F)
// =======================================================
function buscarAlertasDelta(lastSyncIso) {
  const sheet = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM).getSheetByName(aba.ALERTAS);
  const data = sheet.getDataRange().getValues();
  const novos = [];
  
  // Converte a data enviada pelo Flutter em Milissegundos
  const dataCorte = new Date(lastSyncIso).getTime();

  for (let i = 1; i < data.length; i++) {
    // Converte a data da Planilha (Coluna C) em Milissegundos
    const dataLinha = new Date(data[i][2]).getTime(); 
    
    // Se a linha for mais nova que o corte, adiciona na lista
    if (dataLinha > dataCorte) {
      let metadados = {};
      try {
         metadados = data[i][6] ? JSON.parse(data[i][6]) : {};
      } catch(e) {}

      novos.push({
        mensagem: data[i][0] || "",
        programa: data[i][1] || "OUTROS",
        data: data[i][2],
        id: data[i][3] || (metadados.id_app ? metadados.id_app : "ID_" + i),
        link: data[i][4] || "",
        trecho: metadados.trecho || "N/A",
        dataIda: metadados.data_ida || "N/A",
        dataVolta: metadados.data_volta || "N/A",
        milhas: metadados.milhas || "N/A",
        valorFabricado: metadados.valor_fabricado || "N/A",
        valorEmissao: metadados.valor_emissao || "N/A",
        valorBalcao: metadados.valor_balcao || "N/A",
        detalhes: metadados.detalhes || ""
      });
    }
  }
  return novos;
}

/**
 * 🚀 DISPARADOR DE PUSH (FCM v1)
 * Percorre os tokens ativos e envia o comando de sincronização.
 */
/**
 * 🚀 DISPARADOR DE PUSH NINJA (FCM v1) - DATA ONLY
 * Percorre os tokens ativos e envia o pacote de dados oculto para o Flutter.
 */
function enviarPushParaAtivos(programa, trecho) {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const sheet = ss.getSheetByName('CONTROLE_ACESSO'); 
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  
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

  // 🚀 O NOVO PAYLOAD NINJA (SEM O BLOCO "notification")
  const payloadBase = {
    "message": {
      // 1. O TRUQUE: Manda um título na notificação, mas SEM CORPO.
      // O Android vê isso e acorda o celular imediatamente!
      "notification": {
        "title": "🚨 Radar VIP Ativado"
      },
      // 2. Os dados reais que o seu Porteiro (Flutter) vai ler
      "data": {
        "tipo": "NOVO_ALERTA",
        "action": "SYNC_ALERTS",
        "programa": programa || "Geral",
        "trecho": trecho || "Nova Oportunidade VIP!",
        "since": new Date().toISOString()
      },
      // 3. Furando o "Doze Mode" (Modo de Economia de Bateria)
      "android": {
        "priority": "HIGH",
        "notification": {
          "channel_id": "alertas_vip",
          "sound": "default" // Força o Android a se preparar para tocar som
        }
      },
      "apns": {
        "headers": { "apns-priority": "10" },
        "payload": {
          "aps": {
            "sound": "default",
            "content-available": 1
          }
        }
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
        
        // 🚀 FAXINA AUTOMÁTICA DE TOKENS INVÁLIDOS
        if (responseCode === 404 || respostaErro.includes("UNREGISTERED") || respostaErro.includes("INVALID_ARGUMENT")) {
           for (let i = 0; i < data.length; i++) {
             if (data[i][10] === fcmToken) { 
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

  console.log(`✅ Push Ninja finalizado! Entregue para ${sucessoCount} de ${tokens.length} dispositivos.`);
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