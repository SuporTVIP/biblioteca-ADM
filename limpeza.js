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
  const limiteInatividade = 3 * 60 * 60 * 1000 + 1; // mais de 12 horas
  
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