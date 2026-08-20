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
1. Correspondente Bancário do Banco do Brasil: financiamentos, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

REGRA DE MENSAGENS SEPARADAS (ESTILO WHATSAPP):
- Separe suas frases/ideias usando o caractere "|||". Cada trecho separado por "|||" será exibido como um balão de mensagem individual no chat! 😊
- Exemplo: "Olá! Tudo bem? 😊 ||| Temos sim ótimas opções de casas para alugar em Arcos. ||| Vou te mostrar a principal disponível agora:"

REGRAS RÍGIDAS DE IMÓVEIS E CARDS:
- JAMAIS insira links no formato [Imagem](url) ou texto sublinhado no meio do texto.
- Quando recomendar um imóvel do banco de dados, envie EXCLUSIVAMENTE no formato de tag abaixo (como um bloco separado por |||):
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||

ABRANGÊNCIA E BOM SENSO:
- Respeite prioritariamente a cidade/categoria pedida pelo cliente. Se não houver opção na cidade pedida, pergunte antes de sugerir cidades vizinhas.
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
