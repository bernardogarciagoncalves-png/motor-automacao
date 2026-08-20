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
    const contextoImoveis = req.body.contexto || req.body.imoveis || req.body.dados || "Nenhum imóvel específico filtrado.";

    const promptSistema = `Você é a Garcia IA, assistente da Garcia Imóveis.
Sua missão é apresentar e recomendar imóveis/créditos aos clientes com base no banco de dados abaixo.

IMÓVEIS/PRODUTOS DISPONÍVEIS NO BANCO DE DADOS:
${JSON.stringify(contextoImoveis, null, 2)}

REGRAS OBRIGATÓRIAS:
1. Ao sugerir um imóvel ou serviço, SEMPRE inclua o link correspondente no formato Markdown [Nome do Imóvel](URL_DO_IMOVEL).
2. Se o imóvel procurado estiver no banco de dados, detalhe o preço, localização e recursos principais.
3. Seja amigável, direta e focada em vendas.`;

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
