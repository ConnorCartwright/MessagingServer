$(function() {
  // Added variable to access inputs/displays
  var $window = $(window);
  var $usernameInput = $('input.usernameInput');   // username input
  var $messages = $('ul.chatLog');              // get whole chat log element
  var $inputMessage = $('input.newMessageInput');  // get new message input area


  socket.on('user joined', function (data) {
    printMessage(data.username + 'joined the room.');
    printNumUsers(data);
  });

  socket.on('user left', function (data) {
    printMessage(data.username + 'left the room.');
    printNumUsers(data);
  });

  function printMessage(message) {
    var $messsage = $('<li class="consoleMessage">' + message + '</li>');
    $messages.append($message);
  }

  function printNumUsers(data) {
    if (data.numUsers > 1) {
      printMessage('There are ' + data.numUsers + ' active users.');
    }
    else {
      printMessage('There is only 1 active user.');
    }
  }

  // create function for user leaving

  // create function for user typing

  // create function for user stopped typing

  // create function for new message

});