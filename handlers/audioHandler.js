const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { execFile } = require('child_process');
const Conversa = require('../models/Conversa');
const enviarParaDify = require('../lib/enviarParaDify');

module.exports = async function handleAudioMessage(msg, numero) {
  try {
    const media = await msg.downloadMedia();
    if (!media) {
      await msg.reply('❌ Erro ao baixar o áudio.');
      return;
    }

    const timestamp = Date.now();
    const audiosDir = path.join(__dirname, '../audios');
    const oggPath = path.join(audiosDir, `${timestamp}.ogg`);
    const mp3Path = oggPath.replace('.ogg', '.mp3');

    fs.mkdirSync(audiosDir, { recursive: true });
    fs.writeFileSync(oggPath, Buffer.from(media.data, 'base64'));

    await new Promise((resolve, reject) => {
      ffmpeg(oggPath)
        .toFormat('mp3')
        .save(mp3Path)
        .on('end', resolve)
        .on('error', reject);
    });

    // Caminho absoluto para o Python do seu venv
    const pythonPath = path.join(__dirname, '../tina/bin/python3');

    execFile(pythonPath, ['transcribe.py', mp3Path], async (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Erro na transcrição:', stderr);
        await msg.reply('❌ Não consegui entender o áudio.');
        return;
      }

      const transcricao = stdout.trim();
      console.log(`🎧 Transcrição (${numero}): ${transcricao}`);

      let registro = await Conversa.findOne({ numero });
      const respostaDify = await enviarParaDify(transcricao, numero, registro);

      if (!registro && respostaDify.conversation_id) {
        await Conversa.create({ numero, conversation_id: respostaDify.conversation_id });
      }

      if (registro && respostaDify.conversation_id && respostaDify.conversation_id !== registro.conversation_id) {
        registro.conversation_id = respostaDify.conversation_id;
        await registro.save();
      }

      await msg.reply(respostaDify.answer || '🤖 (sem resposta da IA)');
    });
  } catch (error) {
    console.error('❌ Erro ao processar áudio:', error);
    await msg.reply('❌ Erro ao processar seu áudio.');
  }
};
