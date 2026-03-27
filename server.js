import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, '../Frontend')));

app.get('/chat', (req, res) => {
  res.sendFile(join(__dirname, '../Frontend/chat.html'));
});

const rooms = {}; // track online users

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('join-room', ({ room, username }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = username;

    io.to(room).emit('online-users', Object.values(rooms[room]));
    io.to(room).emit('receive-message', { username: '🤖 System', message: `${username} joined the room` });
  });

  socket.on('send-message', ({ room, username, message }) => {
    io.to(room).emit('receive-message', { username, message });
  });

  socket.on('disconnect', () => {
    const room = socket.room;
    if (room && rooms[room]) {
      delete rooms[room][socket.id];
      io.to(room).emit('online-users', Object.values(rooms[room]));
      io.to(room).emit('receive-message', { username: '🤖 System', message: `${socket.username} left the room` });
    }
    console.log('user disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});