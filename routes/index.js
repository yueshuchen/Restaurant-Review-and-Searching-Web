var express = require('express');
var router = express.Router();

/* GET index page. */
router.get('/', function(req, res,next) {
    if (global.google_user){
        req.session.user = {username: global.google_user};
    }
    if(req.session.user!== null){
        req.user=req.session.user;
    }
    //
    res.render('index', req);    // 到达此路径则渲染index文件，并传出title值供 index.html使用
});


/* GET login page. */
router.route("/login").get(function(req,res){    // 到达此路径则渲染login文件，并传出title值供 login.html使用
	res.render("login",{title:'User login'});
});

/* GET register page. */
router.route("/register").get(function(req,res){    // 到达此路径则渲染register文件，并传出title值供 register.html使用
	res.render("register",{title:'User register'});
})
module.exports = router;