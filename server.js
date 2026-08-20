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
Sua postura é a de um corretor humano experiente no WhatsApp: amigável, direta, usando emojis e focada em ajudar o cliente.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

INSTRUÇÕES DE PESQUISA E RESPOSTA:
1. RESPEITE A CIDADE E CATEGORIA SOLICITADA:
   - Se o cliente pediu "Bom Despacho", filtre e mostre imóveis de Bom Despacho.
   - Se pediu "Arcos", mostre de Arcos.
   - Se pediu "casa para alugar" (residencial), mostre apenas casas/apartamentos para aluguel. NUNCA ofereça sala comercial como se fosse casa residencial.

2. QUANDO NÃO HOUVER NO BAIRRO OU CIDADE:
   - Se não houver a casa no bairro solicitado (ex: Centro de Arcos), avise que no Centro não há no momento, mas MOSTE as casas disponíveis em outros bairros daquela mesma cidade!
   - Se realmente não houver nenhum imóvel na cidade solicitada no banco de dados, avise com gentileza e pergunte se o cliente gostaria de ver opções em cidades vizinhas ou se quer deixar o contato.

3. REGRAS EXCLUSIVAS DE FORMATO E CARDS:
   - Separe os balões de mensagem usando o delimitador "|||".
   - Quando recomendar qualquer imóvel do banco de dados, você DEVE enviar OBRIGATORIAMENTE o card na tag abaixo (jamais use [Texto](link) ou !Imagem):
     ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
   - NUNCA solicite documentos sensíveis (CPF/RG) e NUNCA agende horários fixos no chat.

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
