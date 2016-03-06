$(function() {
  // Added variable to access inputs/displays
  var $window = $(window);
  var $usernameInput = $('input.usernameInput');   // username input
  var $messages = $('ul.chatLog');              // get whole chat log element
  var $inputMessage = $('input.messageInput.message');  // get new message input area

  var socket = io();

  var username;
  var colour;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var typing_timeout = 1200;
  var $currentInput = $usernameInput.focus();

  var $loginPage = $('.page.login'); // The login page
  var $menuPage = $('.menu.chat'); // The chatroom page
  var $chatPage = $('.page.chat'); // The chatroom page

  socket.on('user joined', function (data) {
    printConsoleMessage('<span class="username" style="color: ' + color(data.username) + '">' + data.username + '</span>' + ' joined the room.');
    printNumUsers(data);
  });

  socket.on('join chat', function (data) {
    connected = true;
    // display welcome message
    var $header = $('div.chatHeader>span');
    $header.html('Hey <i>' + username + '</i>, welcome to the chat!');
    printConsoleMessage('<span class="username" style="color: ' + color(username) + '">' + username + '</span>' + ' joined the room.');
    printNumUsers(data);
  });

  socket.on('user left', function (data) {
    printConsoleMessage(data.username + ' left the room.');
    printNumUsers(data);
  });

  socket.on('typing', function (data) {
    userIsTyping(data);
  });

  // kill the typing message on stop typing
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('new message', function (data) {
    printMessage(data);
  });

  socket.on('login', function (data) {
    loginSuccess();
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
    var $message = $('<div class="passwordReset"><span>Password reset request sent!</span></div>');
    $message.hide();
    $('div.formContainer.posting').append($message);

    $message.fadeIn(600, function() {
      setTimeout(function() {
        $message.fadeOut(800, function() {
          $('div.formContainer.login').fadeIn(400);
          $('div.formContainer.resetPassword').fadeOut(400);
        });
      }, 400);

    });

  });

  // emit reset sent









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

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // helper function to print a console message to chat 
  function printConsoleMessage(message) {
    var $message = $('<li class="message consoleMessage">' + message + '</li>');
    $messages.append($message);
  }

  // helper function to print a chat message to chat 
  function printMessage(data) {
    var $message = $('<li class="message chatMessage" style="background-color: ' + color(data.username) + '"><span>' + data.username + ':</span> ' + data.message + '</li>');
    $messages.append($message);
  }

  function printTypingMessage(data) {
    var $message = $('<li class="message typing message chatMessage" data-username="' + data.username + '" style="background-color: ' + color(data.username) + '"><span>' + data.username + data.message + '</span></li>');
    $messages.append($message);
  }

  function sendMessage() {
    var message = $inputMessage.val();
    // if user is connected and has a message
    if (connected && message) {
        $inputMessage.val('');
        printMessage({
          username: username,
          message: message
        });
        socket.emit('new message', message);
    }
  }

  // helper function to print the number of users in the room
  function printNumUsers(data) {
    var $users = $('li.consoleMessage.numUsers>span');
    var text = ""
    if (data.numUsers > 1) {

      text = 'There are ' + data.numUsers + ' active users.';
    }
    else if (data.numUsers == 1)  {
      text = 'There is only 1 active user.';
    }
    $users.fadeOut(200, function() {
      $(this).text(text).fadeIn(200);
    });
  }

  // helper function to show a user is typing
  function userIsTyping(data) {
    data.typing = true;
    data.message = ' is typing...';
    printTypingMessage(data);
  }

    // Sets the client's username
  function setUsername () {
    username = $usernameInput.val();
    // if the username is valid
    if (username) {
      colour = color(username);
      $loginPage.fadeOut(600);
      $chatPage.fadeIn(1200)
      $currentInput = $inputMessage.focus();

      // Tell the server the username
      socket.emit('add user', username);
    }
  }

  $window.keydown(function(event) {
    if (event.which === 13) { // if the user pressed ENTER
      if (username) { // if the user is loggedIn
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else { // else log them in
          setUsername();
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

  // color and increase brightness functions taken from stack overflow
  function color(string) {
      return increase_brightness('#' + md5(string).slice(0, 6), 60);
  }


  function increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
  }

  function loginSuccess() {
    $loginPage.fadeOut(600, function() {
      $menuPage.fadeIn(600);
    });
  }

  // check email is valid
  function validateEmail(email) {
    var patt = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
    return patt.test(email);
  }

  // check password >= 8 characters, at least 1 number, 1 lower/upper case
  function validatePassword(password) {
    return true; /// TO DO REMOVE
    var patt = new RegExp("(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/)");
    return patt.test(password);
  }

  // html element bindings

  $('input.userInput.go').on('click', function() {
      setUsername(); // log the user in
  });

  $('input.messageInput.send').on('click', function() {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
  });

  $('div.formContainer.login input.create').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.login').fadeOut(400, function() {
      $('div.formContainer.createAccount').fadeIn(400);
    });
  });

  $('div.formContainer.createAccount div.backButton').on('click', function() {
    $('div.errorText').remove();
    $('div.formContainer input.textInput').val("");
    $('div.formContainer.createAccount').fadeOut(400, function() {
      $('div.formContainer.login').fadeIn(400);
    });
  });

  $('div.formContainer.login div.forgotPassword').on('click', function() {
    $('div.errorText').remove();
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

  $('div.formContainer.login input.loginInput.signIn').on('click', function() {
    var email = $('div.formContainer.login input.loginInput.emailInput');
    var password = $('div.formContainer.login input.loginInput.passwordInput');

    $('div.formContainer.login input.error').removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      return;
    }

    if (!validatePassword(password.val())) {
      password.addClass('error');
      return;
    }

    $('div.formContainer.login').addClass('posting');

    var obj = {email: email.val(), password: password.val()};
    socket.emit('login', obj);
  });

  $('div.formContainer.createAccount input.loginInput.create').on('click', function() {
    var email = $('div.formContainer.createAccount input.loginInput.emailInput');
    var password = $('div.formContainer.createAccount input.loginInput.passwordInput');

    $('div.formContainer.createAccount input.error').removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      return;
    }

    if (!validatePassword(password.val())) {
      password.addClass('error');
      return;
    }

    $('div.formContainer.createAccount').addClass('posting');

    var obj = {email: email.val(), password: password.val()};
    socket.emit('create user', obj);
  });

  $('div.formContainer.resetPassword input.loginInput.reset').on('click', function() {
    var email = $('div.formContainer.resetPassword input.loginInput.emailInput');

    $('div.formContainer.createAccount input.error').removeClass('error');
    $('div.errorText').remove();

    if (!validateEmail(email.val())) {
      email.addClass('error');
      return;
    }

    $('div.formContainer.resetPassword').addClass('posting');

    socket.emit('password reset', email.val());
  });


});