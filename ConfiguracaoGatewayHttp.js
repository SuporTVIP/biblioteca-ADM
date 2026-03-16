/**
 * GATEWAY HTTP - Camada de Transporte
 * Ajustada para sua Sessão: 'SessaoMilhas'
 */
function enviarMensagemWppConnect(chatId, texto) {
  // 1. Fail Fast: Evita gastar quota se não tiver texto ou URL
  if (!texto) {
    return console.warn("⚠️ Texto vazio.");
  }

  // Verifica se o ngrok está configurado
  if (!configGeral.URL_API_NGROK || !configGeral.URL_API_NGROK.includes("ngrok")) {
    console.error("🔴 URL do ngrok inválida em VARIAVEIS_GLOBAIS.");
    return;
  }

  // =================================================================
  // 🎯 CONFIGURAÇÃO EXATA DO SEU SERVIDOR ANTIGO
  // =================================================================
  const SESSAO = "SessaoMilhas"; // <--- AQUI ESTAVA O ERRO 404

  const baseUrl = configGeral.URL_API_NGROK.replace(/\/$/, "");
  const endpoint = `${baseUrl}/api/${SESSAO}/send-message`;

  // Payload Exato que funcionava no seu local
  const payload = {
    phone: chatId || configGeral.ID_GRUPO_VIP_DESTINO,
    message: texto,
    isGroup: true
  };

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + configGeral.TOKEN_WPPCONNECT,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    // Tenta enviar (Se o Google permitir)
    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();

    // Log apenas para depuração
    if (statusCode !== 201 && statusCode !== 200) {
      console.error(`❌ Erro WPP (${statusCode}): ${response.getContentText()}`);
    } else {
      console.log("✅ Enviado com sucesso!");
    }

  } catch (e) {
    // Se der erro de quota, avisamos no log
    if (e.message.includes("too many times")) {
      console.error("⛔ CRÍTICO: Cota do Google excedida por hoje.");
    } else {
      console.error(`🔥 Erro de Envio: ${e.message}`);
    }
  }
}

function TESTE_FINAL_CONEXAO() {
  console.log("🛠️ TESTANDO CAMADA DE TRANSPORTE (SEM REGEX)...");

  const mensagemTeste = `
🤖 *TESTE DE SISTEMA*
✅ Conexão Google -> ngrok -> WPP
📅 ${new Date().toLocaleString()}

Se esta mensagem chegou, o erro 404 foi exterminado.
  `;

  // Chama direto o "Músculo", pulando o "Cérebro"
  if (typeof enviarMensagemWppConnect === 'function') {
      enviarMensagemWppConnect(configGeral.ID_GRUPO_VIP_DESTINO, mensagemTeste);
  } else {
      console.error("❌ Função 'enviarMensagemWppConnect' não encontrada na Biblioteca.");
  }
}

