var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.redirect("/");
});

router.post('/', function(req, res, next) {
	res.render('game', { title: 'Infoattack Battle Royale' , name: req.body.name});
});

module.exports = router;
