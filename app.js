var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//var multer = require('multer');
var mongoose = require('mongoose');
var google_save = require('./models/user');
var Bing = require('node-bing-api')({accKey: "62b20a7efdf3420389194268be973359"});


var mysql = require('mysql');
var connection = mysql.createConnection({
    host: '',
    user: '',
    password: '',
    database: ''
});

var options = {
    user: '',
    pass: ''
}
mongoose.connect('', options);


passport.use(new FacebookStrategy({
        clientID: '',
        clientSecret: '',
        callbackURL: 'http://localhost:3000/auth/facebook/callback',
        enableProof: true
    },
    function (accessToken, refreshToken, profile, done) {

        process.nextTick(function () {
            console.log(profile.id);
            console.log("Your accessToken is :" + accessToken);
            console.log("Your refreshToken is :" + refreshToken);
            done(null, profile);
        });
    }));
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});


var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine("html", require("ejs").__express);
app.set('view engine', 'html');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());
//app.use(multer());

app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        var namespace = param.split('.')
            , root = namespace.shift()
            , formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));


var routes = require('./routes/index');
var search = require('./routes/search');
var users = require('./routes/users');

app.use(session({
    secret: 'secret',
    cookie: {httpOnly: true, maxAge: 1000 * 20 * 60},
    saveUninitialized: true,
}));
function extractProfile(profile) {
    var imageUrl = '';
    if (profile.photos && profile.photos.length) {
        imageUrl = profile.photos[0].value;
    }
    return {
        id: profile.id,
        displayName: profile.displayName,
        image: imageUrl
    };
}


passport.use(new GoogleStrategy({
    clientID: "",
    clientSecret: '',
    callbackURL: 'http://localhost:3000/auth/google/callback',
    accessType: 'offline'
}, function (req, accessToken, refreshToken, profile, cb) {

    google_save.findOne({google_id: profile.id}, function (err, user) {
        if (err) {
            console.log(err);  // handle errors!
        }
        if (!err && user !== null) {
            //done(null, user);
        } else {
            user = new google_save({
                username: profile.displayName,
                password: null,
                email: profile.emails[0].value,
                name: profile.displayName,
                google_id: profile.id
            });
            query_sql = "INSERT INTO user(user_id, name) VALUES((SELECT HEX(AES_ENCRYPT(123, '" + profile.emails[0].value + "'))),'" + profile.displayName + "')"
            connection.query(query_sql, function (err, rows) {
            });
            user.save(function (err) {
                if (err) {
                    console.log(err);  // handle errors!
                } else {
                    console.log("saving user ...");
                    //done(null, user);
                }
            });
        }
    });
    global.google_user = profile.displayName;
    cb(null, extractProfile(profile));
}));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});


app.use('/', routes);

app.get('/logout', function (req, res, next) {
    if (global.google_user) {
        delete global.google_user;
    }

    delete req.session.user;
    res.redirect('index');
});

app.get('/index', function (req, res, next) {
    if (req.session.user !== null) {
        req.user = req.session.user;
    }
    console.log(req.user)
    res.render('index', req);
});

app.use("/logout", routes);
app.get("/loginto", users.loginStart);
app.get('/reg', users.startR);
app.get("/search", search.startSearch);
app.get("/startSearchAgain", search.startSearchAgain);
app.get("/insertReview", search.insertReviewNow);
app.get("/account", users.account);
app.get("/bing", function (req, res) {
    Bing.web(req.query.name + " " + req.query.location + " " + req.query.state + " " + req.query.sort, {top: 20}, function (error, res1, body) {
        if (body.webPages && body && body.webPages.value) {
            res.render('Bingsearch.html', {results: body.webPages.value});
        } else {
            res.render('noresult.html');


        }

    });

});


app.use(flash());

app.get('/auth/facebook', passport.authenticate('facebook'), function (req, res) {
});
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        sucessRedirect: '/',
        failureRedirect: '/loginto'
    }),
    function (req, res) {
    });


app.get('/auth/login',
    function (req, res, next) {
        if (req.query.return) {

            req.session.oauth2return = req.query.return;
            //console.log(req.session.oauth2return);
        }
        next();
    },

    // Start OAuth 2 flow using Passport.js
    passport.authenticate('google', {scope: ['email', 'profile']})
);

app.get(
    '/auth/google/callback',


    passport.authenticate('google'),


    function (req, res) {
        req.session.user = {username: global.google_user};

        res.redirect('/');
    }
);


// Global Vars
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

app.get('/auth/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


module.exports = app;