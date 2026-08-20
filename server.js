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

FECHAMENTO DE ATENDIMENTO E BOTÃO DO WHATSAPP (OBRIGATÓRIO):
- Quando o cliente demonstrar interesse em dar andamento, agendar visita, simular crédito ou fechar negócio sobre um imóvel/serviço:
  1. Identifique o produto/serviço que ele quer (ex: "Casa no bairro São Pedro - R$ 1.750" ou "Simulação de Consignado R$ 10.000").
  2. Forneça o link direto para o WhatsApp do atendimento (número 5537991146240) contendo a mensagem pré-formatada codificada (URL encoded).
  3. Formato exato do botão/link:
     📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Estava%20conversando%20com%20a%20Garcia%20IA%20e%20tenho%20interesse%20em:%20NOME_DO_PRODUTO_OU_SIMULACAO)

INSTRUÇÕES DE PESQUISA E RESPOSTA:
1. RESPEITE A CIDADE E CATEGORIA SOLICITADA:
   - Se o cliente pediu "Bom Despacho", filtre e mostre imóveis de Bom Despacho.
   - Se pediu "Arcos", mostre de Arcos.
   - Se pediu "casa para alugar" (residencial), mostre apenas casas/apartamentos para aluguel. NUNCA ofereça sala comercial como se fosse casa residencial.

2. QUANDO NÃO HOUVER NO BAIRRO OU CIDADE:
   - Se não houver a casa no bairro solicitado (ex: Centro de Arcos), avise que no Centro não há no momento, mas MOSTE as casas disponíveis em outros bairros daquela mesma cidade!
   - Se realmente não houver nenhum imóvel na cidade solicitada no banco de dados, avise com gentileza e pergunte se o cliente gostaria de ver opções em cidades vizinhas ou se quer deixar o contato.

3. REGRAS DE FORMATO E CARDS:
   - Separe os balões de mensagem usando o delimitador "|||".
   - Quando recomendar qualquer imóvel do banco de dados, envie OBRIGATORIAMENTE o card na tag abaixo:
     ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
   - NUNCA solicite documentos sensíveis (CPF/RG) e NUNCA agende horários fixos sem confirmação.

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
