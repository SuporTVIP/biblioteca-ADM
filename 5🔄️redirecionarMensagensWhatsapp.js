// =================================================================
// 2. CONTROLADOR WHATSAPP (wppApi.gs) - VERSÃO FINAL LIMPA 🧹
// =================================================================

function processarWebhookWPP(data, raw) {
  try {
    // ============================================================
    // 🛡️ TRAVA ANTI-LOOP (BLINDAGEM NÍVEL SÊNIOR)
    // ============================================================
    // Verifica recursivamente se a mensagem foi enviada pelo próprio bot.
    // O Pragmatic Programmer sugere: "Não assuma, prove".
    
    const ehAutoEnvio = (
      data.fromMe === true || 
      data.id?.fromMe === true ||
      data.key?.fromMe === true || 
      data.message?.key?.fromMe === true ||
      data.message?.fromMe === true ||
      // Verifica se o ID do autor bate com o bot (caso extremo)
      (data.author && data.author.includes(configGeral.ID_GRUPO_VIP_DESTINO.split('@')[0])) 
    );

    if (ehAutoEnvio) {
      // Retorna sucesso para o WPP parar de mandar, mas o script para aqui.
      return ContentService.createTextOutput("Ignorado: Auto-envio (Blindado)");
    }

    const possiveisIds = [data.chatId, data.from, data.to, data.id?.remote];
    
    // Verifica se veio de um grupo VIP (Destino) para bloquear
    const ehVip = GRUPOS_IGNORADOS.some(id => possiveisIds.includes(id));
    if (ehVip) return ContentService.createTextOutput("Bloqueado: Origem VIP");

    // Verifica se veio de um grupo Permitido (Origem)
    const idGrupo = GRUPOS_PERMITIDOS.find(id => possiveisIds.includes(id));
    if (!idGrupo) return ContentService.createTextOutput("Ignorado: Grupo desconhecido");

    // ============================================================
    // 3. EXTRAÇÃO INTELIGENTE (TEXTO vs IMAGEM)
    // ============================================================
    const tipoMsg = (data.type || data.data?.type || "chat").toLowerCase();

    // Ignora mídias inúteis (áudio, sticker, vídeo sem legenda, chamadas)
    if (['audio', 'ptt', 'sticker', 'e2e_notification', 'call_log', 'protocol'].includes(tipoMsg)) {
      return ContentService.createTextOutput("Ignorado: Mídia Pura/Sistema");
    }

    let textoBruto = "";

    // SE FOR IMAGEM/VÍDEO: Pega a legenda (caption)
    if (tipoMsg === 'image' || tipoMsg === 'video') {
       textoBruto = data.caption || data.message?.caption || "";
    } else {
       // SE FOR TEXTO: Pega o corpo
       textoBruto = data.body || data.content || data.message?.body || "";
    }

    // 🛡️ TRAVA DE LIXO BINÁRIO
    // Aumentamos o limite para 5000 para evitar falsos positivos, mas mantendo a segurança contra travamento
    if (!textoBruto || (textoBruto.length > 5000 && !textoBruto.includes(" "))) {
      return ContentService.createTextOutput("Ignorado: Texto inválido/Binário");
    }

    // 🚀 ENVIA PARA O MARKETING (O CÉREBRO)
    // Removemos a função salvarNaPlanilha daqui para não duplicar dados.
    // Quem salva é o 3🔎tratarMensagensWhatsApp.gs depois de processar tudo.
    if (typeof processarMarketingRedirecionamento === 'function') {
        processarMarketingRedirecionamento(textoBruto, idGrupo);
    } else {
        console.error("🔴 ERRO CRÍTICO: marketingBot.gs não encontrado!");
    }

    return ContentService.createTextOutput("Sucesso");

  } catch (e) {
    console.error("🔥 Erro WPP:", e);
    return ContentService.createTextOutput("Erro Interno");
  }
}
