/** ESCOPO PADRÃO DE VARIAVEIS GLOBAIS */

// LISTA DE ABAS
const aba = {
  CONTROLE_ACESSO: 'CONTROLE_ACESSO',
  DEBUG_WPP: 'DEBUG_WPP',
  CONFIGURACOES: 'CONFIGURAÇÕES',
  CONTATOS_UTEIS: 'CONTATOS ÚTEIS',
  CALENDARIO_PROMOÇÕES: 'CALENDARIO_PROMOÇÕES',
  TAXAS_AERO: 'TAXAS_AERO',
  PROBLEMAS_SOLUCOES: 'PROBLEMAS E SOLUÇÕES',
  ALERTAS: 'ALERTAS',
  RADAR_NOTICIAS: 'RADAR_NOTICIAS'
};

// LISTA DE INTERVALOS OU CÉLULAS DE CONFIGURAÇÕES
const intvConfig = {
  TAB_TAXAS_AERO: 'B2:G',
  TAB_CPM_VPM: 'A4:E',
  MSG_ALERTA_GP: 'G3',
  MSG_WPP_TEMPLATE: 'I3', // <--- NOVO: Template da mensagem do Zap
  MSG_WPP_BALCAO_TEMPLATE: 'M3',
  MARGEM_EMISSAO: 'K3'
};

// LISTA DE LINKS DE ACESSO (URL, E-MAIL, USUÁRIO, LOGIN, TOKEN, ID, CHAVE DE API, etc...)
const controlAcess = Object.freeze({
  URL_ENCURTADOR: 'https://familha.suportvip.com/wp-admin/admin-ajax.php',
  SENHA_ENCURTADOR: 'FamilhasSecret24'
});



// ============================================================================
// 4. CONFIGURAÇÕES GERAIS DO SISTEMA
// ============================================================================

const configGeral = Object.freeze({
  ID_PLANILHA_ADM:  '1bSSIkpeuTmGoQs12cuKjnEqrOzShDZtM0kiJofZxEjs',
  URL_API_WHATSAPP:  'https://api.whatsapp.com/send',
  ID_GRUPO_VIP_DESTINO: "120363425737586302@g.us", //120363423216550836@g.us grupo Emissões anterior
  ID_GRUPO_BALCAO: '120363409629184262@g.us',
  ID_GRUPO_TESTE: '120363405919244458@g.us',
  ID_GRUPO_BALCAO_INTERNO: "120363423216550836@g.us",
  URL_API_NGROK: "https://talon-unspiteful-magdalen.ngrok-free.dev",
  TOKEN_WPPCONNECT: "$2b$10$uQQLWEEB6znNHFsDs6OgdOmX87eZH.mSogatS1MW8JZRaUKirkf9G",
  TELEFONE_AGENCIA: "5583989073178",
  // 🧹 CONFIGURAÇÕES DE LIMPEZA DA ABA ALERTAS
  LIMITE_LINHAS_ALERTAS: 1000, // Dispara a limpeza se passar desse número
  QTD_EXCLUIR_ALERTAS: 400     // Quantidade de linhas para apagar do final
});

const MAPA_CORRECAO = {
  "MADRI": "MADRID", "NOVA IORQUE": "NOVA YORK", "NEW YORK": "NOVA YORK",
  "SAO PAULO": "SAO PAULO", "RIO DE JANEIRO": "RIO DE JANEIRO"
};

const BLACKLIST_SMS = /vivo|oi|tim|promoção|oferta|desconto|sorteio|compre agora|parabens voce ganhou|bet|ganhou|clique no link|cupom|bet365|tigrinho|liquidação/i;

const BLACKLIST_MSG_CAPTURA = [
  "bom dia", "boa tarde", "boa noite", "alguém sabe", "dúvida", 
  "ajuda", "chama no pv", "seja bem vindo", "entrou usando", "reset link"
];

// Filtra frases de propaganda
const BLACKLIST_PROPAGANDAS = [
  "Valor IDA e VOLTA", "comprando milhas em promoções", "preço médio para emissão",
  "para emissão na Milhas VIP", "Compre no pix", "Compre com suas próprias",
  "Agência do Alerta", "wa.me", "smiles.com.br", "latamairlines", "voeazul",
  "😎 Emita com a Milhas VIP", "✅ Emissão com a companhia usando milhas:", "Milhas VIP",
  "Os valores informados acima podem variar", "Preço médio para esse voo", 
  "✅ Compre com suas próprias milhas:","wa.me","Agência do Alerta", "Compre no pix"
];

const PALAVRA_CHAVE_CAPTURA = [
  "milhas", "pontos", "r$", "voo", "trecho",
  "ida", "volta", "promo", "desconto", "tarifas"
];

// 🟢 ORIGEM (Onde pegamos as ofertas)
const GRUPOS_PERMITIDOS = [
  "120363161899311424@g.us", // milhas nordestinas
  //"120363422378687677@g.us", // milhas084
  configGeral.ID_GRUPO_TESTE // grupo teste
];

const GRUPOS_IGNORADOS = [
  configGeral.ID_GRUPO_VIP_DESTINO // GRUPO FÃMILHASVIP de EMISSÕES (Para evitar loop infinito)
];