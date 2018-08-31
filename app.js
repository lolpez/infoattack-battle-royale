var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var gameRouter = require('./routes/game');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(80);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/game', gameRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

var gameData = {
	players: {},
	alive: 0,
	total: 0,
}
io.on('connection', function(socket) {
	socket.on('new player', function(data) {
		gameData.alive++;
		gameData.total++;
		gameData.players[socket.id] = {
			name: data.name,
			x: 300,
			y: 300
		};
		io.sockets.emit('your shit', {
			name: data.name,
			x: 300,
			y: 300
		});
	});
	socket.on('movement', function(data) {
		var player = gameData.players[socket.id] || {};
		if (data.left) {
			player.x -= 5;
		}
		if (data.up) {
			player.y -= 5;
		}
		if (data.right) {
			player.x += 5;
		}
		if (data.down) {
			player.y += 5;
		}
	});
	socket.on('disconnect', function() {
		delete gameData.players[socket.id];
		gameData.alive--;
	});
});

setInterval(function() {
	io.sockets.emit('state', gameData);
}, 1000 / 60);

module.exports = app;