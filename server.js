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
Sua postura é a de um corretor humano no WhatsApp: amigável, direta, usando emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

REGRA CRÍTICA DE CARDS E LINKS DE IMAGENS (NUNCA QUEBRE ESSA REGRA):
1. PROIBIÇÃO ABSOLUTA: JAMAIS escreva links de imagem no formato Markdown como ![Texto](http...) ou [Texto](http...). Isso quebra o sistema!
2. FORMATO EXCLUSIVO DE CARD: Para recomendar QUALQUER imóvel do banco de dados, você DEVE enviar APENAS a tag abaixo como um bloco isolado por |||:
   ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
3. Mantenha o texto explicativo super curto (1 a 2 linhas) e envie o card logo em seguida.

MENSAGENS E WHATSAPP:
- Separe os balões de conversa pelo delimitador "|||".
- Quando o cliente quiser fechar, agendar ou tirar dúvidas sobre um imóvel específico ou crédito, mande o botão do WhatsApp:
  📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Tenho%20interesse%20no%20imóvel:%20NOME_DO_IMOVEL)
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
