// =================================================================
// 2. SMS API (smsApi.gs) - VERSÃO DEFINITIVA DINÂMICA 🚀
// =================================================================

function processarSmsVindoApp(data) {
  console.log("📨 [SMS API] Recebendo novo POST de SMS do aplicativo...");
  console.log("📦 Payload bruto:", JSON.stringify(data));

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    // 🚀 1. O TRATOR DE LIMPEZA NOS DADOS DO APP (Case e Spaces)
    const reqToken = String(data.license_key || data.token || "").trim().toUpperCase(); 
    const reqDeviceId = String(data.device_id || data.deviceId || "").trim(); 
    const reqEmailApp = String(data.target_email || data.email || "").trim().toLowerCase(); 
    const smsContent = String(data.sms_content || data.message || "");
    const rawNumber = String(data.sender_number || data.sender || "Desconhecido").trim();

    console.log(`🔍 [SMS API] Analisando Requisição -> Email: [${reqEmailApp}] | Token: [${reqToken}] | DeviceID: [${reqDeviceId}]`);

    if (!reqToken || !smsContent) {
      console.warn("⚠️ [SMS API] Bloqueado: Dados incompletos (Faltou token ou mensagem).");
      throw new Error("Dados incompletos.");
    }

    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const sheet = ss.getSheetByName(aba.CONTROLE_ACESSO);
    
    // =================================================================
    // 🚀 2. MAPEAMENTO DINÂMICO DE CABEÇALHOS (A Vacina)
    // =================================================================
    const cabecalhosRaw = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Função interna para limpar acentos, espaços e padronizar maiúsculas
    const normalizar = (texto) => {
      if (!texto) return "";
      return texto.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    };

    const cabecalhosNormalizados = cabecalhosRaw.map(h => normalizar(h));
    
    // Função para buscar o índice da coluna (0-based para usar no array da linha)
    const buscarIdx = (nomeChave) => cabecalhosNormalizados.indexOf(normalizar(nomeChave));

    const idxEmail      = buscarIdx(COLUNAS_CONTROLE_ACESSO.EMAIL);
    const idxSlot1      = buscarIdx(COLUNAS_CONTROLE_ACESSO.DEVICE_ID);
    const idxSlot2      = buscarIdx(COLUNAS_CONTROLE_ACESSO.DEVICE_ID_2);
    const idxToken      = buscarIdx(COLUNAS_CONTROLE_ACESSO.TOKEN);
    const idxStatus     = buscarIdx(COLUNAS_CONTROLE_ACESSO.STATUS);
    const idxIdPlanilha = buscarIdx(COLUNAS_CONTROLE_ACESSO.ID_PLANILHA);

    // Proteção extrema: Verifica se as colunas essenciais sumiram
    if (idxEmail === -1 || idxToken === -1 || idxStatus === -1 || idxIdPlanilha === -1) {
       console.error("❌ [SMS API] ERRO: Colunas vitais não encontradas no cabeçalho.");
       throw new Error("Erro interno: Falha de mapeamento de banco de dados.");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Banco de dados vazio.");

    // Pega todos os dados da linha 2 até a última coluna e linha preenchidas
    const rangeData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues(); 
    
    let userFound = false;
    let targetSheetId = "";

    // =================================================================
    // 🚀 3. VARREDURA BLINDADA
    // =================================================================
    for (let i = 0; i < rangeData.length; i++) {
      let row = rangeData[i];
      
      // O Trator de Limpeza lê as posições dinâmicas descobertas no mapeamento
      let dbEmail  = String(row[idxEmail] || "").trim().toLowerCase(); 
      let slot1    = String(row[idxSlot1] || "").trim();               
      let slot2    = String(row[idxSlot2] || "").trim();               
      let dbToken  = String(row[idxToken] || "").trim().toUpperCase(); 
      let dbStatus = String(row[idxStatus] || "").trim().toUpperCase();                
      targetSheetId = String(row[idxIdPlanilha] || "").trim();             

      // Tratamento para Token Legado no Slot2
      if (dbToken === "" && slot2 === reqToken) {
          dbToken = slot2;
      }

      // Comparação Absoluta (Spaces e Case já foram normalizados)
      if (dbToken === reqToken && dbEmail === reqEmailApp) {
        console.log(`✅ [SMS API] Cliente localizado na linha ${i + 2} da aba CONTROLE_ACESSO.`);
        
        if (dbStatus !== "ATIVO") {
          console.warn("⛔ [SMS API] Bloqueado: Status da licença não é 'ATIVO'.");
          throw new Error("Licença inativa.");
        }
        
        // Trava de DeviceID 
        if (slot1 !== reqDeviceId && slot2 !== reqDeviceId) {
          console.warn(`⛔ [SMS API] Bloqueado: O ID do aparelho que mandou o SMS (${reqDeviceId}) não bate com a planilha (Slot1: ${slot1} | Slot2: ${slot2}).`);
          throw new Error("Aparelho não autorizado.");
        }
        
        userFound = true;
        break; 
      }
    }

    if (!userFound) {
      console.error("❌ [SMS API] Falha: O Token ou E-mail não batem com nenhuma linha da planilha.");
      throw new Error(`Credenciais não encontradas. O Google leu -> Email: [${reqEmailApp}] | Token: [${reqToken}]`);
    }

    console.log(`🎯 [SMS API] ID da Planilha de Destino: '${targetSheetId}'`);

    // =================================================================
    // 4. GRAVAÇÃO NA PLANILHA DO CLIENTE
    // =================================================================
    if (targetSheetId && targetSheetId.length > 20) {
      try {
        console.log("🔄 [SMS API] Tentando abrir a planilha destino...");
        const clientSS = SpreadsheetApp.openById(targetSheetId);
        
        let clientSheet = clientSS.getSheetByName(aba.ALERTAS);
        if (!clientSheet) {
          console.log("📝 [SMS API] Aba ALERTAS não existia na planilha destino. Criando agora...");
          clientSheet = clientSS.insertSheet(aba.ALERTAS);
        }
        
        const dataHoraBR = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
        clientSheet.insertRowBefore(2);
        // Coluna A: Data, Coluna B: Número Formatado, Coluna C: Texto
        clientSheet.getRange(2, 1, 1, 3).setValues([[dataHoraBR, formatarTelefoneBR(rawNumber), smsContent]]);
        
        console.log("🚀 [SMS API] SUCESSO ABSOLUTO! SMS gravado na linha 2 da planilha destino.");
        return { status: "success", message: "SMS Sincronizado." };
      } catch (ePlanilha) {
        console.error(`❌ [SMS API] ERRO DE PERMISSÃO: O seu script não tem acesso de edição na planilha destino (ID: ${targetSheetId}). O erro do Google foi: ${ePlanilha}`);
        throw new Error("Não foi possível acessar a planilha vinculada. Verifique as permissões do ID.");
      }
    }
    
    console.error("❌ [SMS API] O ID da planilha do cliente é muito curto ou está vazio.");
    throw new Error("ID da Planilha do cliente não está configurado corretamente.");
    
  } catch (e) {
    console.error("🔥 [SMS API] Erro Final Retornado ao App:", e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// FORMATADOR MANTIDO (Seguro e Limpo)
function formatarTelefoneBR(numero) {
  if (!numero) return "Desconhecido";
  let str = numero.toString().trim();
  if (/[a-zA-Z]/.test(str)) return str;
  let limpo = str.replace(/\D/g, "");
  
  if (limpo.startsWith("55") && (limpo.length === 12 || limpo.length === 13)) {
     limpo = limpo.substring(2);
  }
  
  if (limpo.length === 11) {
     return "(" + limpo.substring(0,2) + ") " + limpo.substring(2,7) + "-" + limpo.substring(7);
  }
  if (limpo.length === 10) {
     return "(" + limpo.substring(0,2) + ") " + limpo.substring(2,6) + "-" + limpo.substring(6);
  }
  return numero;
}