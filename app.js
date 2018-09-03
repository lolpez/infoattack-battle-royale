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
	bullets: [],
	total: 0
}
var width = 350;
var height = 550;
var bulletSpeed = 5;
var bulletMaxSize = 50;
var bulletMinSize = 10;
var playerSpeed = 5;

io.on('connection', function(socket) {
	socket.on('new player', function(data) {
		gameData.total++;
		var player = {
			id: socket.id,
			name: data.name,
			x: 125,
			y: 275
		}
		gameData.players[socket.id] = player;
		io.sockets.emit('player info', player);
	});
	socket.on('movement', function(data) {		
		var player = gameData.players[socket.id] || {};
		if (data.left && player.x - 10 > 0) {
			player.x -= playerSpeed;
		}
		if (data.up && player.y - 40 > 0) {
			player.y -= playerSpeed;
		}
		if (data.right && player.x + 20 < width) {
			player.x += playerSpeed;
		}
		if (data.down && player.y + 20 < height) {
			player.y += playerSpeed;
		}
	});
	socket.on('disconnect', function() {
		delete gameData.players[socket.id];
		gameData.total--;
	});
});

setInterval(function() {
	var h = Math.random() >= 0.5;
	var v = !h;
	var dir = "";
	var x = 0;
	var y = 0;
	var bulletWidth = 0;
	var bulletHeight = 0;
	if (h){
		bulletWidth = bulletMaxSize;
		bulletHeight = bulletMinSize;
		if (Math.random() >= 0.5) {
			dir = "lr"
			x = 0;
		}else{
			dir = "rl";
			x = width;
		}
		y = Math.floor(Math.random() * width)
	}else{
		bulletWidth = bulletMinSize;
		bulletHeight = bulletMaxSize;
		if (Math.random() >= 0.5) {
			dir = "tb";
			y = 0;
		}else{
			dir = "bt";
			y = height;
		}
		x = Math.floor(Math.random() * width)
	}
	var bullet = {
		x: x,
		y: y,
		width: bulletWidth,
		height: bulletHeight,
		dir: dir
	}
	gameData.bullets.push(bullet);
}, 50);

setInterval(function() {
	for (i = 0; i < gameData.bullets.length; i++){
		var bullet = gameData.bullets[i]
		switch (bullet.dir){
			case "lr":
				bullet.x += bulletSpeed
				if (bullet.x > width) gameData.bullets.splice(i, 1)
			break;
			case "rl":
				bullet.x -= bulletSpeed 
				if (bullet.x < 0) gameData.bullets.splice(i, 1)
			break;
			case "tb":
				bullet.y += bulletSpeed
				if (bullet.y > height) gameData.bullets.splice(i, 1)
			break;
			case "bt":
				bullet.y -= bulletSpeed
				if (bullet.y < 0) gameData.bullets.splice(i, 1)
			break;
		}
	}
	io.sockets.emit('state', gameData);
}, 1000 / 60);

module.exports = app;