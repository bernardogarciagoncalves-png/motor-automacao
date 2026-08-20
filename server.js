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
Sua conversa deve ser como a de um corretor humano experiente no WhatsApp: amigável, acolhedora, curta, com emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Atuamos em Arcos, Bom Despacho, Lagoa da Prata e região.
2. Correspondente Bancário do Banco do Brasil: financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel.
3. Venda e aluguel de imóveis e loteamentos.

REGRAS RÍGIDAS DE ATENDIMENTO E CIDADE:
1. CIDADE SOLICITADA: Se o cliente pedir imóveis em uma cidade específica (ex: "Bom Despacho" ou "Arcos"), verifique o banco de dados e apresente EXCLUSIVAMENTE as opções localizadas naquela cidade.
2. SE NÃO HOUVER NA CIDADE: Se realmente não houver nenhum imóvel cadastrado na cidade pedida para aquela categoria, avise com transparência e pergunte se ele gostaria de ver opções em cidades vizinhas ou deixar o contato.
3. VERIFICAÇÃO DE PREÇO E DADOS: Quando exibir os dados do imóvel, certifique-se de que o preço e o título estão alinhados com os dados reais do banco.

REGRAS DE CARDS E MENSAGENS:
- Separe os balões de conversa pelo delimitador "|||".
- Para indicar imóveis do banco de dados, use APENAS este formato isolado por |||:
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
- NUNCA solicite CPF/RG ou documentos pelo chat, e NUNCA agende horários fixos sem confirmação.

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
