import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Conexão segura com Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.log('Aviso: Erro ao inicializar o cliente Supabase:', err.message);
  }
}

app.post('/api/executar-tarefa', async (req, res) => {
  try {
    const promptDoUsuario = req.body.mensagem || req.body.prompt || req.body.texto || "Olá";
    let contextoImoveis = req.body.contexto || req.body.imoveis || req.body.dados || [];
    const historicoConversa = req.body.historico || [];
    const imovelAtual = req.body.imovelAtual || null;

    // =========================================================================
    // FILTRAGEM INTELIGENTE E AMPLA DE CATEGORIAS (SEM IGNORAR 'CONSULTE A CONDIÇÃO')
    // =========================================================================
    const textoMsg = String(promptDoUsuario).toLowerCase();

    if (Array.isArray(contextoImoveis) && contextoImoveis.length > 0) {
      const palResidenciais = ['casa', 'apartamento', 'sobrado', 'kitnet', 'mansao', 'mansão', 'morar', 'residencial', 'cobertura', 'residencia'];
      const palComerciais = ['sala', 'comodo', 'cômodo', 'galpao', 'galpão', 'loja', 'comercial', 'predio comercial', 'prédio comercial'];

      const pedeResidencial = palResidenciais.some(p => textoMsg.includes(p));
      const pedeComercial = palComerciais.some(p => textoMsg.includes(p));

      // Se o cliente pediu moradia (casa, apto, mansão, residencial), REMOVE APENAS COMERCIAIS
      if (pedeResidencial && !pedeComercial) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          const eComercial = palComerciais.some(c => dadosStr.includes(c));
          return !eComercial; // Mantém tudo que NÃO é comercial (incluindo Mansão e Consulte a Condição)
        });
      }

      // Se o cliente pediu comercial (sala, galpão, loja), REMOVE RESIDENCIAIS
      if (pedeComercial && !pedeResidencial) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          const eComercial = palComerciais.some(c => dadosStr.includes(c));
          return eComercial;
        });
      }
    }

    // 1. Consulta aprendizados de forma segura no Supabase
    let exemplosAprendizado = "";
    if (supabase) {
      try {
        const { data: feedbacks } = await supabase
          .from('historico_aprendizado')
          .select('pergunta, resposta, avaliacao')
          .order('created_at', { ascending: false })
          .limit(5);

        if (feedbacks && feedbacks.length > 0) {
          exemplosAprendizado = "\n\nMEMÓRIA DE APRENDIZADO CONTINUO (LIÇÕES APRENDIDAS):\n";
          feedbacks.forEach(item => {
            if (item.avaliacao === 'sucesso' || item.avaliacao === 'positivo') {
              exemplosAprendizado += `- BOM EXEMPLO: Quando perguntaram "${item.pergunta}", a resposta foi bem avaliada: "${item.resposta}"\n`;
            } else if (item.avaliacao === 'falha' || item.avaliacao === 'negativo') {
              exemplosAprendizado += `- ERRO A EVITAR: Quando perguntaram "${item.pergunta}", o cliente não gostou da resposta: "${item.resposta}"\n`;
            }
          });
        }
      } catch (errSupabase) {
        console.log('Aviso: Tabela historico_aprendizado não acessível ainda:', errSupabase.message);
      }
    }

    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis.
Sua postura é a de um corretor humano experiente no WhatsApp: amigável, direta, usando emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

CLASSIFICAÇÃO RÍGIDA DE IMÓVEIS (EXTREMAMENTE IMPORTANTE):
1. ALUGUEL RESIDENCIAL (para morar):
   - Inclui: "casa", "apartamento", "sobrado", "kitnet", "mansão", "cobertura residencial".
   - AVISO DE PREÇO: Se o imóvel tiver o preço como "Consulte a Condição", exiba normalmente o card e informe o preço como "Consulte a Condição".
   - EXIBIÇÃO OBRIGATÓRIA: Quando o cliente pedir moradia/casa para alugar em uma cidade (ex: Arcos), VOCÊ DEVE EXIBIR TODOS os imóveis residenciais de aluguel dessa cidade no banco de dados, INCLUINDO MANSÕES!
2. ALUGUEL COMERCIAL (para empresas/negócios):
   - Inclui: "sala", "cômodo", "galpão", "loja", "prédio comercial".
   - JAMAIS ofereça salas/galpões para quem pede casa ou moradia.

ESTRATÉGIA COMERCIAL DE VENDAS E PRIORIDADES:
1. PRIORIDADE TOTAL NA VENDA DE LOTES:
   - Sempre que o cliente demonstrar interesse em COMPRAR LOTE ou TERRENO (especialmente em Arcos), dê preferência ABSOLUTA para oferecer os lotes nos loteamentos: Serra Verde, São Geraldo, Novo Retiro e Mirante da Serra.
2. ESTRATÉGIA DE LOTE + CONSTRUÇÃO:
   - Se procurar casa pronta para comprar e não achar no valor/bairro, ofereça comprar o lote nesses bairros + financiamento de construção pelo Banco do Brasil!

PEDIDO DIRETO DE AVALIAÇÃO DE ATENDIMENTO:
- Sempre que concluir uma ajuda, indicar opções ou enviar o botão de contato do WhatsApp, adicione uma frase curta convidando o cliente a avaliar a resposta:
  "O meu atendimento te ajudou? Clique no 👍 ou 👎 abaixo para me ajudar a melhorar sempre! 😊"

REGRA ANTI-ALUCINAÇÃO E VERACIDADE:
- NUNCA invente dados de escritura, habite-se ou taxas. Se não souber, encaminhe para o WhatsApp.

REGRAS DE CARDS E WHATSAPP:
- Mande cards APENAS na tag isolada: ||| [VER_IMOVEL:{"titulo":"...","imagem":"...","link":"...","preco":"..."}] |||
- Botão WhatsApp: 📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Tenho%20interesse%20em:%20NOME_DO_PRODUTO)
${exemplosAprendizado}

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
