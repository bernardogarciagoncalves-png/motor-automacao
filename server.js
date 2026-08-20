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

// Conexão com Supabase para consultar o histórico de aprendizado
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/api/executar-tarefa', async (req, res) => {
  try {
    const promptDoUsuario = req.body.mensagem || req.body.prompt || req.body.texto || "Olá";
    const contextoImoveis = req.body.contexto || req.body.imoveis || req.body.dados || [];
    const historicoConversa = req.body.historico || [];
    const imovelAtual = req.body.imovelAtual || null;

    // 1. Busca os últimos aprendizados no Supabase (Casos de Sucesso e Correções)
    let exemplosAprendizado = "";
    try {
      const { data: feedbacks } = await supabase
        .from('historico_aprendizado')
        .select('pergunta, resposta, avaliacao')
        .order('created_at', { ascending: false })
        .limit(5);

      if (feedbacks && feedbacks.length > 0) {
        exemplosAprendizado = "\n\nMEMÓRIA DE APRENDIZADO CONTINUO (LIÇÕES APRENDIDAS COM ATENDIMENTOS ANTERIORES):\n";
        feedbacks.forEach(item => {
          if (item.avaliacao === 'sucesso' || item.avaliacao === 'positivo') {
            exemplosAprendizado += `- BOM EXEMPLO (Converteru em Lead): Quando perguntaram "${item.pergunta}", a resposta foi bem avaliada: "${item.resposta}"\n`;
          } else if (item.avaliacao === 'falha' || item.avaliacao === 'negativo') {
            exemplosAprendizado += `- ERRO A EVITAR (Não repita): Quando perguntaram "${item.pergunta}", o cliente não gostou da resposta: "${item.resposta}"\n`;
          }
        });
      }
    } catch (errSupabase) {
      console.log('Aviso: Tabela de aprendizado ainda não encontrada ou sem dados:', errSupabase.message);
    }

    const promptSistema = `Você é a Garcia IA, assistente e consultora de vendas da Garcia Imóveis.
Sua postura é a de um corretor humano experiente no WhatsApp: amigável, direta, usando emojis e objetiva.

INFORMAÇÕES DA EMPRESA:
1. Correspondente Bancário do Banco do Brasil (financiamentos imobiliários, crédito consignado, empréstimos com garantia de imóvel).
2. Venda e aluguel de imóveis e loteamentos em Arcos, Bom Despacho, Lagoa da Prata e região.

ESTRATÉGIA COMERCIAL DE VENDAS E PRIORIDADES:
1. PRIORIDADE TOTAL NA VENDA DE LOTES:
   - Sempre que o cliente demonstrar interesse em COMPRAR LOTE ou TERRENO (especialmente em Arcos), dê preferência ABSOLUTA para oferecer os lotes nos loteamentos: Serra Verde, São Geraldo, Novo Retiro e Mirante da Serra.
2. ESTRATÉGIA DE LOTE + CONSTRUÇÃO:
   - Se procurar casa pronta e não achar no valor/bairro, ofereça comprar o lote nesses bairros + financiamento de construção pelo Banco do Brasil!

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
