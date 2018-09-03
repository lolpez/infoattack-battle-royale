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
	helping: {},
	total: 0
}
var width = 350;
var height = 550;
var bulletSpeed = 5;
var bulletMaxSize = 50;
var bulletMinSize = 10;
var playerWidth = 25;
var playerHeight = 25;
var playerSpeed = 5;
var playerIncapacitatedSpeed = 0.3;

io.on('connection', function(socket) {
	socket.on('new player', function(data) {
		gameData.total++;
		var player = {
			id: socket.id,
			name: data.name,
			width: playerWidth,
			height: playerHeight,
			speed: playerSpeed,
			incapacitated: false,
			x: 125,
			y: 275
		}
		gameData.players[socket.id] = player;
		io.sockets.emit('player info', player);
	});
	socket.on('movement', function(data) {		
		var player = gameData.players[socket.id] || {};
		if (data.left && player.x - 10 > 0) {
			player.x -= player.speed;
		}
		if (data.up && player.y - 40 > 0) {
			player.y -= player.speed;
		}
		if (data.right && player.x + 20 < width) {
			player.x += player.speed;
		}
		if (data.down && player.y + 20 < height) {
			player.y += player.speed;
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
}, 1000);

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
	hits().then((player, bulletPos) => {
		if (player.incapacitated){ //player died
			//delete gameData.players[player.id];
			gameData.total--;
		}else{ //player incapacitated
			bulletSpeed = 0;
			player.incapacitated = true;
			player.speed = playerIncapacitatedSpeed;
		}
		gameData.bullets.splice(bulletPos, 1);
	});
	help().then((data) => {
		(data.help) ? startHelping(data.helper, data.incapacitated) : stopHelping(data.helper, data.incapacitated)
	});
	io.sockets.emit('state', gameData);
}, 1000 / 60);

function hits(){
	return new Promise((resolve, reject) => {
		for (i = 0; i < gameData.bullets.length; i++){
			var bullet = gameData.bullets[i];
			for (var j in gameData.players) {
				var player = gameData.players[j];
				if ((bullet.x + bullet.width) > player.x &&
					bullet.x < player.x + player.width &&
					(bullet.y + bullet.height) > player.y &&
					bullet.y < player.y + player.height){
						resolve(player, i)
				}
			}
		}
	});
}

function help(){
	return new Promise((resolve, reject) => {
		for (var i in gameData.players) {
			var incapacitated = gameData.players[i];
			if (incapacitated.incapacitated){
				for (var j in gameData.players) {
					helper = gameData.players[j];
					if (helper.id !== incapacitated.id){
						if ((incapacitated.x + incapacitated.width) > helper.x &&
							incapacitated.x < helper.x + helper.width &&
							(incapacitated.y + incapacitated.height) > helper.y &&
							incapacitated.y < helper.y + helper.height){
								//helper is helpig incapacitated
								resolve({
									helper: helper,
									incapacitated: incapacitated,
									help: true
								})
						}else{
							resolve({
								helper: helper,
								incapacitated: incapacitated,
								help: false
							})
						}
					}
				}
			}
		}
	});
}

function startHelping(helper, incapacitated){
	console.log(gameData.helping[helper.id + incapacitated.id] === undefined)
	if (gameData.helping[helper.id + incapacitated.id] === undefined){
		console.log("entre")
		var timeout = setTimeout(function(){ 
			console.log("salvado papu")
			incapacitated.incapacitated = false;
			incapacitated.speed = playerSpeed;
			//clearTimeout(gameData.helping[helper.id + incapacitated.id].interval);
			delete gameData.helping[helper.id + incapacitated.id];
		}, 3000)
		gameData.helping[helper.id + incapacitated.id] = {
			helper: helper,
			incapacitated: incapacitated,
			timeout: timeout
		}
	}
}

function stopHelping(helper, incapacitated){
	/*if (gameData.helping[helper.id + incapacitated.id] !== undefined){
		clearTimeout(gameData.helping[helper.id + incapacitated.id].interval);
		delete gameData.helping[helper.id + incapacitated.id];
	}*/
}

module.exports = app;