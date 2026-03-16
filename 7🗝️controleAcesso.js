/**
 * Função para renovar o vencimento adicionando 1 mês à data existente.
 * Usa mapeamento dinâmico para encontrar a coluna "VENCIMENTO".
 */
function renovarVencimento() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  
  // 1. Verificações de Segurança
  // Corrigido: Agora o alerta condiz com a aba de Controle de Acesso
  if (sheet.getName() !== aba.CONTROLE_ACESSO) {
    SpreadsheetApp.getUi().alert("⚠️ Atenção: Este botão só funciona na aba '" + aba.CONTROLE_ACESSO + "'.");
    return;
  }

  const range = sheet.getActiveRange();
  const row = range.getRow();
  
  if (row === 1) {
    SpreadsheetApp.getUi().alert("⚠️ Por favor, selecione a linha de um usuário, não o cabeçalho.");
    return;
  }

  // 2. MAPEAMENTO DINÂMICO DE CABEÇALHOS
  // Buscamos os nomes definidos no nosso dicionário HEADERS_ACESSO
  const cabecalhos = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colVencimento = cabecalhos.indexOf(COLUNAS_CONTROLE_ACESSO.VENCIMENTO) + 1;

  // Verificação: Se o cabeçalho mudou de nome ou sumiu
  if (colVencimento === 0) {
    SpreadsheetApp.getUi().alert("❌ Erro: Coluna '" + COLUNAS_CONTROLE_ACESSO.VENCIMENTO + "' não encontrada.");
    return;
  }

  // 3. Captura a data na célula correta (Independente da posição da coluna)
  const cellData = sheet.getRange(row, colVencimento); 
  let dataAtual = cellData.getValue();

  // Se a célula estiver vazia, usamos a data de hoje como base
  if (!dataAtual || isNaN(new Date(dataAtual).getTime())) {
    const ui = SpreadsheetApp.getUi();
    const resposta = ui.alert("Data inválida", "Não encontramos uma data. Deseja iniciar o vencimento a partir de HOJE?", ui.ButtonSet.YES_NO);
    
    if (resposta == ui.Button.YES) {
      dataAtual = new Date();
    } else {
      return;
    }
  } else {
    dataAtual = new Date(dataAtual);
  }

  // 4. Adiciona 1 mês à data
  dataAtual.setMonth(dataAtual.getMonth() + 1);

  // 5. Salva e Formata
  cellData.setValue(dataAtual);
  cellData.setNumberFormat("dd/mm/yyyy");

  // 6. Feedback visual
  ss.toast("Vencimento de " + sheet.getRange(row, 1).getValue() + " renovado!", "✅ Sucesso", 3);
}