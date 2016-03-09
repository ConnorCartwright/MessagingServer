$(function() {
  // Added variable to access inputs/displays
  var $window = $(window);
  var $usernameInput = $('input.usernameInput');   // username input
  var $messages = $('ul.chatLog');              // get whole chat log element
  var socket = io();

  var username;
  var email;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var typing_timeout = 1200;
  var $currentInput = $usernameInput.focus();

  var $loginPage = $('.page.login'); // The login page
  var $menuPage = $('.page.menu'); // The chatroom page
  var $chatPage = $('.page.chat'); // The chatroom page

  socket.on('user joined', function (data) {
    printConsoleMessage('<span class="username">' + data.username + '</span>' + ' joined the room.');
  });

  socket.on('join chat', function (data) {
    connected = true;
    // display welcome message
    var $header = $('div.chatHeader>span');
    $header.html('Hey <i>' + username + '</i>, welcome to the chat!');
    printConsoleMessage('<span class="username">' + username + '</span>' + ' joined the room.');
  });

  socket.on('user disconnect', function (uid) {
    $('li.friend[data-userid="' + uid + '"]').fadeOut(400, function() {
      $(this).remove();
    });
  });

  socket.on('typing', function (data) {
    userIsTyping(data);
  });

  // kill the typing message on stop typing
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('chat message', function (data) {
    var chatLog  = $('div.chatWindow[data-roomname="' + data.room + '"] ul.chatLog');
    var chatMessage = $('<li class="message chatMessage"></li>')
    var image = $('<img src="' + data.url + '">');
    var message = $('<span><span class="username">' + data.username + '</span>: ' + data.message + '</span>');
    chatMessage.append(image);
    chatMessage.append(message);
    chatLog.append(chatMessage);

    var height = chatLog[0].scrollHeight;
    chatLog.scrollTop(height);
  });

  socket.on('created user', function (data) {
    formContainerMessage('User Account created!');
  });

  socket.on('login', function (data) {
    username = data.username;
    email = data.email;
    url = data.url;
    $('div.logoTopBar').append('<span class="usernameGreeting">Welcome ' + data.username + '!');
    $('div#sidebar').prepend('<div class="profilePicture"><img class="displayPicture" src="' + url + '" alt="Profile Picture"></div>');
    loginSuccess();
  });

  socket.on('user login', function (data) {
    var friend = $('<li class="friend" data-userid="' + data.uid +'"></li>');
    var image = ('<img class="friendImage" src="' + data.url + '" alt="O">');
    var name = $('<span>' + data.username + '</span>');
    friend.append(image);
    friend.append(name);

    $('ul.friendsList').append(friend);
  });

  socket.on('rebind login', function() {
    rebindLoginClick();  
  });

  socket.on('rebind create user', function() {
    rebindCreateAccountClick();  
  });

  socket.on('rebind reset password', function() {
    rebindResetPasswordClick();  
  });

  socket.on('email invalid', function (data) {
    $('div.formContainer.posting input.emailInput').addClass('error');
  });

  socket.on('email taken', function (data) {
    $('div.formContainer.posting input.emailInput').after('<div class="errorText"><span>Email already in use!</span></div>');
    $('div.formContainer.posting').removeClass('posting');
  });

  socket.on('password wrong', function (data) {
    $('div.formContainer.login input.passwordInput').after('<div class="errorText"><span>Wrong password</span></div>');
    $('div.formContainer.login').removeClass('posting');
  });

  socket.on('email not recognised', function (data) {
    $('div.formContainer.posting input.emailInput').after('<div class="errorText"><span>Email not registered.</span></div>');
    $('div.formContainer.posting').removeClass('posting');
  });

  socket.on('generic error', function (data) {
    $('div.formContainer.posting input.emailInput').before('<div class="errorText upper"><span>An error occurred. Please try again later.</span></div>');
    $('div.formContainer.posting').removeClass('posting');
  });

  socket.on('reset sent', function() {
    formContainerMessage('Password reset request sent!');
  });

  socket.on('TEST TEST TEST', function(message) {
    console.log('MESSAAAGE:');
    console.log(message);
  });

  socket.on('room joined', function (data) {
    var chatWindow = $('<div class="chatWindow" data-roomName="' + data.room + '"></div>');


    $(chatWindow).on('click', function() {
      $('div.chatWindow').removeClass('active');
      $(chatWindow).addClass('active');
    });

    var chatHeader = $('<div class="chatHeader"><span>Hey ' + username + ', welcome to: <em>' + data.room + '</em></span></div>');
    var leaveRoom = $('<div class="closeChat"></div>');

    leaveRoom.one('click', function() {
      var obj = {room: data.room, username: username};
      socket.emit('left room', obj);
      chatWindow.remove();
    });

    chatHeader.append(leaveRoom);
    var messageList = $('<ul class="chatLog"><li class="message consoleMessage numUsers"><span><span>' + data.numUsers + '</span> active user(s)</span></li></ul>');
    var messageInput = $('<div class="messageInputDiv"><input class="messageInput message" type="text" placeholder="Type here" maxlength="300" autofocus /></div>');
    var sendButton = $('<input class="messageInput send" type="button" value=">" />');

    sendButton.on('click', function() {
      var textInput = messageInput.find('input.message');

      if (textInput.val().length > 0) {
        var room = data.room;

        var obj = { message: textInput.val(), room: data.room, username: username };
        socket.emit('message', obj);
        textInput.val('');
        socket.emit('stop typing');
        typing = false;
      }

    });

    messageInput.append(sendButton);
    chatWindow.append(chatHeader);
    chatWindow.append(messageList);
    chatWindow.append(messageInput);
    chatWindow.hide();

    var chatWidth = 500;
    var chatHeight = 600;

    var posX = (Math.random() * ($('div.menuContent').width() - chatWidth));
    var posY = (Math.random() * ($('div.menuContent').height() - chatHeight - 50) + 50);

    $('div.menuContent').append(chatWindow);
    chatWindow.offset({
      'left' : posX,
      'top' : posY
    });

    chatWindow.fadeIn(500);
    chatWindow.draggable({containment: "parent"});
  });

  socket.on('user joined room', function (data) {
    var room = $('div.chatWindow[data-roomname="' + data.room + '"]');
    if (room) {
      var chatLog  = $('div.chatWindow[data-roomname="' + data.room + '"] ul.chatLog');
      var message = $('<li class="message consoleMessage"><span><span class="username">' + data.username + '</span> joined the room!</span></li>')
      chatLog.append(message);
      chatLog.find('li.numUsers>span>span').text(data.numUsers);
    }
  });

  socket.on('user left room', function (data) {
    var room = $('div.chatWindow[data-roomname="' + data.room + '"]');
    if (room) {
      var chatLog  = $('div.chatWindow[data-roomname="' + data.room + '"] ul.chatLog');
      var message = $('<li class="message consoleMessage"><span><span class="username">' + data.username + '</span> has left the room!</span></li>')
      chatLog.append(message);
      chatLog.find('li.numUsers>span>span').text(data.numUsers);
    }
  });

  function formContainerMessage(message) {
    var $message = $('<div class="formContainerMessage"><span>' + message + '</span></div>');
    $message.hide();
    $('div.formContainer.posting').append($message);

    $message.fadeIn(600, function() {
      setTimeout(function() {
        $message.fadeOut(800, function() {
          $('div.formContainer.login').fadeIn(400);
          $('div.formContainer.posting').fadeOut(400);
        });
      }, 400);
    });
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(200, function () {
      $(this).remove();
    });
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // helper function to print a console message to chat 
  function printConsoleMessage(message) {
    var $message = $('<li class="message consoleMessage">' + message + '</li>');
    $messages.append($message);
  }

  function printTypingMessage(data) {
    var $message = $('<li class="message typing message chatMessage" data-username="' + data.username + '"><span>' + data.username + data.message + '</span></li>');
    $messages.append($message);
  }

  // helper function to show a user is typing
  function userIsTyping(data) {
    data.typing = true;
    data.message = ' is typing...';
    printTypingMessage(data);
  }

  $window.keydown(function(event) {
    if (event.which === 13) { // if the user pressed ENTER
      if ($('div.chatWindow input.messageInput.message').is(':focus')) {
        var messageInput = $(document.activeElement);
        if (messageInput.val().length > 0) {
          var room = messageInput.closest('div.chatWindow').attr('data-roomname');
          var a = messageInput.closest('div.chatWindow');
          var obj = {message: messageInput.val(), room: room, username: username};
          socket.emit('message', obj);
          messageInput.val('')
          socket.emit('stop typing');
          typing = false;
        }
      }
    }
  });

  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= typing_timeout && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, typing_timeout);
    }
  }

  function loginSuccess() {
    $loginPage.fadeOut(600, function() {
      $menuPage.fadeIn(600);
      $('div.logoTopBar>img.menuBars').fadeIn(400);
      $("img.menuBars").trigger("click");
    });
  }

  // check email is valid
  function validateEmail(email) {
    var patt = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
    return patt.test(email);
  }

  // check password >= 8 characters, at least 1 number, 1 lower/upper case
  function validatePassword(password) {
    return true; /// TO DO REMOVE, enabled for ease of use
    var patt = new RegExp("(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/)");
    return patt.test(password);
  }

  // html element bindings

  $('img.menuBars').on('click', function() {
    $('#sidebar').animate({
      width: $('#sidebar').width() === 0 ? 210 : 0,
    }, 600, function() {
      $('div.menuContent').css('margin-right', $('#sidebar').width() === 210 ? 210 : 0);
    });
  });

  $('input.userInput.go').on('click', function() {
      setUsername(); // log the user in
  });

  $('div.formContainer.login input.create').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer .error').removeClass('error'); 
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.login').fadeOut(400, function() {
      $('div.formContainer.createAccount').fadeIn(400);
    });
  });

  $('div.formContainer.createAccount div.backButton').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer .error').removeClass('error'); 
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.createAccount').fadeOut(400, function() {
      $('div.formContainer.login').fadeIn(400);
    });
  });

  $('div.formContainer.login div.forgotPassword').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer .error').removeClass('error');
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.login').fadeOut(400, function() {
      $('div.formContainer.resetPassword').fadeIn(400);
    });
  });

  $('div.formContainer.resetPassword div.backButton').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.resetPassword').fadeOut(400, function() {
      $('div.formContainer.login').fadeIn(400);
    });
  });

  // bind click handlers
  rebindLoginClick();
  rebindCreateAccountClick();
  rebindResetPasswordClick();
  rebindJoinRoomClick();

  // function to handle login
  function handleLogin(email, password) {
    $('div.formContainer.login input.error').removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      // rebind the click event 
      rebindLoginClick();
      return;
    }

    if (!validatePassword(password.val())) {
      password.addClass('error');
      // rebind the click event 
      rebindLoginClick();
      return;
    }

    $('div.formContainer.login').addClass('posting');

    var obj = {email: email.val(), password: password.val()};
    socket.emit('login', obj);
  }

  // function to handle creating an account
  function handleCreateAccount(email, password) {
    $('div.formContainer.createAccount input.error').removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      // rebind the click event
      rebindCreateAccountClick();
      return;
    }

    if (!validatePassword(password.val())) {
      password.addClass('error');
      // rebind the click event
      rebindCreateAccountClick();
      return;
    }

    $('div.formContainer.createAccount').addClass('posting');
    var obj = {email: email.val(), password: password.val()};
    socket.emit('create user', obj);
  }

  // function to handle password reset
  function handlePasswordReset(email) {
    email.removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      // rebind the click event
      rebindResetPasswordClick();
      return;
    }
    else {
      $('div.formContainer.resetPassword').addClass('posting');
      socket.emit('password reset', email.val());  
    }
  }

  // function to handle joining rooms
  function handleJoinRoom(roomInput) {
    roomInput.removeClass('error');
    if (roomInput.val().length > 0 && roomInput.val().length < 20) {
      // if the room already exists
      if ($('div.chatWindow[data-roomname="' + roomInput.val() + '"').length > 0) {
        $('div.chatWindow[data-roomname="' + roomInput.val() + '"').focus();
      }
      else {
        var obj = {room: roomInput.val(), username: username};
        socket.emit('join room', obj);
      }
      roomInput.val("");
    }
    else {
      roomInput.addClass('error');
    }
    rebindJoinRoomClick();
  }

  function rebindLoginClick() {
    $('div.formContainer.login input.loginInput.signIn').one('click', function() {
      var email = $('div.formContainer.login input.loginInput.emailInput');
      var password = $('div.formContainer.login input.loginInput.passwordInput');
      handleLogin(email, password);
    });
  }

  function rebindCreateAccountClick() {
    $('div.formContainer.createAccount input.loginInput.create').one('click', function() {
      var email = $('div.formContainer.createAccount input.loginInput.emailInput');
      var password = $('div.formContainer.createAccount input.loginInput.passwordInput');
      handleCreateAccount(email, password);
    }); 
  }

  function rebindResetPasswordClick() {
    $('div.formContainer.resetPassword input.loginInput.reset').one('click', function() {
      var email = $('div.formContainer.resetPassword input.loginInput.emailInput');
      handlePasswordReset(email);
    });
  }

  function rebindJoinRoomClick() {
    $('div#sidebar>div.sidebarRooms input.createJoinButton').one('click', function() {
      var roomInput = $('input.roomInput.createJoinText');
      handleJoinRoom(roomInput);
    });
  }

  function rebindLeaveRoomClick() {
    $('div#sidebar>div.sidebarRooms input.createJoinButton').one('click', function() {
      var roomInput = $('input.roomInput.createJoinText');
      handleJoinRoom(roomInput);
    });
  }

});