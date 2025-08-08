const enviarParaDify = require('../lib/enviarParaDify');
const Conversa = require('../models/Conversa');
const axios = require('axios');

const apiKey = 'AIzaSyCfNzgt3Y8V_2uXDQKOcY3zxImUuIHBHBc'; // <-- Substitua aqui pela sua chave da Google Custom Search API
const cseId = '934f28c26c5554297';   // <-- Substitua aqui pelo seu ID do mecanismo de busca (CSE)

async function googleSearch(query) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: cseId,
        q: query,
        num: 3,
      }
    });

    if (response.data.items) {
      return response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    }

    return [];
  } catch (error) {
    console.error('Erro na busca Google:', error.message);
    return [];
  }
}

module.exports = async function handleTextMessage(msg, numero, texto) {
  const textoLog = texto.length > 45 ? texto.slice(0, 45) + '...' : texto;
  const pushName = msg.pushName;
  console.log(`
========= Tina IA (Texto) =========
|-> Usuario: ${pushName}
|-> Número: ${numero}
|-> Mensagem: ${textoLog}
|-> Hora: ${new Date().toLocaleTimeString()}
|-> Data: ${new Date().toLocaleDateString()}
===================================
  `);

  // 🔍 Busca no Google
  if (texto.toLowerCase().startsWith('buscar:')) {
    const termoBusca = texto.slice(7).trim();
    if (!termoBusca) {
      return await msg.reply('Por favor, diga o que quer buscar. Ex: buscar: quem fez o Beroso');
    }

    const resultados = await googleSearch(termoBusca);
    if (resultados.length === 0) {
      return await msg.reply('Não encontrei resultados para sua busca.');
    }

    const conteudoBusca = resultados.map(r =>
      `🔸 *${r.title}*\n${r.snippet}\n🔗 ${r.link}`
    ).join('\n\n');

    const prompt = `
Baseando-se nas informações abaixo da busca no Google, gere um resumo claro e direto sobre: *${termoBusca}*. Use linguagem natural e cite os dados importantes.

${conteudoBusca}
    `;

    let registro = await Conversa.findOne({ numero });
    const respostaDify = await enviarParaDify(prompt, numero, registro?.conversation_id);

    if (!registro && respostaDify.conversation_id) {
      await Conversa.create({ numero, conversation_id: respostaDify.conversation_id });
    }

    if (registro && respostaDify.conversation_id && respostaDify.conversation_id !== registro.conversation_id) {
      registro.conversation_id = respostaDify.conversation_id;
      await registro.save();
    }

    return await msg.reply(respostaDify.answer || '🤖 Não consegui gerar um resumo.');
  }

  // 🤖 IA normal (Dify)
  let registro = await Conversa.findOne({ numero });
  const respostaDify = await enviarParaDify(texto, numero, registro?.conversation_id);

  if (!registro && respostaDify.conversation_id) {
    await Conversa.create({ numero, conversation_id: respostaDify.conversation_id });
  }

  if (registro && respostaDify.conversation_id && respostaDify.conversation_id !== registro.conversation_id) {
    registro.conversation_id = respostaDify.conversation_id;
    await registro.save();
  }

  await msg.reply(respostaDify.answer || '🤖 (sem resposta da IA)');
};
