let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let port = process.env.PORT || 3000;
let emojiMap = require('smile2emoji').emojiMap; // https://www.npmjs.com/package/smile2emoji

//Order emoji map by key lengh to match longer emojies before shorter ones (e.g. >:( before :( )
const orderedEmojiMap = {};
Object.keys(emojiMap).sort((a, b) => b.length - a.length).forEach(key => orderedEmojiMap[key] = emojiMap[key]);

let chat_log = [];
let user_list = [];
let usercount = 1;

// Rplce all for strings, needed because replace only replaces first occurance
// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string
String.prototype.replaceAll = function (find, replace) {
  var str = this;
  return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};

// Serve static resources
app.use(express.static('public'))

io.on('connection', function (socket) {
  // add user on connect
  // Random color https://css-tricks.com/snippets/javascript/random-hex-color/
  let user = { name: ('User' + (usercount++)), color: (Math.floor(Math.random() * 16777215).toString(16)) };
  socket.emit('set user', user.name);
  // update user list for everyone on connect
  user_list.push(user);
  io.emit('set user list', user_list);
  // add connection message to chat log
  sendMessage(user.name + ' connected');

  // remove user on disconnect
  socket.on('disconnect', function () {
    user_list = user_list.filter(item => item.name != user.name);
    io.emit('set user list', user_list);
    sendMessage(user.name + ' disconnected');
  });

  // when new chat message is sent
  socket.on('chat message', function (msg) {
    // Replace emojis found in emoji map
    Object.keys(orderedEmojiMap).forEach(key => msg = msg.replaceAll(key, emojiMap[key]));
    sendMessage(msg, user);
  });

  // update user name
  socket.on('user command', function (msg) {
    msg = msg.trim();
    if (nameTaken(msg)) { // name taken
      return; //TODO: send error
    }
    else if (msg == 'SERVER') { // reserved name
      return; //TODO: send error
    }
    // upadate state
    user.name = msg;
    socket.emit('set user', user.name);
    io.emit('set user list', user_list);
    io.emit('set chat log', chat_log);
  });

  // update user color
  socket.on('color command', function (msg) {
    msg = msg.trim();
    // https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation/8027444
    if (typeof msg === 'string' && msg.length === 6 && !isNaN(Number('0x' + msg))) {
      user.color = msg;
      io.emit('set user list', user_list);
      io.emit('set chat log', chat_log);
    }
    else {
      // TODO: error message
    }
  });


  // Helper functions

  // Adds a message to the log and sends it to all users, sender is server when not specified
  function sendMessage(msg, user = { name: 'SERVER', color: '000000' }) {
    // only keep 200 most recent
    if (chat_log.length >= 200) {
      chat_log.shift();
    }
    let date = new Date();
    chat_log.push({ date, user, msg });
    io.emit('set chat log', chat_log);
  }

  // Checks if a name has already been taken
  function nameTaken(name) {
    return user_list.filter(u => u.name == name).length > 0;
  }

});

http.listen(port, function () {
  console.log('listening on *:' + port);
});
