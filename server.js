var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;

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
		socket.broadcast.emit('New message:', {
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

			// emit login
			socket.emit('login', {
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
		socket.broadcast.emit('styop typing', {
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
});
