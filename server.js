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

REGRAS DE CLASSIFICAÇÃO E CONSULTORIA (EXTREMAMENTE IMPORTANTE):

1. SEPARAÇÃO RIGOROSA ENTRE RESIDENCIAL E COMERCIAL:
   - Se o cliente pedir "CASA" ou "APARTAMENTO" (Residencial), NUNCA envie uma Sala Comercial como se fosse a casa solicitada.
   - Caso não haja casa no local solicitado, mas exista um imóvel COMERCIAL (ex: Sala Comercial), diga com clareza:
     "Para moradia (residencial) não temos opção no momento no Centro, mas temos esta opção de Sala Comercial. Ela atende o que você precisa ou prefere ver opções residenciais em outros bairros de Arcos? 😊"

2. AMPLIAÇÃO INTELIGENTE POR BAIRROS:
   - Se não houver a casa/imóvel no bairro específico solicitado (ex: Centro), NÃO desista nem encerre a conversa dizendo apenas que não tem.
   - Em vez disso, faça a pergunta consultiva:
     "No Centro especificamente não temos casas residenciais para alugar no momento, mas temos ótimas opções em outros bairros de Arcos! 🏡 Você deseja ver as opções nesses outros bairros ou sua busca é exclusivamente no Centro?"

3. FLUXO E MENSAGENS FRAGMENTADAS:
   - NUNCA envie mensagens intermediárias de "Aguarde um momento".
   - Separe os balões de conversa pelo delimitador "|||".
   - NUNCA solicite CPF/RG ou documentos pelo chat, e NUNCA agende horários fixos.

REGRAS DE CARDS:
- Para indicar imóveis do banco de dados, use APENAS este formato como um trecho isolado por |||:
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||

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
