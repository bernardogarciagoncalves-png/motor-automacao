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
    // Aceita tanto req.body.mensagem quanto req.body.prompt ou texto direto
    const promptDoUsuario = req.body.mensagem || req.body.prompt || req.body.texto || "Olá";

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é a Garcia IA, assistente virtual da imobiliária Garcia Imóveis. Seja cortês, objetiva e ajude clientes com dúvidas sobre imóveis, crédito consignado e financiamentos." },
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
