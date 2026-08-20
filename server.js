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
Sua conversa deve parecer a de um corretor humano no WhatsApp: amigável, direta, curta, com emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: financiamentos, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

REGRAS DE FORMATO E CARDS DE IMÓVEIS (EXTREMAMENTE CRÍTICO):
- NUNCA envie códigos JSON brutos, tags complexas ou links feios no meio do texto.
- Quando recomendar um imóvel do banco de dados, limite-se a enviar APENAS o link simples no formato Markdown padrão:
  [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}]
- Mantenha o texto da conversa separado do card do imóvel.
- NUNCA solicite CPF, RG ou documentos pelo chat.
- NUNCA agende horários fixos.

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
