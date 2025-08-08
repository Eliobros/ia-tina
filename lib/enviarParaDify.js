const axios = require('axios');

module.exports = async function enviarParaDify(mensagem, numero, conversa) {
  try {
    const conversationId = conversa?.conversation_id || undefined;

    const res = await axios.post('https://api.dify.ai/v1/chat-messages', {
      query: mensagem,
      response_mode: 'blocking',
      user: numero,
      conversation_id: conversationId,
      inputs: {}
    }, {
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return res.data;
  } catch (err) {
    console.error('❌ Erro ao enviar para Dify:', err.message);
    return { answer: '⚠️ Erro na IA. Tente novamente mais tarde.' };
  }
};
