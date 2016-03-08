var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;
var Firebase = require('firebase');
var firebaseRef = new Firebase("https://messagingserver.firebaseio.com/");
var authData = firebaseRef.getAuth();

// listen at the port specified
server.listen(port, function() {
	console.log('Server listening at port: ', port);
});

// Route
app.use(express.static('www'));

var rooms = ['global'];
// Chatroom
var numUsers = 0;

// on/during connection
io.sockets.on('connection', function(socket) {

	var addedUser = false; // user not added yet


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
		  	socket.emit('rebind create user');
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
		    socket.emit('created user');
		  }
		});
	});

	socket.on('login', function(obj) {
		firebaseRef.authWithPassword({
		  email    : obj.email,
		  password : obj.password
		}, function(error, authData) {
		  if (error) {
		  	socket.emit('rebind login');
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
		  	var obj2 = {username: getName(authData), email: obj.email, url: authData.password.profileImageURL};
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
		  	socket.emit('rebind reset password');
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

	socket.on('join room', function(data) {
		if (io.sockets.adapter.sids[socket.id][data.room]) {
			// do nothing is user is already in room
		}
		else {
			socket.join(data.room);
			var room = io.sockets.adapter.rooms[data.room];
			data.numUsers = room.length;
			socket.emit('room joined', data);
			socket.broadcast.emit('user joined room', data);
		}
	});

	socket.on('left room', function(data) {
		if (io.sockets.adapter.sids[socket.id][data.room]) {
			socket.leave(data.room);
			var room = io.sockets.adapter.rooms[data.room];
			data.numUsers = room.length;
			socket.broadcast.emit('user left room', data);
		}
		else {
			// do nothing if user isn't in room
		}
	});

	socket.on('message', function(data) {
		if (data.message.length > 0 ) {
			io.sockets.in(data.room).emit('chat message', data);
		}
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
