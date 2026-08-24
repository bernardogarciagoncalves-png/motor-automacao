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
    // FILTRAGEM DE CATEGORIAS (PRESERVA MANSÃO E CONSULTE A CONDIÇÃO)
    // =========================================================================
    const textoMsg = String(promptDoUsuario).toLowerCase();

    if (Array.isArray(contextoImoveis) && contextoImoveis.length > 0) {
      const palResidenciais = ['casa', 'apartamento', 'sobrado', 'kitnet', 'mansao', 'mansão', 'morar', 'residencial', 'cobertura', 'residencia'];
      const palComerciais = ['sala', 'comodo', 'cômodo', 'galpao', 'galpão', 'loja', 'comercial', 'predio comercial', 'prédio comercial'];

      const pedeResidencial = palResidenciais.some(p => textoMsg.includes(p));
      const pedeComercial = palComerciais.some(p => textoMsg.includes(p));

      // Se pediu residencial, FILTRA fora os comerciais
      if (pedeResidencial && !pedeComercial) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          const eComercial = palComerciais.some(c => dadosStr.includes(c));
          return !eComercial;
        });
      }

      // Se pediu comercial, FILTRA fora os residenciais
      if (pedeComercial && !pedeResidencial) {
        contextoImoveis = contextoImoveis.filter(imovel => {
          const dadosStr = JSON.stringify(imovel).toLowerCase();
          const eComercial = palComerciais.some(c => dadosStr.includes(c));
          return eComercial;
        });
      }
    }

    // Consulta histórico de aprendizado no Supabase
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

REGRA RIGOROSA DE CARDS DE IMÓVEIS (EXTREMAMENTE IMPORTANTE):
1. NUNCA CRIE LINKS MARKDOWN COMERCIAIS OU FORMATOS COMO "[aqui](...)" OU "Ver Detalhes do Imóvel".
2. PARA EXIBIR UM IMÓVEL DO BANCO DE DADOS, VOCÊ É OBRIGADO A USAR EXCLUSIVAMENTE A SINTAXE DE TAG ISOLADA:
   ||| [VER_IMOVEL:{"titulo":"NOME_EXATO_DO_IMOVEL","imagem":"URL_DA_IMAGEM","link":"URL_DO_IMOVEL","preco":"VALOR_OU_CONSULTE_A_CONDICAO"}] |||
3. IMPORTANTE: Copie EXATAMENTE o titulo, link e imagem do objeto JSON do imóvel correspondente no catálogo. NUNCA misture o link de um imóvel (ex: terreno) com o título de outro (ex: casa/mansão).

CLASSIFICAÇÃO DE IMÓVEIS:
1. ALUGUEL RESIDENCIAL (para morar):
   - Inclui: "casa", "apartamento", "sobrado", "kitnet", "mansão", "cobertura residencial".
   - Se o preço for "Consulte a Condição", exiba o card normalmente com a string "Consulte a Condição".
   - Se o cliente solicitar moradia/casa em Arcos, APRESENTE A MANSÃO RESIDENCIAL e todas as opções residenciais disponíveis do catálogo.
2. ALUGUEL COMERCIAL:
   - Jamais ofereça galpão, loja ou sala para quem pede casa ou moradia.

ESTRATÉGIA COMERCIAL DE VENDAS E PRIORIDADES:
- Em compras de lotes em Arcos, dê prioridade aos loteamentos: Serra Verde, São Geraldo, Novo Retiro e Mirante da Serra.

PEDIDO DIRETO DE AVALIAÇÃO DE ATENDIMENTO:
- Sempre que concluir uma ajuda, indicar opções ou enviar o botão de contato do WhatsApp, adicione uma frase curta convidando o cliente a avaliar a resposta:
  "O meu atendimento te ajudou? Clique no 👍 ou 👎 abaixo para me ajudar a melhorar sempre! 😊"

REGRA ANTI-ALUCINAÇÃO E VERACIDADE:
- NUNCA invente dados de escritura, habite-se ou taxas. Se não souber, encaminhe para o WhatsApp.

BOTÃO DO WHATSAPP:
📲 [Clique aqui para falar com nosso corretor no WhatsApp](https://wa.me/5537991146240?text=Olá!%20Tenho%20interesse%20em:%20NOME_DO_PRODUTO)
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
