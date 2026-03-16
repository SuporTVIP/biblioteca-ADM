/**
 * 🩺 DIAGNÓSTICO DE SAÚDE DA PLANILHA
 * Verifica se todas as colunas do Dicionário estão presentes na aba CONTROLE_ACESSO.
 */
function validarColunasControleAcesso() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // 1. Abre a planilha (Usa a ativa se estiver aberta, ou puxa pelo ID global)
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const sheet = ss.getSheetByName(aba.CONTROLE_ACESSO); // ou "CONTROLE_ACESSO"
    
    if (!sheet) {
      ui.alert("❌ Erro Crítico", "A aba '" + aba.CONTROLE_ACESSO + "' não foi encontrada nesta planilha!", ui.ButtonSet.OK);
      return;
    }

    // 2. Pega os cabeçalhos da linha 1
    const cabecalhosRaw = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 3. Função de normalização (A Vacina)
    const normalizar = (texto) => {
      if (!texto) return "";
      return texto.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    };

    const cabecalhosNormalizados = cabecalhosRaw.map(normalizar);
    
    // 4. Lista para guardar as colunas que não forem encontradas
    let colunasFaltantes = [];
    let colunasLidas = [];

    // 5. Varre o nosso Dicionário comparando com a Planilha
    for (let chave in COLUNAS_CONTROLE_ACESSO) {
      let nomeEsperado = COLUNAS_CONTROLE_ACESSO[chave];
      let nomeNormalizado = normalizar(nomeEsperado);
      
      if (cabecalhosNormalizados.indexOf(nomeNormalizado) === -1) {
        // Se não achou na planilha, anota como faltante
        colunasFaltantes.push(nomeEsperado);
      } else {
        colunasLidas.push(nomeEsperado);
      }
    }

    // 6. Resultado do Diagnóstico
    if (colunasFaltantes.length === 0) {
      ui.alert(
        "✅ Diagnóstico Perfeito!", 
        "A integridade da sua planilha está 100%.\n\nTodas as " + colunasLidas.length + " colunas vitais foram mapeadas com sucesso pelo robô.", 
        ui.ButtonSet.OK
      );
    } else {
      let mensagemErro = "O robô não conseguiu encontrar a(s) seguinte(s) coluna(s) na Linha 1:\n\n";
      colunasFaltantes.forEach(col => mensagemErro += "🚨 " + col + "\n");
      mensagemErro += "\nVerifique se elas foram apagadas ou se o nome foi alterado drasticamente.";
      
      ui.alert("⚠️ Atenção Necessária", mensagemErro, ui.ButtonSet.OK);
    }

  } catch (e) {
    ui.alert("❌ Erro ao validar", e.toString(), ui.ButtonSet.OK);
  }
}