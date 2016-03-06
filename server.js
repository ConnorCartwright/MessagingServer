var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var Firebase = require('firebase');
var firebaseRef = new Firebase("https://messagingserver.firebaseio.com/");
var authData = firebaseRef.getAuth();

if (authData) {
  console.log("User " + authData.uid + " is logged in with " + authData.provider);
} else {
  console.log("User is logged out");
}

// listen at the port specified
server.listen(port, function() {
	console.log('Server listening at port: ', port);
});

// Route
app.use(express.static('www'));


// Chatroom
var numUsers = 0;

// on/during connection
io.on('connection', function(socket) {
	var addedUser = false; // user not added yet

	// listens for a new message
	socket.on('new message', function (data) {
		// send the message
		socket.broadcast.emit('new message', {
			username: socket.username,
			message: data
		});
	});

	socket.on('add user', function (username) {
		if (addedUser) {
			return;
		}
		else {
			// storing the username in socket for now
			socket.username = username;
			numUsers++;
			addedUser = true; // user is added

			// emit joinChat
			socket.emit('join chat', {
				numUsers: numUsers
			});

			// broadcast that a user has joined
			socket.broadcast.emit('user joined', {
				username: socket.username,
				numUsers: numUsers
			});
		}
	});

	// show user is typing
	socket.on('typing', function() {
		socket.broadcast.emit('typing', {
			username: socket.username
		});
	});

	// show user has stopped typing
	socket.on('stop typing', function() {
		socket.broadcast.emit('stop typing', {
			username: socket.username
		});
	});

	socket.on('disconnect', function() {
		if (addedUser) {
			numUsers--;

			// broadcast user has left
			socket.broadcast.emit('user left', {
				username: socket.username,
				numUsers: numUsers
			});
		}
	});

	socket.on('create user', function(obj) {
		firebaseRef.createUser({
		  email    : obj.email,
		  password : obj.password
		}, function(error, userData) {
		  if (error) {
		    switch (error.code) {
		      case "EMAIL_TAKEN":
		      	socket.emit('email taken');
		        break;
		      case "INVALID_EMAIL":
		      	socket.emit('email invalid');
		        break;
		      default:
		      	socket.emit('generic error');
		    }
		  } 
		  else {
		    console.log("Successfully created user account with uid:", userData.uid);
		    var obj2 = {username: getName(authData), email: obj.email};
		    socket.emit('login', obj2);
		  }
		});
	});

	socket.on('login', function(obj) {
		firebaseRef.authWithPassword({
		  email    : obj.email,
		  password : obj.password
		}, function(error, authData) {
		  if (error) {
		    switch (error.code) {
		      case "INVALID_EMAIL":
		      	socket.emit('email invalid');
		        break;
		      case "INVALID_PASSWORD":
		      	socket.emit('password wrong');
		        break;
		      case "INVALID_USER":
		      	socket.emit('email not recognised');
		        break;
		      default:
		        socket.emit('generic error');
		    }
		  } 
		  else {
		  	var obj2 = {username: getName(authData), email: obj.email};
		  	socket.emit('login', obj2);
		    console.log("Authenticated successfully with payload:", authData);
		  }
		});
	});

	socket.on('password reset', function(email) {
		  firebaseRef.resetPassword({
		  email: email
		}, function(error) {
		  if (error) {
		    switch (error.code) {
		      case "INVALID_USER":
		      	socket.emit('email not recognised');
		        break;
		      default:
		        socket.emit('generic error');
		    }
		  } 
		  else {
		    socket.emit('reset sent');
		  }
		});
	});

	// find a suitable name based on the meta info given by each provider
	function getName(authData) {
	  switch(authData.provider) {
	     case 'password':
	       return authData.password.email.replace(/@.*/, '');
	     case 'twitter':
	       return authData.twitter.displayName;
	     case 'facebook':
	       return authData.facebook.displayName;
	  }
	}



  });
