// =================================================================
// SISTEMA DE DISTRIBUIÇÃO EM MASSA (TRIGGER)
// =================================================================

function cron_DistribuirMensagensWpp() {
  const ssAdm = SpreadsheetApp.getActiveSpreadsheet(); 
  const abaOrigem = ssAdm.getSheetByName(aba.ALERTAS);
  
  // 1. Descobrir o que é NOVO (Ponteiro de Tempo)
  const props = PropertiesService.getScriptProperties();
  const lastSyncStr = props.getProperty('LAST_BROADCAST_SYNC');
  
  // Se nunca rodou, pega mensagens dos últimos 10 minutos
  let lastSync = lastSyncStr ? new Date(lastSyncStr) : new Date(new Date().getTime() - (10 * 60 * 1000)); 

  const lastRow = abaOrigem.getLastRow();
  if (lastRow < 2) return; 

  // Pega as últimas 20 mensagens da NOTICIAS4
  // Estrutura: [Mensagem (A), Programa (B), Data (C)]
  const rangeDados = abaOrigem.getRange(Math.max(2, lastRow - 20), 1, 20, 3).getValues();

  let mensagensParaEnviar = [];
  let maiorDataEncontrada = lastSync;

  // Filtra mensagens recentes
  for (let i = 0; i < rangeDados.length; i++) {
    const [msg, programa, dataRaw] = rangeDados[i];
    if (!dataRaw || msg === "") continue;

    const dataMsg = new Date(dataRaw);

    if (dataMsg > lastSync) {
      mensagensParaEnviar.push({ msg, programa, dataMsg });
      if (dataMsg > maiorDataEncontrada) {
        maiorDataEncontrada = dataMsg;
      }
    }
  }

  if (mensagensParaEnviar.length === 0) {
    console.log("💤 Nenhuma mensagem nova para distribuir.");
    return;
  }

  console.log(`🚀 Distribuindo ${mensagensParaEnviar.length} novas mensagens...`);

  // 2. Buscar Clientes ATIVOS na aba CONTROLE_ACESSO
  const clientesAtivos = obterIdsClientesAtivos(ssAdm);
  
  if (clientesAtivos.length === 0) {
    console.log("⚠️ Nenhum cliente ativo encontrado.");
    props.setProperty('LAST_BROADCAST_SYNC', maiorDataEncontrada.toISOString());
    return;
  }

  // 3. Loop de Entrega
  mensagensParaEnviar.forEach(msgObj => {
    
    const dataFormatada = Utilities.formatDate(msgObj.dataMsg, "America/Sao_Paulo", "dd/MM HH:mm");
    
    // Cores
    let corFundo = "#ffffff";
    if (msgObj.programa.includes("LATAM")) corFundo = "#fce8e6"; 
    if (msgObj.programa.includes("SMILES")) corFundo = "#fff3e0";
    if (msgObj.programa.includes("AZUL")) corFundo = "#e3f2fd";

    // Entrega para cada ID
    clientesAtivos.forEach(idCliente => {
      try {
        const ssCliente = SpreadsheetApp.openById(idCliente);
        let abaAlertas = ssCliente.getSheetByName(aba.ALERTAS);
        
        if (!abaAlertas) {
          abaAlertas = ssCliente.insertSheet(aba.ALERTAS);
          abaAlertas.appendRow(["Data Hora", "Programa", "Mensagem"]);
          abaAlertas.getRange("A1:C1").setFontWeight("bold").setBackground("#cccccc");
        }

        abaAlertas.insertRowBefore(2);
        const range = abaAlertas.getRange(2, 1, 1, 3);
        
        range.setValues([[dataFormatada, msgObj.programa, msgObj.msg]]);
        range.setBackground(corFundo);
        range.setVerticalAlignment("middle");
        range.setWrap(true);

      } catch (err) {
        console.warn(`Erro no ID ${idCliente}: ${err.message}`);
      }
    });
  });

  // 4. Atualiza o ponteiro
  props.setProperty('LAST_BROADCAST_SYNC', maiorDataEncontrada.toISOString());
  console.log("✅ Distribuição finalizada.");
}

// =================================================================
// HELPER: LER CLIENTES DO CONTROLE DE ACESSO
// =================================================================
function obterIdsClientesAtivos(ss) {
  // Tenta Cache Primeiro (Otimização)
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get("CACHE_CLIENTES_ATIVOS");
  if (cachedData) return JSON.parse(cachedData);

  const abaControle = ss.getSheetByName(aba.CONTROLE_ACESSO);
  if (!abaControle) return [];

  const lastRow = abaControle.getLastRow();
  if (lastRow < 2) return [];

  // Pega colunas F (Vencimento), G (Status), H (ID Planilha)
  // Indices base 0 a partir da coluna A: F=5, G=6, H=7
  // Mas vamos pegar o range a partir da linha 2, coluna 1 até H
  const dados = abaControle.getRange(2, 1, lastRow - 1, 8).getValues();
  
  let idsValidos = [];
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  dados.forEach(linha => {
    const vencimento = linha[5] ? new Date(linha[5]) : null; 
    const status = linha[6];      
    const idPlanilha = linha[7]; 

    if (status === "ATIVO" && idPlanilha && idPlanilha.length > 10) {
      if (!vencimento || vencimento >= hoje) {
        idsValidos.push(idPlanilha);
      }
    }
  });

  // Salva no cache por 10 minutos para não ler a planilha toda hora
  if (idsValidos.length > 0) {
    cache.put("CACHE_CLIENTES_ATIVOS", JSON.stringify(idsValidos), 600);
  }

  return idsValidos;
}