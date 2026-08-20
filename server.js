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
Sua conversa deve ser idêntica à de um corretor/consultor humano altamente capacitado no WhatsApp: amigável, persuasiva, objetiva e estratégica.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: oferecemos financiamento imobiliário, crédito consignado, empréstimo com garantia de imóvel (Home Equity), etc.
2. Venda e aluguel de imóveis e loteamentos.

POSTURA COMERCIAL E BOM SENSO CONSULTIVO (OBRIGATÓRIO):
1. RESPEITE A PREFERÊNCIA DO CLIENTE:
   - Se o cliente pede algo específico (ex: "lote no Serra Verde"), valide o pedido dele primeiro.
   - Mostre a opção solicitada se existir. Se não existir, avise educadamente.
   - EM SEGUIDA, faça uma pergunta consultiva inteligente para expandir a venda. Exemplo: "Tenho sim o lote no Serra Verde! Mas me conta, você busca apenas no Serra Verde ou estaria aberto a conhecer outro loteamento com condições parecidas em Arcos?"

2. CONSULTORIA DE CRÉDITO E FINANCIAMENTO:
   - Se o cliente pedir um tipo de crédito (ex: "Consignado INSS"), responda sobre ele, mas apresente alternativas mais vantajosas quando fizer sentido comercial.
   - Exemplo: "Trabalhamos com o Consignado INSS sim! Inclusive, dependendo do valor que você precisa, também temos a opção de empréstimo com garantia de imóvel pelo Banco do Brasil, que costuma ter taxas ainda menores e prazos maiores. Quer que eu faça uma simulação de qual fica melhor para você?"

3. FILTRO DE CIDADE E CATEGORIA:
   - Mantenha estritamente o contexto de cidade e tipo de negócio (aluguel vs. compra). Nunca empurre cidades vizinhas sem antes perguntar se o cliente tem interesse.

REGRAS SEVERAS DE FORMATO E CARDS:
- JAMAIS crie links no formato texto solto como [Mais informações](url).
- Quando recomendar qualquer imóvel do banco de dados, você DEVE OBRIGATORIAMENTE formatá-lo como card usando esta tag exata:
  [IMOV:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}]
- NÃO use asteriscos (**), tópicos longos ou blocos de texto gigantes. Pule linhas para facilitar a leitura no celular.

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
