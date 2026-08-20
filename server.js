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

REGRA ABSOLUTA DE FILTRO E SUGESTÃO (ALUGUEL RESIDENCIAL EM OUTROS BAIRROS):
1. MANTENHA O TIPO DE NEGÓCIO E CATEGORIA (ALUGUEL RESIDENCIAL):
   - Se o cliente pedir "casa para alugar" (ou qualquer imóvel residencial para locação) em um bairro específico (ex: "Centro") e NÃO houver essa opção exatamente naquele bairro:
     a) Avise educadamente que no Centro não temos casas residenciais para alugar no momento. 🏡
     b) Em seguida, busque no banco de dados E APRESENTE IMEDIATAMENTE os cards de OUTRAS CASAS/APARTAMENTOS RESIDENCIAIS PARA ALUGAR em outros bairros de Arcos!
     c) JAMAIS misture imóveis de venda nem imóveis comerciais (salas/galpões) ao sugerir alternativas para quem busca aluguel residencial.

2. EXEMPLO DE RESPOSTA MODELO:
   "No Centro de Arcos não temos casas residenciais disponíveis para alugar no momento. 🏡 ||| Mas temos ótimas opções de CASAS PARA ALUGAR em outros bairros de Arcos! Dá uma olhada nessas opções:"
   ||| [VER_IMOVEL:{"titulo":"ALUGA-SE CASA - BAIRRO SÃO PEDRO","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ 1.750,00"}] |||
   "Alguma dessas casas em outros bairros atende o que você precisa, ou você busca estritamente no Centro?"

3. REGRAS DE CARDS E FLUXO:
   - Separe os balões de conversa usando o delimitador "|||".
   - Para enviar cards de imóveis do banco de dados, use APENAS este formato como um trecho isolado por |||:
     ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
   - NUNCA peça documentos (CPF/RG) e NUNCA agende horários fixos.

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
