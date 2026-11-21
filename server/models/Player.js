const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 }
  },
  money: { type: Number, default: 1000 },
  inventory: { type: Array, default: [] }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
