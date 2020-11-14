$(function () {
    let socket = io();
    let user = '';
    let chat_log = [];
    let user_list = [];

    // Set the name of this user
    socket.on('set user', function (msg) {
        console.log('setting user name: ');
        console.log(msg);
        // set the cookie
        document.cookie = "name=" + msg;
        user = msg;
    });

    // update the user list
    socket.on('set user list', function (msg) {
        console.log('setting user list: ');
        console.log(msg);
        user_list = msg;

        // Render the new user list
        $('#users').empty();
        user_list.forEach(element => {
            let li = $('<li>').text(element.name).css("color", '#' + element.color);
            if (element.name === user) {
                li.append('(you)');
                li.css('font-weight', 'bold');
            }
            $('#users').append(li);
        });
    });

    // update the chat log
    socket.on('set chat log', function (msg) {
        // window.scrollTo(0, document.body.scrollHeight);
        console.log('setting chat log list: ');
        console.log(msg);
        chat_log = msg;

        // Render the new chat log 
        $('#messages').empty();
        chat_log.forEach(element => {
            let li = $('<li>').addClass('message');
            let date = new Date(element.date);
            li.append($('<span>').text(formatAMPM(date) + ' ').addClass('time'));
            li.append($('<span>').text(element.user.name + ': ').css("color", '#' + element.user.color).addClass('user'));
            li.append($('<span>').text(element.msg).addClass('msg'));
            if (element.user.name === user) {
                li.css('font-weight', 'bold');
            }
            $('#messages').append(li);
        });

        $('#messages-container').scrollTop($('#messages').height());

    });


    // message entered
    $('form').submit(function () {
        // Remove leading and trailing white spaces
        let msg = $('#m').val().trim();

        if (msg.startsWith('/name ')) { // name command
            socket.emit('user command', msg.replace('/name ', ''));
        }
        else if (msg.startsWith('/color ')) { // color command 
            socket.emit('color command', msg.replace('/color ', ''));
        }
        else if (msg) { // Normal, not empty message
            socket.emit('chat message', msg);
        }
        $('#m').val('');
        return false;
    });

    // convert am/pm format: https://www.codegrepper.com/code-examples/delphi/time+display+24+hour+clock+format+js
    function formatAMPM(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let strTime = hours + ':' + minutes + ' ' + ampm;
        return strTime;
    }


});