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

