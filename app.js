var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var gameRouter = require('./routes/game');
var spectatorRouter = require('./routes/spectator');

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
app.use('/spectator', spectatorRouter);

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

var width = 350;
var height = 550;
var bulletSpeed = 5;
var bulletMaxSize = 50;
var bulletMinSize = 10;
var playerWidth = 25;
var playerHeight = 25;
var playerSpeed = 5;
var playerIncapacitatedSpeed = 0.3;
var secondsToCross = 20;
var helping = {}
var cross = {
	horizontal: {
		x: width / 2 - 5,
		y: 0,
		width: 10,
		height: height
	},
	vertical: {
		x: 0,
		y: height / 2 - 5,
		width: width,
		height: 10
	}
}

var gameData = {
	players: {},
	bullets: [],
	cross: null,
	total: 0
}

setTimeout(function(){
	gameData.cross = cross;
}, secondsToCross * 1000)

io.on('connection', function(socket) {
	socket.on('modifier', function(data) {
		bulletSpeed = data.bulletSpeed
	});
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
		kill(socket.id)
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
			kill(player.id)
		}else{
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

				if (gameData.cross){
					if ((gameData.cross.horizontal.x + gameData.cross.horizontal.width) > player.x &&
						gameData.cross.horizontal.x < player.x + player.width &&
						(gameData.cross.horizontal.y + gameData.cross.horizontal.height) > player.y &&
						gameData.cross.horizontal.y < player.y + player.height){
							resolve(player, i)
					}
					if ((gameData.cross.vertical.x + gameData.cross.vertical.width) > player.x &&
						gameData.cross.vertical.x < player.x + player.width &&
						(gameData.cross.vertical.y + gameData.cross.vertical.height) > player.y &&
						gameData.cross.vertical.y < player.y + player.height){
							resolve(player, i)
					}
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
					if (helper.id !== incapacitated.id && !helper.incapacitated){
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
	if (helping[`${helper.id}${incapacitated.id}`] == null){
		helping[`${helper.id}${incapacitated.id}`]  = {
			helper: helper,
			incapacitated: incapacitated,
			timeout: setTimeout(function(){
				console.log(`${helper.name} saved ${incapacitated.name}`)
				incapacitated.incapacitated = false;
				incapacitated.speed = playerSpeed;
				clearTimeout(helping[`${helper.id}${incapacitated.id}`].timeout)
				delete helping[`${helper.id}${incapacitated.id}`];
			}, 3000)
		}
	}
}

function stopHelping(helper, incapacitated){
	if (helping[`${helper.id}${incapacitated.id}`] != null){
		console.log(`${helper.name} canceled saving ${incapacitated.name}`)
		clearTimeout(helping[`${helper.id}${incapacitated.id}`].timeout)
		delete helping[`${helper.id}${incapacitated.id}`];
	}
}

function kill(id){
	delete gameData.players[id];
	gameData.total--;
}

module.exports = app;