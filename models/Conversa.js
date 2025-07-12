const mongoose = require('mongoose');

const ConversaSchema = new mongoose.Schema({
  numero: { type: String, unique: true },
  conversation_id: String,
});

module.exports = mongoose.model('Conversa', ConversaSchema);
