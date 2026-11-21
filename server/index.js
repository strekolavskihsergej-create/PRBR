const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Player = require('./models/Player');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const PORT = Number(process.env.PORT) || 3000;
const WORLD_ROOM = 'world';
const USERNAME_RE = /^[\wа-яА-ЯёЁ]{3,20}$/u;
const SAVE_INTERVAL_MS = 1000;

let dbConnected = false;
const online = new Map(); // socket.id -> { id, username, position }

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.get('/', (req, res) => {
  res.json({ name: 'Black Russia Server', status: 'ok', online: online.size });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected',
    online: online.size,
    uptime: Math.round(process.uptime())
  });
});

function publicPlayer(player) {
  return {
    id: player.id,
    username: player.username,
    position: player.position,
    money: player.money,
    inventory: player.inventory
  };
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zaharrp', {
  serverSelectionTimeoutMS: 5000
})
  .then(() => {
    dbConnected = true;
    console.log('Подключено к MongoDB');
  })
  .catch(err => console.error('Ошибка БД:', err));

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  socket.on('join', async (username) => {
    try {
      if (typeof username !== 'string') {
        return socket.emit('error_message', { code: 'invalid_username', message: 'Имя должно быть строкой' });
      }

      const name = username.trim();
      if (!USERNAME_RE.test(name)) {
        return socket.emit('error_message', {
          code: 'invalid_username',
          message: 'Имя: 3-20 символов, буквы, цифры и подчёркивание'
        });
      }

      if (!dbConnected) {
        return socket.emit('error_message', { code: 'database_unavailable', message: 'База данных недоступна' });
      }

      const player = await Player.findOneAndUpdate(
        { username: name },
        { $setOnInsert: { username: name } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      socket.data.username = name;
      socket.data.playerId = player._id.toString();
      socket.data.lastSave = 0;

      const entry = {
        id: socket.id,
        username: name,
        position: player.position
      };

      // Roster of everyone already in the world, then announce this player.
      socket.emit('players_list', Array.from(online.values()));
      online.set(socket.id, entry);

      socket.join(WORLD_ROOM);
      socket.emit('player_data', publicPlayer({ ...entry, money: player.money, inventory: player.inventory }));
      socket.to(WORLD_ROOM).emit('player_joined', entry);

      console.log('Игрок вошёл в мир:', name);
    } catch (err) {
      console.error('Ошибка join:', err);
      socket.emit('error_message', { code: 'join_failed', message: 'Не удалось войти в игру' });
    }
  });

  socket.on('player_move', async (data) => {
    try {
      const entry = online.get(socket.id);
      if (!entry) return; // движение от игрока, который не вошёл в мир

      const position = data && data.position;
      if (
        !position ||
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        !Number.isFinite(position.z)
      ) {
        return socket.emit('error_message', { code: 'invalid_position', message: 'Некорректные координаты' });
      }

      // В реальной игре здесь нужна логика проверки античита
      const next = { x: position.x, y: position.y, z: position.z };
      entry.position = next;
      socket.to(WORLD_ROOM).emit('player_moved', { id: socket.id, username: entry.username, position: next });

      // Сохраняем позицию в БД не чаще раза в секунду на игрока.
      const now = Date.now();
      if (dbConnected && now - (socket.data.lastSave || 0) >= SAVE_INTERVAL_MS) {
        socket.data.lastSave = now;
        Player.updateOne({ _id: socket.data.playerId }, { position: next })
          .catch(err => console.error('Ошибка сохранения позиции:', err));
      }
    } catch (err) {
      console.error('Ошибка player_move:', err);
    }
  });

  socket.on('disconnect', () => {
    const entry = online.get(socket.id);
    online.delete(socket.id);
    socket.to(WORLD_ROOM).emit('player_left', { id: socket.id, username: entry ? entry.username : null });
    console.log(entry ? `Игрок отключился: ${entry.username}` : 'Игрок отключился');
  });
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
