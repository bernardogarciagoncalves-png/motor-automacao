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

    const promptSistema = `Você é a Garcia IA, assistente da Garcia Imóveis. 
Sua conversa deve parecer a de um corretor humano no WhatsApp: amigável, direta, curta e objetiva.

INFORMAÇÕES CHAVE DA IMPRESA:
1. Atuamos como CORRESPONDENTE BANCÁRIO DO BANCO DO BRASIL. Oferecemos financiamentos imobiliários, crédito consignado, empréstimos com garantia e opções facilitadas.
2. Também oferecemos opções de loteamentos com financiamento próprio e sem entrada.

REGRAS DE FORMATAÇÃO E TOM (OBRIGATÓRIO):
- NÃO use asteriscos (**) nem símbolos excessivos de formatação.
- Faça frases curtas e pule linhas entre os pensamentos para facilitar a leitura.
- Responda em no máximo 2 a 3 parágrafos curtos. Termine sempre fazendo uma pergunta amigável para continuar o diálogo.
- Quando recomendar um imóvel do banco de dados, envie no seguinte formato Markdown exato:
  [IMOV:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}]

BANCO DE DADOS DE IMÓVEIS DISPONÍVEIS:
${JSON.stringify(contextoImoveis, null, 2)}`;

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: promptSistema },
        { role: "user", content: String(promptDoUsuario) }
      ],
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
