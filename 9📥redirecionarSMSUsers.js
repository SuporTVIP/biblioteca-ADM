
// =================================================================
// 2. SMS API (smsApi.gs) - VERSÃO DEFINITIVA BLINDADA 🚀
// =================================================================

function processarSmsVindoApp(data) {
  console.log("📨 [SMS API] Recebendo novo POST de SMS do aplicativo...");
  console.log("📦 Payload bruto:", JSON.stringify(data));

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    
    // 🚀 1. O TRATOR DE LIMPEZA NOS DADOS DO APP
    // Força virar string, remove espaços e padroniza o token para MAIÚSCULO
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
    const lastRow = sheet.getLastRow();
    
    // Lê da Coluna A[0] até a M[12]
    const range = sheet.getRange(2, 1, lastRow - 1, 13).getValues(); 
    
    let userFound = false;
    let targetSheetId = "";

    for (let i = 0; i < range.length; i++) {
      let row = range[i];
      
      // 🚀 2. O TRATOR DE LIMPEZA NOS DADOS DA PLANILHA
      let dbEmail  = String(row[2] || "").trim().toLowerCase(); 
      let slot1    = String(row[3] || "").trim();               
      let slot2    = String(row[4] || "").trim();               
      let dbToken  = String(row[5] || "").trim().toUpperCase(); // Padroniza banco para Maiúsculo também!
      let dbStatus = String(row[7] || "").trim().toUpperCase();               
      targetSheetId = String(row[8] || "").trim();              

      if (dbToken === "" && slot2 === reqToken) {
          dbToken = slot2;
      }

      // Comparação blindada (como ambos passaram pelo trator, o match é garantido)
      if (dbToken === reqToken && dbEmail === reqEmailApp) {
        console.log(`✅ [SMS API] Cliente localizado na linha ${i + 2} da aba CONTROLE_ACESSO.`);
        
        if (dbStatus !== "ATIVO") {
          console.warn("⛔ [SMS API] Bloqueado: Status da licença não é 'ATIVO'.");
          throw new Error("Licença inativa.");
        }
        
        // Sua trava genial de DeviceID mantida 100%
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
      // 🚀 3. O MODO X-9 PARA TE AJUDAR A DEBUGAR
      throw new Error(`Credenciais não encontradas. O Google leu -> Email: [${reqEmailApp}] | Token: [${reqToken}]`);
    }

    console.log(`🎯 [SMS API] ID da Planilha de Destino (Coluna I): '${targetSheetId}'`);

    // =================================================================
    // GRAVAÇÃO DIRETA NA PLANILHA DO CLIENTE (Mantida Intacta)
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
        clientSheet.getRange(2, 1, 1, 3).setValues([[dataHoraBR, rawNumber, smsContent]]);
        
        console.log("🚀 [SMS API] SUCESSO ABSOLUTO! SMS gravado na linha 2 da planilha destino.");
        return { status: "success", message: "SMS Sincronizado." };
      } catch (ePlanilha) {
        console.error(`❌ [SMS API] ERRO DE PERMISSÃO: O seu script não tem acesso de edição na planilha destino (ID: ${targetSheetId}). O erro do Google foi: ${ePlanilha}`);
        throw new Error("Não foi possível acessar a planilha vinculada. Verifique as permissões do ID.");
      }
    }
    
    console.error("❌ [SMS API] O ID da planilha na Coluna I é muito curto ou está vazio.");
    throw new Error("ID da Planilha do cliente não está configurado na Coluna I.");
    
  } catch (e) {
    console.error("🔥 [SMS API] Erro Final Retornado ao App:", e.toString());
    return { status: "error", message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function formatarTelefoneBR(numero) {
  if (!numero) return "Desconhecido";
  var str = numero.toString().trim();
  if (/[a-zA-Z]/.test(str)) return str;
  var limpo = str.replace(/\D/g, "");
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