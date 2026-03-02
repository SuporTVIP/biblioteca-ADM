// =================================================================
// MÓDULO GERADOR DE TOKENS (SEM FORMATAÇÃO VISUAL)
// =================================================================

// 2. Função Principal
function inserirTokenNaCelula() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var cell = sheet.getActiveCell();
  
  // Proteção: Impede escrever no cabeçalho
  if (cell.getRow() === 1) {
    SpreadsheetApp.getUi().alert('⚠️ Selecione uma linha abaixo do cabeçalho.');
    return;
  }

  // Define qual coluna será verificada para evitar duplicidade
  // 3 = Coluna C. Se mudar a coluna do token na planilha, mude este número.
  var colunaDosTokens = 3; 

  // Chama o motor de geração
  var novoToken = gerarTokenUnico(sheet, colunaDosTokens);
  
  // Apenas insere o valor (Mantém a cor original da planilha)
  cell.setValue(novoToken);
}

// 3. Motor de Geração com Loop de Verificação (Retry)
function gerarTokenUnico(sheet, colIndex) {
  var lastRow = sheet.getLastRow();
  var tokensExistentes = [];

  // Pega todos os tokens já cadastrados para comparar
  // (Otimização: Pega tudo de uma vez para não ler a planilha a cada loop)
  if (lastRow > 1) {
     tokensExistentes = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().flat();
  }

  var token = "";
  var isDuplicado = true;
  var countSeguranca = 0; // Evita travamento eterno em caso de erro crítico

  // LOOP RECURSIVO / DO-WHILE
  // "Faça isso... Enquanto o token for duplicado"
  do {
    token = criarStringAleatoria();
    
    // Verifica: O token gerado existe na lista de tokens existentes?
    // indexOf retorna -1 se NÃO achar. Se for diferente de -1, é duplicado.
    if (tokensExistentes.indexOf(token) === -1) {
      isDuplicado = false; // Achamos um inédito! Sai do loop.
    } else {
      console.log("Colisão detectada! Gerando novamente..."); // Log interno
    }

    countSeguranca++;
    if (countSeguranca > 500) throw new Error("Erro Crítico: Limite de tentativas excedido.");

  } while (isDuplicado);

  return token;
}

// 4. Alfabeto Seguro (Sem confusão visual: O/0, I/1, L)
function criarStringAleatoria() {
  var caracteres = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
  var tamanho = 6;
  var resultado = "";
  
  for (var i = 0; i < tamanho; i++) {
    var indice = Math.floor(Math.random() * caracteres.length);
    resultado += caracteres.charAt(indice);
  }
  
  return resultado;
}