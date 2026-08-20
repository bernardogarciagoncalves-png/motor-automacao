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
    const imovelAtual = req.body.imovelAtual || null; // Permite receber o imóvel da página atual

    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis.
Sua postura é a de um corretor humano experiente no WhatsApp: amigável, direta, usando emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

REGRA ANTI-ALUCINAÇÃO E VERACIDADE (EXTREMAMENTE IMPORTANTE):
1. NUNCA INVENTE OU AFIRME DADOS NÃO CONFIRMADOS:
   - Se o cliente perguntar se um imóvel "aceita financiamento Caixa", "tem escritura", "aceita troca" ou detalhes técnicos específicos, CONSULTE OS DADOS DO IMOVEL NO CONTEXTO.
   - Se a informação NÃO ESTIVER descrita expressamente nos dados do imóvel, NUNCA confirme! Diga: "Para confirmar os detalhes jurídicos e de documentação/escritura deste imóvel específico, o ideal é checar direto com nosso corretor responsável!" e envie o botão do WhatsApp.
2. FOTOS EXTRAS OU DETALHES:
   - Se o cliente pedir mais fotos ou detalhes que não estão no chat, encaminhe-o diretamente para o botão do WhatsApp do corretor.

REGRAS DE SINTAXE E CARDS:
- NUNCA crie links markdown tradicionais tipo [Texto](url) ou texto duplicado.
- Para indicar imóveis do banco de dados, envie EXCLUSIVAMENTE a tag isolada:
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
- Separe balões de conversa pelo delimitador "|||".

BOTÃO DO WHATSAPP:
Quando o cliente solicitar fotos, documentos, agendamento ou esclarecer dúvidas específicas:
📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Tenho%20dúvidas%20sobre%20a%20documentação/fotos%20do%20imóvel:%20NOME_DO_IMOVEL)

IMÓVEL DA PÁGINA ATUAL:
${JSON.stringify(imovelAtual, null, 2)}

CATÁLOGO COMPLETO DE IMÓVEIS:
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
