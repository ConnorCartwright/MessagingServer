$(function() {
  // Added variable to access inputs/displays
  var $window = $(window);
  var $usernameInput = $('input.usernameInput');   // username input
  var $messages = $('ul.chatLog');              // get whole chat log element
  var $inputMessage = $('input.messageInput');  // get new message input area
  var socket = io();

  var username;
  var connected = false;
  var typing = false;
  var $currentInput = $usernameInput.focus();

  var $loginPage = $('login.page'); // The login page
  var $chatPage = $('chat.page'); // The chatroom page

  socket.on('user joined', function (data) {
    printMessage(data.username + 'joined the room.');
    printNumUsers(data);
  });

  socket.on('user left', function (data) {
    printMessage(data.username + 'left the room.');
    printNumUsers(data);
  });

  socket.on('typing', function (data) {
    userIsTyping(data);
  });

  // create function for user stopped typing

  // create function for new message


  // helper function to print a console message to chat 
  function printConsoleMessage(message) {
    var $messsage = $('<li class="message consoleMessage">' + message + '</li>');
    $messages.append($message);
  }

  // helper function to print a chat message to chat 
  function printMessage(message) {
    var $messsage = $('<li class="message chatMessage">' + message + '</li>');
    $messages.append($message);
  }

  function sendMessage() {
    var $message = $inputMessage.val();
    // if user is connected and has a message
    if (connected && message) {
        $inputMessage.val('');
        printMessage(username + ': ' + message);
        socket.emit('new message', message);
    }
  }

  // helper function to print the number of users in the room
  function printNumUsers(data) {
    if (data.numUsers > 1) {
      printMessage('There are ' + data.numUsers + ' active users.');
    }
    else {
      printMessage('There is only 1 active user.');
    }
  }

  // helper function to show a user is typing
  function userIsTyping(data) {
    data.typing = true;
    data.message = 'is typing...';
    printMessage(data.message);
  }

  $window.keydown(function(event) {
    if (event.which === 13) { // if the user pressed ENTER
      if (username) { // if the user is loggedIn
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else { // else log them in
        // TO DO setUsername();
      }
    }
  });

});