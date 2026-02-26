// =================================================================
// 2. SMS API (smsApi.gs) - VERSÃO MODULAR SEGURA 🛡️
// =================================================================

function processarSincronizacaoSMS(data) {
  // Configurações Locais (Evita dependência global quebrada)


  var result = {};
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
  } catch (e) {
    return returnJSON({status: "error", message: "Servidor ocupado."});
  }

  try {
    // O 'data' já vem parseado do routerApi.gs
    
    var reqToken = data.license_key; 
    var reqDeviceId = data.device_id; 
    var reqEmailApp = data.target_email; 
    var smsContent = data.sms_content;
    
    // Formatação de Telefone (Helper interno)
    var rawNumber = data.sender_number || "Desconhecido"; 
    var senderNumber = formatarTelefoneBR(rawNumber); 

    // Security Patch
    if (smsContent && /^[=+\-@]/.test(smsContent)) {
       smsContent = "'" + smsContent;
    }

    if (!reqToken || !reqDeviceId) throw new Error("Credenciais incompletas.");
    if (!reqEmailApp) throw new Error("E-mail não informado.");
    if (!smsContent) throw new Error("Conteúdo ausente.");

    // Filtro Regex
    if (BLACKLIST_SMS.test(smsContent)) {
      result.status = "success_filtered";
      result.message = "Mensagem filtrada.";
      return returnJSON(result);
    }

    // Acesso ao Banco de Dados (Planilha Mestre)
    var ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    var sheet = ss.getSheetByName(aba.CONTROLE_ACESSO);
    if (!sheet) throw new Error("Planilha ADM não encontrada!");

    var lastRow = sheet.getLastRow();
    // Lê Colunas C até H (Token, Vencimento, Status, ID Planilha Cliente...)
    // Ajuste conforme seu layout real, mas mantendo a lógica original
    var range = sheet.getRange(2, 3, lastRow - 1, 6).getValues(); 
    
    var userFound = false;
    var targetSheetId = "";

    for (var i = 0; i < range.length; i++) {
      var row = range[i];
      var dbToken = row[2]; // Coluna E (índice 2 no range que começa em C)
      
      if (dbToken == reqToken) {
        userFound = true;
        var rowIndex = i + 2;
        
        var dbEmailSheet = row[0]; // Coluna C
        var dbDeviceId = row[1];   // Coluna D
        var dbVencimento = row[3]; // Coluna F
        var dbStatus = row[4];     // Coluna G
        targetSheetId = row[5];    // Coluna H

        // Validação
        var appEmailClean = reqEmailApp.toString().trim().toLowerCase();
        var dbEmailClean = dbEmailSheet.toString().trim().toLowerCase();
        
        if (appEmailClean !== dbEmailClean) throw new Error("Token não pertence ao e-mail informado.");
        if (dbStatus != "ATIVO") throw new Error("Licença inativa.");
        
        var hoje = new Date();
        hoje.setHours(0,0,0,0);
        if (hoje > new Date(dbVencimento)) throw new Error("Licença vencida.");

        // Atualiza Device ID se for o primeiro acesso
        if (!dbDeviceId) {
           sheet.getRange(rowIndex, 4).setValue(reqDeviceId);
        } else if (dbDeviceId != reqDeviceId) {
           throw new Error("Token vinculado a outro aparelho.");
        }
        break; 
      }
    }

    if (!userFound) throw new Error("Token inválido.");

    // Escrita na Planilha do Cliente
    var savedToSheet = false;
    var sheetErrorMessage = "";

    if (targetSheetId && targetSheetId.length > 10) {
      try {
        var clientSS = SpreadsheetApp.openById(targetSheetId);
        var clientSheet = clientSS.getSheetByName(aba.ALERTAS);
        
        if (!clientSheet) {
          clientSheet = clientSS.insertSheet(aba.ALERTAS);
          clientSheet.appendRow(["Data Hora", "Remetente", "Mensagem"]); 
        }
        
        var dataHoraBR = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
        
        // Insere na linha 2 (Topo)
        clientSheet.insertRowBefore(2);
        clientSheet.getRange(2, 1, 1, 3).setValues([[dataHoraBR, senderNumber, smsContent]]);
        
        // Estilização
        var rowToFormat = 2;
        clientSheet.setColumnWidth(1, 150); 
        clientSheet.setColumnWidth(2, 130); 
        clientSheet.getRange(rowToFormat, 1).setNumberFormat("dd/mm/yyyy hh:mm:ss");       
        clientSheet.getRange(rowToFormat, 1, 1, 2).setHorizontalAlignment("center");
        clientSheet.getRange(rowToFormat, 1, 1, 3).setBackground("#f3f3f3");
        
        savedToSheet = true;

      } catch (e_sheet) {
        sheetErrorMessage = e_sheet.toString();
        console.warn("Erro Planilha Cliente: " + sheetErrorMessage);
      }
    } else {
        sheetErrorMessage = "ID da planilha não configurado.";
    }

    if (savedToSheet) {
        result.status = "success";
        result.message = "SMS Sincronizado.";
    } else {
        result.status = "error";
        result.message = "Erro ao salvar: " + sheetErrorMessage;
    }

  } catch (error) {
    result.status = "error";
    result.message = error.toString();
  } finally {
    lock.releaseLock(); 
  }

  return returnJSON(result);
}

// --- HELPERS INTERNOS ---

function returnJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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