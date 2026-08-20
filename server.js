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

// Rota de teste
app.get('/', (req, res) => {
  res.send('Motor de automação está online e pronto! 🚀');
});

// Rota para a IA processar tarefas
app.post('/api/executar-tarefa', async (req, res) => {
  try {
    const { instrucao, dadosEntrada } = req.body;

    const resposta = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: instrucao },
        { role: 'user', content: dadosEntrada },
      ],
    });

    const resultado = resposta.choices[0].message.content;
    res.status(200).json({ sucesso: true, resultado });
  } catch (erro) {
    console.error('Erro na automação:', erro);
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
