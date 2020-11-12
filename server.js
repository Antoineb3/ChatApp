let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let port = process.env.PORT || 3000;

// Serve static resources
app.use(express.static('public'))

// Serve client side socket.io
app.get('/socket.io.min.js', function (req, res) {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.min.js');
});
app.get('/socket.io.min.js.map', function (req, res) {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.min.js.map');
});

io.on('connection', function (socket) {
  socket.on('chat message', function (msg) {
    io.emit('chat message', msg);
  });
});

http.listen(port, function () {
  console.log('listening on *:' + port);
});
