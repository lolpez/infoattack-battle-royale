var socket = io();
	
var joystick	= new VirtualJoystick({
	container: document.getElementById('joystickLeft'),
	mouseSupport: true,
	limitStickTravel: true
});

var movement = {
	up: false,
	down: false,
	left: false,
	right: false
}

var gamePlayers;
var isFullScreen = false;

setInterval(function(){
	joystick.right()	? movement.right = 	true : movement.right =	false;
	joystick.up()		? movement.up = 	true : movement.up = 	false;
	joystick.left()		? movement.left = 	true : movement.left = 	false;
	joystick.down()		? movement.down = 	true : movement.down = 	false;
}, 1/30 * 1000);

document.addEventListener('keydown', function(event) {
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
document.addEventListener('keyup', function(event) {
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
	if (isFullScreen){
		if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
	}else{
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

socket.emit('new player');
setInterval(function() {
	socket.emit('movement', movement);
}, 1000 / 60);

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
socket.on('state', function(players) {
	gamePlayers = players;
	redraw();
});

function redraw(){	
	context.translate(player.x - canvas.width / 2, player.y - canvas.height / 2);
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	context.fillStyle = 'green';
	for (var id in gamePlayers) {
		var player = gamePlayers[id];
		context.beginPath();
		context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
		context.fill();
	}
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	redraw();
}

canvas.onwheel = function(event){
    event.preventDefault();
};

canvas.onmousewheel = function(event){
    event.preventDefault();
};

window.addEventListener('resize', resizeCanvas, false);