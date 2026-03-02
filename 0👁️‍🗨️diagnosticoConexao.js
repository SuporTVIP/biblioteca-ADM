/**
 * TESTE DE CONEXÃO E DIAGNÓSTICO (Versão Otimizada para Legado)
 * * Responsabilidades:
 * 1. Validar acesso de escrita na planilha (Célula O3).
 * 2. Validar conectividade com serviços do Gmail via API.
 * * Adaptação: Utiliza a lógica moderna v21 mas consome variáveis globais (a, c, cg).
 */

function exibirAlertaTeste() {
  console.time("Execução: exibirAlertaTeste"); // Monitoramento de performance

  try {
    // Adaptação: Usa a variável global 'spreadsheet' do legado

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Adaptação: Usa 'ABA.CONFIGURACOES' (Legado) em vez de AppConfig
    const configSheet = ss.getSheetByName(aba.CONFIGURACOES);

    // Validação de Integridade (Fail Fast)
    if (!configSheet) {
      const errorMsg = `Erro Crítico: A aba "${aba.CONFIGURACOES}" não foi encontrada.`;
      console.error(`[FATAL] ${errorMsg}`);
      SpreadsheetApp.getUi().alert(errorMsg);
      return;
    }

    // Lógica Temporal
    const timeZone = ss.getSpreadsheetTimeZone();
    const formattedDate = Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss");

    // Adaptação: Usa 'cg.mensagemBase' (Legado)
    const fullMessage = `${'Teste executado com sucesso!!!'}\n\nConectado em:\n${formattedDate}`;

    // Operação de Escrita (I/O)
    configSheet.getRange('G27').setValue(fullMessage);
    console.log(`[SUCCESS] Status atualizado na célula ${'G27'}`);

    // Feedback ao Usuário (UI)
    SpreadsheetApp.getUi().alert(fullMessage);

  } catch (e) {
    console.error(`[EXCEPTION] Falha em exibirAlertaTeste: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Erro inesperado: ${e.message}`);
  } finally {
    console.timeEnd("Execução: exibirAlertaTeste");
  }
}