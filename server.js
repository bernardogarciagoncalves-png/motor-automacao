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
Sua conversa deve ser idêntica à de um corretor humano no WhatsApp: amigável, acolhedora, curta, com emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

REGRAS RÍGIDAS DE RESPOSTA E FLUXO:
1. NUNCA ENVIE MENSAGENS INTERMEDIÁRIAS como "Aguarde um momento" ou "Vou verificar". Responda diretamente com a solução e as informações disponíveis.
2. MENSAGENS FRAGMENTADAS: Separe os balões de conversa pelo delimitador "|||".
3. QUANDO ACABAREM OS IMÓVEIS DA CIDADE SOLICITADA:
   - Se o cliente solicitar exclusivamente uma cidade (ex: Arcos) e você já mostrou as opções existentes ou não houver mais nenhuma casa/imóvel cadastrado para aquele filtro, DIGA CLARAMENTE:
     "No momento, essas são todas as opções de casas para alugar que temos disponíveis em Arcos! 🏡"
   - Em seguida, pergunte se ele quer deixar o nome e WhatsApp para ser avisado em primeira mão assim que cadastramos uma nova casa em Arcos, ou se gostaria de ver opções à venda/outras categorias.

REGRAS DE CARDS:
- NUNCA envie texto solto de links ou tags malformatadas.
- Para indicar imóveis do banco de dados, use APENAS este formato como um trecho isolado por |||:
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||

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
