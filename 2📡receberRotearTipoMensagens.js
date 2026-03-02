// =================================================================
// 1. ROTEADOR (routerApi.gs) - VERSÃO CORRIGIDA 🛡️
// =================================================================

function doGet(e) {
  return ContentService.createTextOutput("WPPConnect Webhook Ativo! (GET Recebido)");
}

function doPost(e) {
  try {
    // 1. Validação Básica
    if (!e || !e.postData) return ContentService.createTextOutput("Conexão OK");

    const raw = e.postData.contents;
    let data = {};
    
    // 2. Parse JSON Único (Centralizado)
    try { 
      data = JSON.parse(raw);
    } catch (errJson) {
      return ContentService.createTextOutput("Ignorado: JSON inválido");
    }

    // ============================================================
    // ROTA A: SMS GATEWAY (License Key)
    // ============================================================
    if (data.license_key) {
      // Passamos o objeto 'data' já parseado, não o evento 'e' inteiro
      return processarSincronizacaoSMS(data);
    }

    // ============================================================
    // ROTA B: TELEGRAM BRIDGE
    // ============================================================
    if(data.type === "TELEGRAM_BRIDGE"){
      if (typeof processarMarketingRedirecionamento === 'function') {
         processarMarketingRedirecionamento(data.text, "TELEGRAM");
      } else {
         console.error("🔴 CRÍTICO: 'processarMarketingRedirecionamento' não encontrada.");
      }
      return ContentService.createTextOutput(JSON.stringify({status: "recebido"}));
    }

    // ============================================================
    // ROTA C: WHATSAPP WEBHOOK
    // ============================================================
    if (data.event === "onmessage" || data.type === "message" || data.chatId || data.from) {
      return processarWebhookWPP(data, raw);
    }

    return ContentService.createTextOutput("Ignorado: Evento de Sistema");

  } catch (err) {
    console.error("🔥 ERRO ROUTER:", err);
    return ContentService.createTextOutput("Erro Router");
  }
}