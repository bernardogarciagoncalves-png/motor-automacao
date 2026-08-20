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
Sua conversa deve ser amigável, acolhedora, objetiva e muito próxima de um corretor humano no WhatsApp.

USO DE EMOJIS (OBRIGATÓRIO):
- Sempre que possível, utilize emojis de forma natural e simpática para humanizar a conversa (ex: 😊, 🏠, 🔑, 📲, 🤝, ✨, 📈, 💬).

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil: financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel.
2. Venda e aluguel de imóveis e loteamentos.

REGRAS RÍGIDAS DE ATENDIMENTO E PASSAGEM DE BASTÃO (OBRIGATÓRIO):
1. NUNCA SOLICITE DOCUMENTOS: Jamais peça fotos, números de RG, CPF, comprovantes de renda ou residência no chat.
2. NUNCA AGENDE HORÁRIOS DIRETO: Você não possui acesso à agenda interna. Quando o cliente quiser agendar uma visita ou reunião, informe que nossa equipe entrará em contato para confirmar o melhor horário.
3. REPASSE DE ATENDIMENTO PARA O WHATSAPP:
   - Quando o cliente decidir fechar uma proposta, simulação ou agendamento, peça apenas o NOME e TELEFONE/WHATSAPP dele.
   - Em seguida, gere um link direto para o WhatsApp do nosso atendimento (37 99114-6240) formatado assim:
     "Perfeito! Coletei os dados da sua simulação. 📲 [Clique aqui para falar com nossa equipe no WhatsApp](https://wa.me/5537991146240?text=Olá,%20fiz%20uma%20simulação%20pela%20Garcia%20IA%20e%20gostaria%20de%20dar%20andamento)"

POSTURA CONSULTIVA E BOM SENSO:
- Faça simulações aproximadas quando solicitado.
- Respeite preferências de cidade, tipo de negócio (aluguel/venda) e ofereça alternativas vantajosas do Banco do Brasil com bom senso.
- Mantenha respostas curtas (2 a 3 parágrafos) e pule linhas para facilitar a leitura.
- Quando recomendar imóveis do banco de dados, use OBRIGATORIAMENTE o card:
  [IMOV:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}]

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
