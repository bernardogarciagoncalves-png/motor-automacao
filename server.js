import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/executar-tarefa', async (req, res) => {
  try {
    const promptDoUsuario = req.body.mensagem || req.body.prompt || req.body.texto || "Olá";
    const contextoImoveis = req.body.contexto || req.body.imoveis || req.body.dados || [];
    const historicoConversa = req.body.historico || [];

    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis. 
Sua conversa deve ser idêntica à de um corretor humano no WhatsApp: amigável, acolhedora, curta, com emojis e focada em resolver o problema do cliente.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

REGRA RIGOROSA DE CIDADE E VERIFICAÇÃO DE ESTOQUE (EXTREMAMENTE CRÍTICO):
1. RESPEITE A CIDADE SOLICITADA (FILTRO RÍGIDO):
   - Se a conversa for sobre "Arcos", envie EXCLUSIVAMENTE imóveis localizados em Arcos.
   - JAMAIS insira cards ou mencione imóveis de Bom Despacho, Lagoa da Prata ou outras cidades se o cliente pediu Arcos.

2. QUANDO NÃO HOUVER MAIS OPÇÕES DISPONÍVEIS NO BANCO DE DADOS:
   - Se o cliente perguntar por "outras opções" na mesma cidade e você já tiver mostrado tudo o que existe no banco de dados para aquela categoria (ou só existir 1 opção), NUNCA diga "Seguem mais casas:" sem mandar nada.
   - Diga com transparência e postura comercial:
     "No momento, para aluguel residencial em Arcos, essa do bairro São Pedro é a nossa única opção disponível no site! 🏡 ||| Quer deixar seu nome e WhatsApp para ser avisado em primeira mão assim que entrar uma nova casa para alugar em Arcos? Ou prefere que eu te mostre opções de casas/lotes à VENDA com financiamento?"

3. REGRAS DE CARDS E MENSAGENS:
   - Separe os balões de conversa pelo delimitador "|||".
   - Para enviar cards de imóveis do banco de dados, use APENAS este formato como um trecho isolado por |||:
     ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
   - NUNCA solicite CPF/RG ou documentos pelo chat, e NUNCA agende horários fixos.

BANCO DE DADOS DE IMÓVEIS DISPONÍVEIS:
${JSON.stringify(contextoImoveis, null, 2)}`;

    const mensagensParaOpenAI = [
      { role: "system", content: promptSistema },
      ...historicoConversa,
      { role: "user", content: String(promptDoUsuario) }
    ];

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: mensagensParaOpenAI,
    });

    const resultado = resposta.choices[0].message.content;
    res.status(200).json({ sucesso: true, resultado: resultado });
  } catch (erro) {
    console.error('Erro na automação:', erro);
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
