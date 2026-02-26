/**
 * 🧹 FAXINEIRO INTELIGENTE
 * Limpa APENAS sessões WEB (WEB_...) inativas por mais de 24 horas.
 * Preserva os aplicativos de celular (APP_...) para rodarem em segundo plano.
 */
function limparDispositivosInativos() {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const abaControle = ss.getSheetByName(aba.CONTROLE_ACESSO);
  const lastRow = abaControle.getLastRow();
  
  if (lastRow < 2) return;
  
  const agora = new Date();
  const limiteInatividade = 24 * 60 * 60 * 1000 + 1; // mais de 24 horas
  
  const range = abaControle.getRange(2, 4, lastRow - 1, 7);
  const valores = range.getValues();
  
  for (let i = 0; i < valores.length; i++) {
    let slot1 = valores[i][0].toString(); // Coluna D
    let slot2 = valores[i][1].toString(); // Coluna E
    let ultimaData = valores[i][6]; // Coluna J (Último Pulso)
    
    if (ultimaData instanceof Date) {
      let tempoPassado = agora.getTime() - ultimaData.getTime();
      
      // Se passou de 24 horas...
      if (tempoPassado > limiteInatividade) {
        let rowIndex = i + 2;
        
        // 🚀 REGRA DE OURO: Só apaga se a string começar com "WEB_"
        if (slot1.startsWith("WEB_")) {
          abaControle.getRange(rowIndex, 4).clearContent(); 
          console.log("🧹 Vaga 1 (WEB) limpa na linha: " + rowIndex);
        }
        
        if (slot2.startsWith("WEB_")) {
          abaControle.getRange(rowIndex, 5).clearContent(); 
          console.log("🧹 Vaga 2 (WEB) limpa na linha: " + rowIndex);
        }
      }
    }
  }
}

/**
 * ============================================================================
 * 🛠️ DIAGNÓSTICO DE INFRAESTRUTURA DA BIBLIOTECA
 * ============================================================================
 * Objetivo: Verificar se o ambiente está pronto para versionamento e uso.
 * Baseado em: James Ferreira - Debugging and Error Handling.
 */

/**
 * Executa um check-up completo das dependências e visibilidade do manifesto.
 * @return {void}
 */
function executarDiagnosticoInfraestrutura() {
  try {
    console.log("[CHECK-UP] Iniciando diagnóstico de infraestrutura...");

    // 1. Verifica se as Variáveis Globais estão carregadas (Baseado no anexo variaveisGlobais.txt)
    if (typeof aba === 'undefined' || !aba.CONFIGURACOES) {
      throw new Error("ERRO_CONFIG: Variáveis globais não carregadas. Verifique o arquivo de constantes.");
    }
    console.log("✅ Variáveis globais detectadas.");

    // 2. Simula acesso ao Manifesto (Simulação de permissão)
    // Se esta função rodar, o escopo de autenticação básico está ativo.
    const scriptId = ScriptApp.getScriptId();
    console.log(`✅ ID do Script identificado: ${scriptId}`);
    
    // 3. Alerta de Segurança conforme Clean Code
    console.warn("[ALERTA] Certifique-se de que o GitHub Assistant não está subindo chaves privadas!");

    // Sucesso
    return {
      status: "PRONTO",
      mensagem: "Ambiente pronto para sincronização via GitHub Assistant ou CLASP."
    };

  } catch (erro) {
    console.error(`[ERRO_SISTEMA] Falha no diagnóstico: ${erro.message}`);
    // Retorno amigável para a UI do Add-on (se chamado via Cliente)
    throw new Error(`FALHA_INFRAESTRUTURA: ${erro.message}`);
  }
}

/**
 * Formata erro para exibição visual na Sidebar (Tailwind Style).
 * @param {Error} erroObjeto - O objeto de erro capturado no catch.
 * @return {string} HTML/String formatada para o log.
 */
function formatarErroParaLog(erroObjeto) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ERROR: ${erroObjeto.message} | Stack: ${erroObjeto.stack}`;
}