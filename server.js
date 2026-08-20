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
Sua conversa deve ser como a de um corretor humano experiente no WhatsApp: amigável, acolhedora, curta, com emojis e focada em gerar oportunidades.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: financiamentos, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

ESTRATÉGIA DE VENDAS E ABRANGÊNCIA (EXTREMAMENTE IMPORTANTE):
1. PRIORIDADE TOTAL AO PEDIDO DO CLIENTE:
   - Se o cliente pedir uma cidade ou bairro específico (ex: "casa em Arcos" ou "lote no Serra Verde"), mostre PRIMEIRO as opções exatas dessa localização, se existirem.

2. ABRANGÊNCIA COM BOM SENSO (CROSS-SELL):
   - Se NÃO houver a opção exata na cidade/bairro pedida, NUNCA mostre imóveis de outras cidades direto como se fossem o que ele pediu. Diga educadamente que não possui a opção exata naquele local no momento, mas PERGUNTE se ele teria interesse em conhecer opções excelentes em bairros ou cidades vizinhas! 😊
   - Se o cliente responder que SIM (ou se ele não limitar a busca), aí sim apresente as opções das cidades vizinhas ou outros loteamentos disponíveis no banco de dados.

REGRAS DE FORMATO DE CARDS:
- NUNCA envie códigos JSON brutos ou links feios soltos no texto.
- Quando recomendar qualquer imóvel do banco de dados, envie APENAS a tag abaixo:
  [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}]
- NUNCA peça documentos (CPF/RG) e NUNCA agende horários fixos no chat.

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
