/**
 * Função Principal: Insere o token apenas se a célula ativa for na coluna correta.
 */
function inserirTokenNaCelula() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const cell = sheet.getActiveCell();
  
  // 1. Verificação de Segurança: Aba Correta
  if (sheet.getName() !== aba.CONTROLE_ACESSO) {
    ss.toast("⚠️ Esta função só funciona na aba " + aba.CONTROLE_ACESSO, "Ação Cancelada");
    return;
  }

  // 2. Verificação de Segurança: Cabeçalho
  if (cell.getRow() === 1) {
    SpreadsheetApp.getUi().alert('⚠️ Selecione uma linha abaixo do cabeçalho.');
    return;
  }

  // 3. MAPEAMENTO DINÂMICO
  const cabecalhos = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndexToken = cabecalhos.indexOf(COLUNAS_CONTROLE_ACESSO.TOKEN) + 1;

  // 4. Bloqueio: Verifica se o usuário está na coluna de TOKEN
  if (cell.getColumn() !== colIndexToken) {
    SpreadsheetApp.getUi().alert('⚠️ Ação Proibida: Você só pode gerar tokens na coluna "' + COLUNAS_CONTROLE_ACESSO.TOKEN + '".');
    return;
  }

  // 5. Motor de geração (Passa o índice dinâmico para checar duplicidade)
  try {
    const novoToken = gerarTokenUnico(sheet, colIndexToken);
    cell.setValue(novoToken);
    ss.toast("Token gerado com sucesso!", "✅ Concluído");
  } catch (e) {
    SpreadsheetApp.getUi().alert(e.message);
  }
}

/**
 * Motor de Geração: Garante que o token não exista na coluna mapeada.
 */
function gerarTokenUnico(sheet, colIndex) {
  const lastRow = sheet.getLastRow();
  let tokensExistentes = [];

  // Pega todos os tokens já cadastrados na coluna mapeada
  if (lastRow > 1) {
    tokensExistentes = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().flat();
  }

  let token = "";
  let isDuplicado = true;
  let countSeguranca = 0;

  do {
    token = criarStringAleatoria();
    
    if (tokensExistentes.indexOf(token) === -1) {
      isDuplicado = false; 
    } else {
      console.log("Colisão de token detectada: " + token);
    }

    countSeguranca++;
    if (countSeguranca > 500) throw new Error("Erro Crítico: Não foi possível gerar um token único após 500 tentativas.");

  } while (isDuplicado);

  return token;
}

/**
 * Alfabeto Seguro: Remove letras que causam confusão (0, O, 1, I, L)
 */
function criarStringAleatoria() {
  const caracteres = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
  const tamanho = 6;
  let resultado = "";
  
  for (let i = 0; i < tamanho; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    resultado += caracteres.charAt(indice);
  }
  
  return resultado;
}