function SIMULAR_ENTRADA_WPP() {
  console.log("🟢 INICIANDO SIMULAÇÃO DE WEBHOOK WHATSAPP...");

  // 1. Escolha um ID de grupo que ESTEJA na sua lista de PERMITIDOS (VARIAVEIS_GLOBAIS)
  // Se usar um ID que não está lá, o log vai dar "Ignorado: Grupo Desconhecido"
  const idGrupoOrigem = configGeral.ID_GRUPO_TESTE; 

  // 2. Payload Realístico do WPPConnect
  const mockWppPayload = {
    event: "onmessage",
    type: "chat",
    from: idGrupoOrigem,
    chatId: idGrupoOrigem,
    isGroupMsg: true,
    sender: {
      name: "Usuario Teste",
      pushname: "Tester"
    },
    // Texto que passa nos filtros
    body: `
Programa: smiles
 
Origem 🛫 SAO PAULO
Destino 🛬 RIO GRANDE DO NORTE

➡ 19/05 - 20.500 milhas
⬅ 27/05 - 13.500 milhas
+ taxas aeroportuárias

Disponibilidades - IDA

Maio: 5, 7, 11, 13, 18, 19, 20, 25, 26

Disponibilidades - VOLTA 
s
Maio: 6, 7, 11, 13, 14, 18, 27

> Tarifa com desconto para o nível Diamante. Todos os outros níveis também possuem descontos proporcionais. Esteja logado antes de realizar a pesquisa. O desconto é aplicado automaticamente.

⚠ Ei, cuida, visse! As tarifas e disponibilidades podem acabar em dois palitos. 

Atalho para emissão: https://abre.ai/oX54

Grupo de Emissões do @milhasnordestinas
hub.la/g/gpKtrMCRH3bILwv65KNg
    `,
    id: {
      fromMe: false, // Importante: garante que não é auto-envio
      remote: idGrupoOrigem,
      id: "ABC123TESTE_WPP"
    }
  };

  // 3. Simula a chegada no Router
  // Precisamos chamar a função processarWebhookWPP diretamente
  
  if (typeof processarWebhookWPP === 'function') {
      const resultado = processarWebhookWPP(mockWppPayload, JSON.stringify(mockWppPayload));
      console.log(`📝 Resultado do Router: ${resultado.getContent()}`);
  } else {
      console.error("❌ Função 'processarWebhookWPP' não encontrada.");
  }
}

function LISTAR_TODOS_GRUPOS() {
  // 1. Configurações de Conexão
  const baseUrl = configGeral.URL_API_NGROK.replace(/\/$/, ""); 
  const session = "SessaoMilhas"; // Nome da sua sessão
  const token = configGeral.TOKEN_WPPCONNECT;

  // Endpoint para pegar todos os grupos
  const url = `${baseUrl}/api/${session}/all-groups`;

  const options = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",  // <--- 🚨 O SEGREDO ESTÁ AQUI
      "User-Agent": "GoogleAppsScript"       // Ajuda a evitar bloqueios também
    },
    muteHttpExceptions: true
  };

  try {
    console.log("🔍 Buscando grupos em: " + url);
    const response = UrlFetchApp.fetch(url, options);
    
    // Verifica se o servidor retornou erro (404, 500, etc)
    if (response.getResponseCode() !== 200) {
      console.error("❌ Erro HTTP " + response.getResponseCode() + ": " + response.getContentText());
      return;
    }

    const textoResposta = response.getContentText();

    // Verificação de Segurança Extra: Se ainda vier HTML, aborta
    if (textoResposta.trim().startsWith("<")) {
        console.error("🚨 ERRO CRÍTICO: O Ngrok ou Servidor retornou HTML em vez de JSON.");
        console.error("Conteúdo recebido (Primeiros 100 chars): " + textoResposta.substring(0, 100));
        return;
    }

    const json = JSON.parse(textoResposta);
    
    // O WPPConnect geralmente retorna um array no 'response' ou direto
    const grupos = json.response || json;

    console.log("==========================================");
    console.log(`📋 SUCESSO! ${grupos.length || 0} GRUPOS ENCONTRADOS:`);
    console.log("==========================================");

    if (Array.isArray(grupos)) {
        grupos.forEach(g => {
          // Filtra para mostrar nome e ID
          const idGrupo = g.id._serialized || g.id;
          const nomeGrupo = g.name || g.contact?.name || "Sem Nome";
          
          // Destaque para o grupo que procuramos
          if (nomeGrupo.toUpperCase().includes("MILHAS") || nomeGrupo.toUpperCase().includes("VIAGENS")) {
             console.log(`🎯 ALVO PROVÁVEL:`);
          }
          console.log(`📌 NOME: ${nomeGrupo}`);
          console.log(`🆔 ID:   ${idGrupo}`);
          console.log("------------------------------------------");
        });
    } else {
        console.warn("⚠️ O formato retornado não é uma lista: ", json);
    }

  } catch (e) {
    console.error("🔥 Erro fatal no Script: " + e.message);
  }
}
