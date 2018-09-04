var socket = io();

var joystick = new VirtualJoystick({
	container: document.getElementById('joystick'),
	mouseSupport: true,
	limitStickTravel: true
});

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
context.font = '20px san-serif';

var movement = {
	up: false,
	down: false,
	left: false,
	right: false
}

var gamePlayers = null;
var gameBullets = null;
var isFullScreen = false;
var currentPlayer = null;
var cross = null;

setInterval(function () {
	joystick.right() ? movement.right = true : movement.right = false;
	joystick.up() ? movement.up = true : movement.up = false;
	joystick.left() ? movement.left = true : movement.left = false;
	joystick.down() ? movement.down = true : movement.down = false;
}, 1 / 30 * 1000);

document.addEventListener('keydown', function (event) {
	switch (event.keyCode) {
		case 65: // A
			movement.left = true;
			break;
		case 87: // W
			movement.up = true;
			break;
		case 68: // D
			movement.right = true;
			break;
		case 83: // S
			movement.down = true;
			break;
	}
});
document.addEventListener('keyup', function (event) {
	switch (event.keyCode) {
		case 65: // A
			movement.left = false;
			break;
		case 87: // W
			movement.up = false;
			break;
		case 68: // D
			movement.right = false;
			break;
		case 83: // S
			movement.down = false;
			break;
	}
});

function requestFullScreen() {
	var elem = document.documentElement;
	if (isFullScreen) {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	} else {
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.msRequestFullscreen) {
			elem.msRequestFullscreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen();
		}
	}
	isFullScreen = !isFullScreen;
}

socket.emit('new player', { name: name });
socket.on('player info', function (playerInfo) {
	currentPlayer = playerInfo;
});

setInterval(function () {
	socket.emit('movement', movement);
}, 1000 / 60);

socket.on('state', function (gameData) {
	document.getElementById('playerCount').innerHTML = `${gameData.total} alive`;
	gamePlayers = gameData.players;
	gameBullets = gameData.bullets;
	cross = gameData.cross;
	redraw();
});

function redraw() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = 'green';
	for (var id in gamePlayers) {
		var player = gamePlayers[id];
		if (currentPlayer)	if (player.id === currentPlayer.id) currentPlayer = player;
		context.beginPath();
		//context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
		context.rect(player.x, player.y, player.width, player.height);
		context.fillText(player.name, player.x - context.measureText(player.name).width + (context.measureText(player.name).width / 2), player.y - 20);
		context.fill();
	}
	context.fillStyle = 'black';
	for (var id in gameBullets) {
		var bullet = gameBullets[id]
		context.beginPath();
		context.rect(bullet.x, bullet.y, bullet.width, bullet.height);
		context.fill();
	}
	if (cross){
		context.beginPath();
		context.rect(cross.horizontal.x, cross.horizontal.y, cross.horizontal.width, cross.horizontal.height);
		context.rect(cross.vertical.x, cross.vertical.y, cross.vertical.width, cross.vertical.height);
		context.fill();
	}
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	redraw();
}