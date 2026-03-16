/**
 * Gerencia o Login e Slots de Dispositivos (Máximo 2)
 * Totalmente Dinâmico: Independente da ordem das colunas.
 */
function verificarLicencaDispositivo(deviceId, token, email, fcmToken, fcmTokenWeb) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); 
    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const abaControle = ss.getSheetByName(aba.CONTROLE_ACESSO);
    const lastRow = abaControle.getLastRow();
    
    if (lastRow < 2) return { status: "error", message: "Nenhuma licença cadastrada no sistema." };
    
    // =================================================================
    // 🚀 MAPEAMENTO DINÂMICO
    // =================================================================
    const cabecalhosRaw = abaControle.getRange(1, 1, 1, abaControle.getLastColumn()).getValues()[0];
    const normalizar = (t) => (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    const cabNormalizados = cabecalhosRaw.map(normalizar);
    const buscarIdx = (chave) => cabNormalizados.indexOf(normalizar(chave));

    const idxUsuario      = buscarIdx(COLUNAS_CONTROLE_ACESSO.USUARIO);
    const idxEmail        = buscarIdx(COLUNAS_CONTROLE_ACESSO.EMAIL);
    const idxSlot1        = buscarIdx(COLUNAS_CONTROLE_ACESSO.DEVICE_ID);
    const idxSlot2        = buscarIdx(COLUNAS_CONTROLE_ACESSO.DEVICE_ID_2);
    const idxToken        = buscarIdx(COLUNAS_CONTROLE_ACESSO.TOKEN);
    const idxVencimento   = buscarIdx(COLUNAS_CONTROLE_ACESSO.VENCIMENTO);
    const idxStatus       = buscarIdx(COLUNAS_CONTROLE_ACESSO.STATUS);
    const idxIdPlanilha   = buscarIdx(COLUNAS_CONTROLE_ACESSO.ID_PLANILHA);
    const idxUltimoAcesso = buscarIdx(COLUNAS_CONTROLE_ACESSO.ULTIMO_ACESSO);
    const idxFcmMobile    = buscarIdx(COLUNAS_CONTROLE_ACESSO.FCM_MOBILE);
    const idxFcmWeb       = buscarIdx(COLUNAS_CONTROLE_ACESSO.FCM_WEB);

    if (idxEmail === -1 || idxToken === -1 || idxSlot1 === -1) {
      return { status: "error", message: "Erro de Mapeamento: Colunas essenciais não encontradas." };
    }

    const valores = abaControle.getDataRange().getValues();
    
    for (let i = 1; i < valores.length; i++) { // Começa do 1 para pular cabeçalho
      let usuario    = (valores[i][idxUsuario] || "").toString().trim();
      let dbEmail    = (valores[i][idxEmail] || "").toString().trim().toLowerCase();
      let slot1      = (valores[i][idxSlot1] || "").toString();
      let slot2      = (valores[i][idxSlot2] || "").toString();
      let dbToken    = (valores[i][idxToken] || "").toString().trim().toUpperCase();
      let status     = (valores[i][idxStatus] || "").toString().toUpperCase();
      let idPlanilha = (valores[i][idxIdPlanilha] || "").toString().trim();
      
      let reqEmail = (email || "").toString().trim().toLowerCase();
      let reqToken = (token || "").toString().trim().toUpperCase();
      
      let rawVencimento = valores[i][idxVencimento];
      let dbVencimento = (rawVencimento instanceof Date) 
        ? Utilities.formatDate(rawVencimento, Session.getScriptTimeZone(), "dd/MM/yyyy") 
        : rawVencimento.toString();
        
      if (dbToken === reqToken && dbEmail === reqEmail) {
        if (status !== "ATIVO") {
          return { status: "error", message: "Licença inativa ou suspensa." };
        }
        
        let rowIndex = i + 1; 

        // Registra o pulso de acesso na coluna correta
        if (idxUltimoAcesso !== -1) abaControle.getRange(rowIndex, idxUltimoAcesso + 1).setValue(new Date());
        
        const sucessoRetorno = {
           status: "success", 
           message: "Acesso Liberado",
           usuario: usuario,
           vencimento: dbVencimento,
           idPlanilha: idPlanilha
        };

        // Salva os Tokens Push se enviados
        if (fcmToken && fcmToken !== "" && idxFcmMobile !== -1) {
            abaControle.getRange(rowIndex, idxFcmMobile + 1).setValue(fcmToken); 
        }
        if (fcmTokenWeb && fcmTokenWeb !== "" && idxFcmWeb !== -1) {
            abaControle.getRange(rowIndex, idxFcmWeb + 1).setValue(fcmTokenWeb); 
        }

        // Verifica os Slots de Device ID
        if (slot1 === deviceId || slot2 === deviceId) return sucessoRetorno;
        
        if (slot1 === "") {
          abaControle.getRange(rowIndex, idxSlot1 + 1).setValue(deviceId); 
          return sucessoRetorno;
        }
        if (slot2 === "") {
          abaControle.getRange(rowIndex, idxSlot2 + 1).setValue(deviceId); 
          return sucessoRetorno;
        }
        
        return { status: "error", message: "Limite de aparelhos excedido. Desconecte um dispositivo antes." };
      }
    }

    return { status: "error", message: "Token ou E-mail incorretos." };

  } catch (e) {
    return { status: "error", message: "Erro interno no servidor: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Libera a vaga (Slot) apagando o DeviceID da planilha.
 */
function removerLicencaDispositivo(deviceId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); 
    const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
    const abaControle = ss.getSheetByName(aba.CONTROLE_ACESSO);
    const lastRow = abaControle.getLastRow();
    
    if (lastRow < 2) return { status: "error", message: "Planilha vazia." };
    
    // Mapeamento Dinâmico
    const cabecalhosRaw = abaControle.getRange(1, 1, 1, abaControle.getLastColumn()).getValues()[0];
    const normalizar = (t) => (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    const cabNormalizados = cabecalhosRaw.map(normalizar);
    
    const idxSlot1 = cabNormalizados.indexOf(normalizar(COLUNAS_CONTROLE_ACESSO.DEVICE_ID));
    const idxSlot2 = cabNormalizados.indexOf(normalizar(COLUNAS_CONTROLE_ACESSO.DEVICE_ID_2));

    if (idxSlot1 === -1 || idxSlot2 === -1) return { status: "error", message: "Colunas de Device ID não encontradas." };

    const valores = abaControle.getDataRange().getValues();
    
    for (let i = 1; i < valores.length; i++) {
      let slot1 = (valores[i][idxSlot1] || "").toString();
      let slot2 = (valores[i][idxSlot2] || "").toString();
      let rowIndex = i + 1;

      if (slot1 === deviceId) {
        abaControle.getRange(rowIndex, idxSlot1 + 1).clearContent(); 
        return { status: "success", message: "Vaga 1 liberada." };
      }
      if (slot2 === deviceId) {
        abaControle.getRange(rowIndex, idxSlot2 + 1).clearContent(); 
        return { status: "success", message: "Vaga 2 liberada." };
      }
    }

    return { status: "success", message: "Aparelho já estava desconectado." };

  } catch (e) {
    return { status: "error", message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registrar apenas o Token FCM (Versão Adaptada para Planilha Dinâmica)
 */
function registrarTokenFCM(e) {
  const token = e.parameter.token;
  const email = (e.parameter.email || "").toString().trim().toLowerCase();
  
  if (!token) return { status: "error", message: "Token ausente" };

  const ss = SpreadsheetApp.openById(configGeral.ID_PLANILHA_ADM);
  let sheet = ss.getSheetByName(aba.CONTROLE_ACESSO);
  if (!sheet) return { status: "error", message: "Aba de controle não existe." };

  const cabecalhosRaw = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const normalizar = (t) => (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const cabNormalizados = cabecalhosRaw.map(normalizar);
  
  const idxEmail = cabNormalizados.indexOf(normalizar(COLUNAS_CONTROLE_ACESSO.EMAIL));
  const idxFcmMobile = cabNormalizados.indexOf(normalizar(COLUNAS_CONTROLE_ACESSO.FCM_MOBILE));

  if (idxEmail === -1 || idxFcmMobile === -1) return { status: "error", message: "Colunas não mapeadas." };

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    let dbEmail = (data[i][idxEmail] || "").toString().trim().toLowerCase();
    
    // Atualiza o token na linha do cliente que pediu
    if (dbEmail === email) {
      sheet.getRange(i + 1, idxFcmMobile + 1).setValue(token);
      return { status: "success", message: "Token FCM atualizado para o usuário." };
    }
  }

  return { status: "error", message: "Usuário não encontrado." };
}
/**
 * 🔐 GERAÇÃO DO TOKEN DE ACESSO (MODO RAIZ / SEM BIBLIOTECA)
 * Cria e assina um JWT nativamente para autenticar no Firebase.
 */
function getAccessToken() {
  const SERVICE_ACCOUNT_EMAIL = "fcm-disparador-radar@plamilhasvipaddondevsadm.iam.gserviceaccount.com";
  
  // 🔑 Sua chave privada recuperada com sucesso:
  const PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC3cGfrNujRj4Kx\nNcUw462KmCcs/0AuNeqEFEduv4b275oGmydNXF74HVy938aWWMco1+8RUHgecRwv\ngD7Xhef5sBwjWs9BnY0NRUH3X2LMdt8yw2hV0JvA3oL6OOcM0HUDppsTO8xY2Hb9\ntjyLgx7QYjO5IRYlJAjUXzml0DsCSpYn8ysiDTe/iXZDq+fwpWGUYRijTyk9Udt/\nhZedonoS0Jsq/hBYpKMy5kfwO1vZfGrGCSs4FpwDIZOW8p2fLQa8PrtxYGCScpXc\nZxgTl96ATTpEa1wOq88KSGmHqyHANyTP4SLm28LHw1rq+CzCYas9/1t5GHOpTVNB\n3wk0NUVdAgMBAAECggEABg452tozS9tr2Qb5bD41A1xuRlv2DvdTd1Nh6QLY8tmO\n0TnweytDEXf4rEGH6mpQEIFa7h7JZFeWVzeFICFWn0V2gOeQ7FIheBTb96joagHg\nubw9u1IQYsjOz7rA8QAsiLej87Cy6qM0tq1Xlool9KeZ00yHfqe9ewWRTQIHgTp7\nWnkq06I3xtsMmSxzw4xqD8SsgMydSchfxXJsiabknVQVLtLGmW2aSXVG3Olcy7ps\nQeXSfSj9W0sjoLkK6HYqtHMiwTT/WQDk5OkT9/1FyyixYHF1Xm3NXEwm4/6b/zu6\nSEIqVdARhVFQHs4szeKhB2L8I+QfGJSzRm9f5L9deQKBgQDx6yOkCRLkTLHxQ9UK\nHQXZiLdS083pIo0lKliApIL0FQK3OMnUjclGj24Fq4BwKykG/Xr84Jh+cRLziO3m\nNTSBHb9PZiPzl1mIGQuaN/ntIObZLyEBFRM07u1pifCYAAGurpZ+dJK/RylddSz7\nS4sh+n4y0kWq1NfnPhI2GffpqQKBgQDCHdtWeJpyshI2OJOBvuUBx65JrJnU0E7I\nZiZtVwRI4u7W4tjp/7esSJPJiLIumQnp3wDJkNi5SHLeDvY35+FvxPtdNlUySRPV\nhEZJfDcnTx90Lm8FgAF5f+3f1+OKPQ+zNvTGfEUg51OJcROK4TpJ/WFkjrzlK8rg\nZXIjMT/WlQKBgQDLkb6QDkKjchZam2Xt+LYvc2gwfqLLB5QWLigDOGwp0HRUkajk\n/9rbUV6XztVpjigcBbk0ihpIbAYygIsQKL1h2RJfUef21uk0KT8mKuxYqlMXdx0i\nuAVNibCmGrkmbvr7b1acWqQR6WPZjPypCcyubwc65M5TDoAPyp+wfvGq4QKBgQC6\nSESw2tP8tX5cojaMEFFcP++1q/mEDNNN5RmDXDo0Z/KkLNXU2R2+K3gHszKrHRoy\nYVs0E9inFiuFhf4q8E+bHwHKFdX0h8SM5n89DgMvqfKZX+YS9SB1JJt2cItfofFr\nHpYP1DnStauo/eavJCz3zDymb4Q+uKPca/34X87PcQKBgQCn1Wl5WF6X+LPBWFIK\nWAr/gRe4nvr4oNA6FEq2Z7Xg60r6Rv5LyW/E+EoFpWRqTscDoISXRfk8xwanlqQI\nEXVdwIvO1ia/JAvdoSwvOFEaOdBRi+whctj0a8xFprlDRrsXMusD1fBembIHvM1O\nxb34rklJ7nlyA9cpMakEkhe9TA==\n-----END PRIVATE KEY-----\n";

  try {
    const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
    const encodedHeader = Utilities.base64EncodeWebSafe(header).replace(/=+$/, '');

    const now = Math.floor(Date.now() / 1000);
    const claimSet = JSON.stringify({
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    });
    const encodedClaimSet = Utilities.base64EncodeWebSafe(claimSet).replace(/=+$/, '');

    const signatureInput = encodedHeader + "." + encodedClaimSet;
    const signatureBytes = Utilities.computeRsaSha256Signature(signatureInput, PRIVATE_KEY);
    const encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');

    const jwt = signatureInput + "." + encodedSignature;

    const options = {
      method: "post",
      payload: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", options);
    const result = JSON.parse(response.getContentText());

    if (result.access_token) {
      return result.access_token;
    } else {
      console.error("❌ Erro ao gerar token manual:", result);
      return null;
    }
  } catch (e) {
    console.error("❌ Falha crítica na criptografia JWT:", e.toString());
    return null;
  }
}