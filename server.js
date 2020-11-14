let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let cookie = require('cookie');
let port = process.env.PORT || 3000;
let emojiMap = require('smile2emoji').emojiMap; // https://www.npmjs.com/package/smile2emoji

//Order emoji map by key lengh to match longer emojies before shorter ones (e.g. >:( before :( )
const orderedEmojiMap = {};
Object.keys(emojiMap).sort((a, b) => b.length - a.length).forEach(key => orderedEmojiMap[key] = emojiMap[key]);

let chat_log = [];
let user_list = [];
let disconneced_users = [];
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
  let cookie_name = '';
  // sometimes this throws an exception, seems to happen randomly
  try {
    cookie_name = cookie.parse(socket.handshake.headers.cookie)['name'];
  } catch (e) {
    console.log(e);
  }
  let user = {};
  if (cookie_name && !nameTaken(cookie_name)) { // old user with name not taken
    let matching_useres = disconneced_users.filter(u => u.name === cookie_name);
    if (matching_useres.length > 0) { // assign old user object 
      user = matching_useres[0];
    }
    else { // create new user object with name
      // Random color https://css-tricks.com/snippets/javascript/random-hex-color/
      user = { name: cookie_name, color: (Math.floor(Math.random() * 16777215).toString(16)) };
    }
  } else { // new user 
    // Random color https://css-tricks.com/snippets/javascript/random-hex-color/
    user = { name: ('User' + (usercount++)), color: (Math.floor(Math.random() * 16777215).toString(16)) };
  }
  socket.emit('set user', user.name);

  //send chat log to user
  socket.emit('set chat log', chat_log);

  // remove user from disconnected list
  disconneced_users = disconneced_users.filter(u => u.name !== user.name && u.name !== cookie_name);

  // update user list for everyone on connect
  user_list.push(user);
  io.emit('set user list', user_list);

  // remove user on disconnect
  socket.on('disconnect', function () {
    user_list = user_list.filter(item => item.name != user.name);
    disconneced_users.push(user);
    io.emit('set user list', user_list);
  });

  // when new chat message is sent
  socket.on('chat message', function (msg) {
    // Replace emojis found in emoji map
    Object.keys(orderedEmojiMap).forEach(key => msg = msg.replaceAll(key, emojiMap[key]));
    // only keep 200 most recent
    if (chat_log.length >= 200) {
      chat_log.shift();
    }
    let date = new Date();
    chat_log.push({ date, user, msg });
    io.emit('set chat log', chat_log);
  });

  // update user name
  socket.on('user command', function (msg) {
    msg = msg.trim();
    if (nameTaken(msg)) { // name taken
      return; 
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
  });


  // Helper functions

  // Checks if a name has already been taken
  function nameTaken(name) {
    return user_list.filter(u => u.name === name).length > 0;
  }

});

http.listen(port, function () {
  console.log('listening on *:' + port);
});
