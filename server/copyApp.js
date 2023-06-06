const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

class ArduinoСontroller {
  constructor(ip, type, params = {}) {
    this.ip = `http://192.168.0.${ip}:80/control/`;
    this.type = type;
    this.params = params;
  }

  set setParams(params) {
    this.params = params;
  }

  get getType() {
    return this.type;
  }

  get getIp() {
    return this.ip;
  }

  async controllerAction() {
    try {
      const response = await axios.get(
        this.ip + this.type,
        {
          params: { ...this.params },
        },
      );

      console.log('Arduino response:', response.data);
    } catch (error) {
      console.error('Error sending request to Arduino:', error);
    }
  }
}

const lightСontroller = new ArduinoСontroller(13, 'light', {});

const requestAction = (Data) => {
  if (Data.type === 'light') {
    const state = Boolean(+Data.data.state)
    lightСontroller.params = { state };
    io.emit('data/light', { state: state });
    return {};
  }
};

// Применение middleware для обработки заголовков CORS
app.use(cors({
  origin: 'http://localhost:3000',
}));

app.get('/', (req, res) => {
  res.send('Server is running');
});


// Обработчик GET-запроса
app.get('/data', (req, res) => {
  // Получение данных из запроса
  const DataStr = decodeURIComponent(req.query.data);

  // Разбор строки в объект JSON
  const Data = JSON.parse(DataStr);
  console.log(Data);

  // Обработка GET-запроса
  requestAction(Data);

  // Отправка ответа на GET-запрос
  res.send('Data received');
});

// Запуск сервера
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Обработка подключения клиента по WebSocket
io.on('connection', (socket) => {
  console.log('Client connected');
  console.log('Transport type:', socket.conn.transport.name);

  // Обработка получения данных от клиента
  socket.on('data', ({ action }) => {
    console.log('Received data:', action);

    if (action.type === lightСontroller.type) {
      const state = action.data.state ? 'off' : 'on';
      lightСontroller.params = { state };
      lightСontroller.controllerAction();
      return {};
    }
  });

  // Обработка отключения клиента
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});