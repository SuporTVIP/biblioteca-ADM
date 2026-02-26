// =================================================================
// 🏪 MOTOR DO BALCÃO DE VENDAS (WEB APP)
// =================================================================

// 1. ROTA DE EXIBIÇÃO (Carrega o Formulário)
function doGet(e) {
  // Se vier com parâmetro 'venda=true', exibe a tela de venda
  if (e.parameter.venda === 'true') {
    const template = HtmlService.createTemplateFromFile('paginaVenda');
    
    // Passa os dados da URL para o HTML
    template.prog = e.parameter.prog || "Milhas";
    template.orig = e.parameter.orig || "";
    template.dest = e.parameter.dest || "";
    template.link = e.parameter.ref || "";
    
    return template.evaluate()
      .setTitle('Balcão FãMilhas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // Se não, mantém o comportamento padrão do seu Router (se houver)
  return ContentService.createTextOutput("Sistema FãMilhas Ativo.");
}

// 2. PROCESSAMENTO DO FORMULÁRIO (Recebe os dados do Vendedor)
function processarOfertaVenda(dadosForm) {
  try {
    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const sheet = ss.getSheetByName("BALCAO_OFERTAS");
    
    // Calcula total
    const qtd = Number(dadosForm.qtd);
    const vpm = Number(dadosForm.vpm.replace(",", "."));
    const total = (qtd / 1000) * vpm;
    
    // 1. Salva na Planilha
    sheet.appendRow([
      new Date(),
      dadosForm.programa,
      dadosForm.origem,
      dadosForm.destino,
      dadosForm.nome,
      dadosForm.zap, // Telefone do vendedor
      qtd,
      vpm,
      total,
      dadosForm.linkRef
    ]);
    
    // 2. Alerta no Grupo Interno (Balcão)
    const msgInterna = `💼 *NOVA OFERTA NO BALCÃO!*\n\n` +
      `👤 *Vendedor:* ${dadosForm.nome}\n` +
      `📱 *Zap:* wa.me/${dadosForm.zap.replace(/\D/g, "")}\n` +
      `✈️ *Programa:* ${dadosForm.programa}\n` +
      `🔢 *Lote:* ${qtd.toLocaleString()} milhas\n` +
      `💰 *VPM:* R$ ${vpm.toFixed(2)}\n` +
      `💵 *Custo Total:* R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n` +
      `🔗 *Referência:* ${dadosForm.linkRef}`;
      
    enviarMensagemWppConnect(configGeral.ID_GRUPO_BALCAO_INTERNO, msgInterna);
    
    return { success: true };
    
  } catch (e) {
    console.error("Erro Balcao: " + e.message);
    return { success: false, erro: e.message };
  }
}