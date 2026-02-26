/**
 * ============================================================================
 * 🧠 MOTOR FÃMILHAS - ENCURTADOR COM ANALYTICS (Versão V12.0)
 * ============================================================================
 * * NOVO FORMATO DE LINK:
 * [NomeCompanhia][ContadorDela][Data][ContadorGeral]
 * Exemplo: azul111202202611
 * (Azul + Link 11 dela hoje + Data 12/02/2026 + Link 11 geral hoje)
 * * * ⚠️ REQUISITOS:
 * Precisa do arquivo 'variaveis global.gs' com as const 'acess' e 'pass'.
 */

// ============================================================================
// 1️⃣ FUNÇÃO PRINCIPAL
// ============================================================================
function criarLinkCurto(linkOriginal, nomeBaseOuSlug) {
  if (!linkOriginal || linkOriginal == "") return "#ERR-VAL-01: Link Vazio";
  if (!nomeBaseOuSlug || nomeBaseOuSlug == "") return "#ERR-VAL-01: Nome Vazio";
  
  if (!/^https?:\/\//i.test(linkOriginal)) {
    return "#ERR-VAL-02: Link inválido (falta https://).";
  }

  var slugFinal = nomeBaseOuSlug;
  
  if (nomeBaseOuSlug.indexOf('-') === -1 || nomeBaseOuSlug.length < 15) {
      slugFinal = gerarSlugAnalytics(nomeBaseOuSlug);
  }

  var payload = { 
    'action': 'fami_criar', 
    'chave': controlAcess.SENHA_ENCURTADOR, 
    'slug': slugFinal, 
    'link': linkOriginal 
  };
  
  var options = { 
    'method': 'post', 
    'payload': payload, 
    'muteHttpExceptions': true 
  };

  try {
    Utilities.sleep(Math.floor(Math.random() * 100) + 50);
    
    var response = UrlFetchApp.fetch(controlAcess.URL_ENCURTADOR, options);
    var code = response.getResponseCode();

    if (code !== 200) return "#ERR-NET-" + code + ": Servidor Rejeitou";

    try {
      var json = JSON.parse(response.getContentText());
    } catch (e) {
      return "#ERR-API-JSON: Site devolveu HTML (Erro Crítico).";
    }

    if (json.success) { 
      return json.data.link_final.replace(/\\\//g, "/"); 
    } else { 
      return "#ERR-WP: " + json.data; 
    }

  } catch (e) { 
    return "#ERR-CONEXAO: " + e.message; 
  }
}

// ============================================================================
// 2️⃣ O CÉREBRO ANALÍTICO (Com Formatação de Zeros)
// ============================================================================
function gerarSlugAnalytics(nomeBase) {
  var lock = LockService.getScriptLock();
  
  try { lock.waitLock(30000); } catch (e) { 
    return limparNome(nomeBase) + new Date().getTime() + "x"; 
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var hoje = new Date();
    var dataFormatada = ("0" + hoje.getDate()).slice(-2) + ("0" + (hoje.getMonth() + 1)).slice(-2) + hoje.getFullYear();
    
    var chaveEmpresa = limparNome(nomeBase); 

    var memoriaRaw = props.getProperty("METRICAS_DIARIAS");
    var dadosDia;
    
    try {
      dadosDia = memoriaRaw ? JSON.parse(memoriaRaw) : {};
    } catch (err) {
      dadosDia = {}; 
    }

    if (!dadosDia.data || dadosDia.data !== dataFormatada) {
      dadosDia = {
        data: dataFormatada,
        geral: 0,
        empresas: {} 
      };
    }

    // Incrementos
    dadosDia.geral++;

    if (!dadosDia.empresas[chaveEmpresa]) {
      dadosDia.empresas[chaveEmpresa] = 0; 
    }
    dadosDia.empresas[chaveEmpresa]++;

    props.setProperty("METRICAS_DIARIAS", JSON.stringify(dadosDia));
    lock.releaseLock();

    // --- AQUI ESTÁ A MUDANÇA (Formatação com Zero à Esquerda) ---
    // Se for menor que 10, coloca um "0" na frente. Se for 10 ou mais, deixa normal.
    // Ex: 1 vira "01", 9 vira "09", 10 continua "10", 100 continua "100".
    
    var contadorEmpresaFormatado = dadosDia.empresas[chaveEmpresa] < 10 ? "0" + dadosDia.empresas[chaveEmpresa] : dadosDia.empresas[chaveEmpresa];
    
    var contadorGeralFormatado = dadosDia.geral < 10 ? "0" + dadosDia.geral : dadosDia.geral;

    // Montagem Final: azul + 01 + 12022026 + 01
    return chaveEmpresa + contadorEmpresaFormatado + dataFormatada + contadorGeralFormatado;

  } catch (e) {
    lock.releaseLock();
    return limparNome(nomeBase) + "-" + new Date().getTime() + "-erro";
  }
}

// ============================================================================
// 3️⃣ UTILITÁRIO DE LIMPEZA
// ============================================================================
/**
 * Limpa o nome da cidade mantendo a capitalização e espaços originais.
 */
function limparNome(s) { 
  if (!s) return null;
  let t = s;
  
  // 1. REMOÇÃO DE EMOJIS E SÍMBOLOS ESPECIAIS
  // Mantém Letras, Acentos, Números, Espaços e Hífens.
  // REMOVIDO: .toLowerCase() para preservar nomes como "Belo Horizonte"
  t = t.replace(/[^\w\s\u00C0-\u00FF\-]/g, "");
  
  // 2. PRESERVAÇÃO DE ESPAÇOS EM NOMES COMPOSTOS
  // Remove apenas espaços triplos ou excessivos, mantendo o espaço entre nomes.
  t = t.replace(/\s{2,}/g, " ").trim();

  // 3. CAPITALIZAÇÃO (Opcional: Garante a primeira letra maiúscula de cada palavra)
  return t.replace(/\b\w/g, l => l.toUpperCase());
}