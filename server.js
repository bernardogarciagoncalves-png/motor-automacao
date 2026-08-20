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
    let contextoImoveis = req.body.contexto || req.body.imoveis || req.body.dados || [];
    const historicoConversa = req.body.historico || [];

    // 1. TRATAMENTO E FILTRAGEM DURA VIA CÓDIGO (PREVINE FALHAS DA IA)
    const textoMsg = String(promptDoUsuario).toLowerCase();
    
    if (Array.isArray(contextoImoveis) && contextoImoveis.length > 0) {
      // Se o usuário citou Arcos, removemos QUALQUER imóvel de outra cidade via código
      if (textoMsg.includes('arcos')) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          return dadosStr.includes('arcos') && !dadosStr.includes('bom despacho');
        });
      }
      
      // Se pediu casa/moradia, removemos salas comerciais/lojas via código
      if (textoMsg.includes('casa') || textoMsg.includes('alugar') || textoMsg.includes('morar')) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          return !dadosStr.includes('sala') && !dadosStr.includes('comercial') && !dadosStr.includes('galpão');
        });
      }
    }

    // 2. PROMPT ENXUTO E DIRETO (SEM POLUIÇÃO DE CÓDIGO)
    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis. 
Sua conversa deve ser como a de um corretor humano no WhatsApp: amigável, objetiva, curta e usando emojis.

REGRAS DE CONVERSA:
1. Os imóveis fornecidos no contexto JÁ FORAM FILTRADOS para a cidade e categoria exatas solicitadas.
2. Se houver imóveis disponíveis no contexto, cite brevemente a opção e envie OBRIGATORIAMENTE o card no formato:
   ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
3. Se o contexto estiver VAZIO [], diga que no momento não temos essa opção disponível na cidade/bairro solicitada e pergunte se o cliente gostaria de deixar o WhatsApp para ser avisado ou se deseja simular uma compra/financiamento.
4. JAMAIS crie links no formato markdown tradicional [Texto](url) nem texto como !Imagem. Use APENAS a tag [VER_IMOVEL:{...}] isolada.
5. Separe os balões de conversa pelo delimitador "|||".

IMÓVEIS DISPONÍVEIS E FILTRADOS:
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
