// =================================================================
// 🌐 SUPER ROTEADOR (FãMilhasVIP App + WPPConnect + Telegram)
// =================================================================

function doGet(e) {
  try {
    // Se vier com parâmetros de ação (Rota do App)
    if (e && e.parameter && e.parameter.action) {
      const action = e.parameter.action;
      
      // ROTA APP: Baixar novos alertas
      if (action === "SYNC_ALERTS") {
        const lastSync = e.parameter.since || "2026-01-01T00:00:00.000Z";
        const novos = buscarAlertasDelta(lastSync);
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", data: novos, serverTime: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // ROTA APP: Baixar lista de aeroportos
      if (action === "SYNC_AEROPORTOS") {
        const aeroportos = buscarAeroportos();
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", data: aeroportos
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "ignored"}));
    }

    // Fallback: Se não tiver parâmetros, é só um ping de teste do WPPConnect ou navegador
    return ContentService.createTextOutput("🟢 Sistema FãMilhasVIP & WPPConnect Webhook Ativos e Operantes!");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    // 1. Validação e Parse Defensivo
    if (!e || !e.postData) return ContentService.createTextOutput("Conexão OK / Sem Dados");
    
    const raw = e.postData.contents;
    let data = {};
    
    try { 
      data = JSON.parse(raw);
    } catch (errJson) {
      data = e.parameter; // Fallback para FormUrlEncoded (Postman/Legado)
    }

    // =========================================================
    // 📱 ROTAS DO APP (FLUTTER)
    // =========================================================

    // ROTA APP 1: VERIFICAÇÃO DE DISPOSITIVO (LOGIN)
    if (data.action === "CHECK_DEVICE") {
      const fcmToken = data.fcmToken ? data.fcmToken.toString() : "";
      const fcmTokenWeb = data.fcmTokenWeb ? data.fcmTokenWeb.toString() : "";
      const resultado = verificarLicencaDispositivo(data.deviceId, data.token, data.email, fcmToken, fcmTokenWeb);
      
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ROTA APP 2: LOGOUT (REMOVER DISPOSITIVO)
    if (data.action === "REMOVE_DEVICE") {
      const resultado = removerLicencaDispositivo(data.deviceId);
      
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================
    // 📩 ROTAS DE MENSAGERIA (SMS / TELEGRAM / WHATSAPP)
    // =========================================================

    // ROTA 3: RECEBIMENTO DE SMS (App Novo ou Legado)
    if (data.action === "RECEIVE_SMS" || data.license_key) {
      // Adaptador para formato legado
      if (data.license_key) {
        data.sender = data.sender_number;
        data.message = data.sms_content;
      }
      const resultado = processarSmsVindoApp(data);
      
      // Essa função já existia nos dois arquivos, agora atende ambos!
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ROTA 4: TELEGRAM BRIDGE
    if (data.type === "TELEGRAM_BRIDGE") {
      if (typeof processarMarketingRedirecionamento === 'function') {
         processarMarketingRedirecionamento(data.text, "TELEGRAM");
      } else {
         console.error("🔴 CRÍTICO: 'processarMarketingRedirecionamento' não encontrada.");
      }
      return ContentService.createTextOutput(JSON.stringify({status: "recebido"}));
    }

    // ROTA 5: WHATSAPP WEBHOOK (WPPConnect)
    if (data.event === "onmessage" || data.type === "message" || data.chatId || data.from) {
      return processarWebhookWPP(data, raw);
    }

    // =========================================================
    // ROTA DESCONHECIDA
    // =========================================================
    return ContentService.createTextOutput(JSON.stringify({status: "ignored", reason: "Action/Evento desconhecido"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    console.error("🔥 ERRO SUPER ROUTER:", erro);
    return ContentService.createTextOutput(JSON.stringify({status: "critical_error", message: erro.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}