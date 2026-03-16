/**
 * 🧹 FAXINEIRO INTELIGENTE (VERSÃO BLINDADA)
 */
function limparDispositivosInativos(validarTempo = false) {
  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  const abaControle = ss.getSheetByName(aba.CONTROLE_ACESSO);
  
  // 1. PEGA E LIMPA OS CABEÇALHOS (Remove espaços extras para evitar o erro que deu)
  const rangeCabecalho = abaControle.getRange(1, 1, 1, abaControle.getLastColumn());
  const cabecalhosRaw = rangeCabecalho.getValues()[0];
  const cabecalhosLimpos = cabecalhosRaw.map(h => h.toString().trim().toUpperCase());

  // 2. FUNÇÃO AUXILIAR DE BUSCA (Busca o nome ignorando espaços e acentos se necessário)
  const buscarColuna = (nome) => cabecalhosLimpos.indexOf(nome.trim().toUpperCase()) + 1;

  const col = {
    slot1:        buscarColuna(COLUNAS_CONTROLE_ACESSO.DEVICE_ID),
    slot2:        buscarColuna(COLUNAS_CONTROLE_ACESSO.DEVICE_ID_2),
    ultimoAcesso: buscarColuna(COLUNAS_CONTROLE_ACESSO.ULTIMO_ACESSO)
  };

  // 3. LOG DE DEBUG (Para você ver no console se ele achou as colunas)
  console.log(`🔍 Mapeamento: Slot1 col ${col.slot1} | Slot2 col ${col.slot2} | Data col ${col.ultimoAcesso}`);

  // Verificação de segurança: Se não achou as colunas críticas
  if (col.slot1 === 0 || col.ultimoAcesso === 0) {
    console.error("❌ Erro: Colunas necessárias não encontradas. Verifique se os nomes na planilha batem com o DIC.");
    // Opcional: listar o que ele leu para te ajudar a debugar
    console.log("Cabeçalhos lidos na planilha: " + JSON.stringify(cabecalhosLimpos));
    return;
  }

  const data = abaControle.getDataRange().getValues();
  if (data.length < 2) return;

  const agora = new Date();
  const limiteInatividade = 24 * 60 * 60 * 1000; // 24 Horas
  let totalLimpo = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowIndex = i + 1;

    let dId1 = row[col.slot1 - 1]?.toString() || "";
    let dId2 = row[col.slot2 - 1]?.toString() || "";
    let dataUltimoPulso = row[col.ultimoAcesso - 1];

    let deveLimparPorTempo = false;

    if (validarTempo) {
      if (dataUltimoPulso instanceof Date) {
        let tempoPassado = agora.getTime() - dataUltimoPulso.getTime();
        if (tempoPassado > limiteInatividade) deveLimparPorTempo = true;
      }
    } else {
      deveLimparPorTempo = true;
    }

    if (deveLimparPorTempo) {
      // REGRA: Só limpa se for WEB_
      if (dId1.startsWith("WEB_")) {
        abaControle.getRange(rowIndex, col.slot1).clearContent();
        totalLimpo++;
      }
      if (dId2.startsWith("WEB_")) {
        abaControle.getRange(rowIndex, col.slot2).clearContent();
        totalLimpo++;
      }
    }
  }

  console.log(`✅ Faxina concluída. Total de vagas WEB liberadas: ${totalLimpo}`);
}