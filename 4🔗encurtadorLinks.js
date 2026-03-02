function criarLinkCurto(linkOriginal, nomeBaseOuSlug) {
  var slugLimpo = nomeBaseOuSlug.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  var slugFinal = gerarSlugAnalytics(slugLimpo);

  var payload = { 
    'action': 'fami_criar', 
    'chave': controlAcess.SENHA_ENCURTADOR, 
    'slug': slugFinal, 
    'link': linkOriginal 
  };
  
  var options = { 'method': 'post', 'payload': payload, 'muteHttpExceptions': true };

  try {
    var response = UrlFetchApp.fetch(controlAcess.URL_ENCURTADOR, options);
    var json = JSON.parse(response.getContentText());
    return json.success ? json.data.link_final.replace(/\\\//g, "/") : "Erro WP: " + json.data;
  } catch (e) { return "Erro Conexão: " + e.message; }
}

function gerarSlugAnalytics(chaveEmpresa) {
  var listaOficial = ['azul', 'latam', 'smiles', 'tap', 'iberia', 'gol', 'copa', 'american', 'emirates', 'qatar', 'airfrance', 'klm', 'united', 'delta', 'emitir', 'airchina', 'aircanada', 'aerolineasargentinas', 'aeromexico'];
  
  var hoje = new Date();
  var dataFormatada = ("0" + hoje.getDate()).slice(-2) + ("0" + (hoje.getMonth() + 1)).slice(-2) + hoje.getFullYear();

  if (listaOficial.indexOf(chaveEmpresa) === -1) {
    return chaveEmpresa + dataFormatada + hoje.getTime();
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var props = PropertiesService.getScriptProperties();
    var dadosDia = JSON.parse(props.getProperty("METRICAS_DIARIAS") || '{"data":"","geral":0,"empresas":{},"emitir_count":0}');

    if (dadosDia.data !== dataFormatada) {
      dadosDia = { data: dataFormatada, geral: 0, empresas: {}, emitir_count: 0 };
    }

    // --- LÓGICA EXCLUSIVA PARA EMITIR ---
    if (chaveEmpresa === 'emitir') {
      dadosDia.emitir_count = (dadosDia.emitir_count || 0) + 1;
      props.setProperty("METRICAS_DIARIAS", JSON.stringify(dadosDia));
      lock.releaseLock();
      var cEmitir = dadosDia.emitir_count < 10 ? "0" + dadosDia.emitir_count : dadosDia.emitir_count;
      return chaveEmpresa + dataFormatada + cEmitir;
    }

    // --- LÓGICA PARA COMPANHIAS ---
    dadosDia.geral++;
    dadosDia.empresas[chaveEmpresa] = (dadosDia.empresas[chaveEmpresa] || 0) + 1;
    props.setProperty("METRICAS_DIARIAS", JSON.stringify(dadosDia));
    lock.releaseLock();
    var cCia = dadosDia.empresas[chaveEmpresa] < 10 ? "0" + dadosDia.empresas[chaveEmpresa] : dadosDia.empresas[chaveEmpresa];
    var cGer = dadosDia.geral < 10 ? "00" + dadosDia.geral : (dadosDia.geral < 100 ? "0" + dadosDia.geral : dadosDia.geral);
    return chaveEmpresa + cCia + dataFormatada + cGer;

  } catch (e) {
    lock.releaseLock();
    return chaveEmpresa + dataFormatada + hoje.getTime();
  }
}

// ============================================================================
// 3️⃣ UTILITÁRIO DE LIMPEZA
// ============================================================================
function limparNome(texto) {
  return texto.toString().toLowerCase()
    .replace(/\s+/g, '')           
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]/g, '');    
}