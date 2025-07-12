const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
require('dotenv').config();

const connectDB = require('./lib/mongodb');
const Conversa = require('./models/Conversa');

connectDB(); // 📦 Conectando MongoDB

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Tina IA conectada!');
});

async function enviarParaDify(mensagem, numero, conversationId = null) {
  try {
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
    return { answer: '⚠️ Erro na IA. Tente mais tarde.' };
  }
}

client.on('message_create', async (msg) => {
  if (msg.fromMe || msg.from.endsWith('@g.us')) return;

  const numero = msg.from.split('@')[0];
  const texto = msg.body?.trim();
  if (!texto) return;

  const textoLog = texto.length > 45 ? texto.slice(0, 45) + '...' : texto;
  console.log(`
========= Tina IA =========
|-> Número: ${numero}
|-> Mensagem: ${textoLog}
|-> Hora: ${new Date().toLocaleTimeString()}
|-> Data: ${new Date().toLocaleDateString()}
|-> Grupo: Não
===========================
  `);

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
});

client.initialize();
