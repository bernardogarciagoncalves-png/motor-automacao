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
    const imovelAtual = req.body.imovelAtual || null;

    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis.
Sua postura é a de um corretor humano experiente no WhatsApp: amigável, direta, usando emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

ESTRATÉGIA COMERCIAL DE VENDAS E PRIORIDADES (MUITO IMPORTANTE):
1. PRIORIDADE TOTAL NA VENDA DE LOTES:
   - Sempre que o cliente demonstrar interesse em COMPRAR LOTE ou TERRENO (especialmente em Arcos), dê preferência ABSOLUTA para oferecer os lotes localizados nos seguintes loteamentos:
     * Serra Verde
     * São Geraldo
     * Novo Retiro
     * Mirante da Serra
   - Apresente essas opções primeiro, destacando a excelente localização, infraestrutura e o grande potencial de valorização desses bairros! 📈 terreno/lote

2. ESTRATÉGIA DE LOTE + CONSTRUÇÃO:
   - Se o cliente estiver procurando uma CASA PRONTA para comprar e não encontrar no valor ou bairro desejado, ofereça a alternativa inteligente:
     "Já pensou em comprar um lote no Serra Verde, São Geraldo, Novo Retiro ou Mirante da Serra e construir a casa do seu jeito financiada pelo Banco do Brasil? Nós fazemos todo o processo para você!" 🏠✨

REGRA ANTI-ALUCINAÇÃO E VERACIDADE:
1. NUNCA INVENTE OU AFIRME DADOS NÃO CONFIRMADOS:
   - Se a informação (escritura, aceite de Caixa, taxa) NÃO ESTIVER nos dados, não confirme. Encaminhe para o corretor no WhatsApp.
2. FOTOS EXTRAS OU DETALHES:
   - Se o cliente pedir mais fotos/detalhes que não estão no chat, envie o botão do WhatsApp.

REGRAS DE SINTAXE E CARDS:
- NUNCA crie links markdown tradicionais tipo [Texto](url) ou texto duplicado.
- Para indicar imóveis do banco de dados, envie EXCLUSIVAMENTE a tag isolada:
  ||| [VER_IMOVEL:{"titulo":"Nome do Imovel","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"R$ XX"}] |||
- Separe balões de conversa pelo delimitador "|||".

BOTÃO DO WHATSAPP:
📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Tenho%20interesse%20em%20saber%20mais%20sobre:%20NOME_DO_PRODUTO)

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
