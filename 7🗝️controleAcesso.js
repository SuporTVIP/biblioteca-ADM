/**
 * Função para renovar o vencimento adicionando 1 mês à data existente.
 */
function renovarVencimento() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  // 1. Verificações de Segurança
  // Verifica se estamos na aba correta para evitar erros em outras planilhas
  if (sheet.getName() !== aba.CONTROLE_ACESSO) {
    SpreadsheetApp.getUi().alert("⚠️ Atenção: Este botão só funciona na aba 'ALERTAS'.");
    return;
  }

  var range = sheet.getActiveRange();
  var row = range.getRow();
  
  // Ignora o cabeçalho (assumindo que a linha 1 é cabeçalho)
  if (row === 1) {
    SpreadsheetApp.getUi().alert("⚠️ Por favor, selecione a linha de um usuário, não o cabeçalho.");
    return;
  }

  // 2. Captura a data atual na Coluna F (Índice 6)
  // getRange(linha, coluna) -> Coluna F é a 6ª coluna
  var cellData = sheet.getRange(row, 6); 
  var dataAtual = new Date(cellData.getValue());

  // Verifica se existe uma data válida na célula
  if (isNaN(dataAtual.getTime())) {
    // Se a célula estiver vazia ou com data inválida, define a data de HOJE + 1 Mês?
    // Ou avisa o erro. Aqui vou optar por avisar o erro para evitar datas erradas.
    SpreadsheetApp.getUi().alert("❌ Não há uma data válida na coluna F desta linha.");
    return;
  }

  // 3. Adiciona 1 mês à data
  // O JavaScript trata automaticamente viradas de ano (ex: Dezembro -> Janeiro)
  dataAtual.setMonth(dataAtual.getMonth() + 1);

  // 4. Salva a nova data na célula e formata
  cellData.setValue(dataAtual);
  
  // Opcional: Formatar para garantir padrão visual (Dia/Mês/Ano)
  cellData.setNumberFormat("dd/mm/yyyy");

  // 5. Feedback visual (Toast) no canto inferior direito
  ss.toast("Vencimento renovado com sucesso!", "✅ Concluído", 3);
}