var User = require('../models/user');

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: '',
    user: '',
    password: '',
    database: ''
});


// Login
exports.loginStart = function (req, res) {

    var username = req.query.login_username;
    var password = req.query.login_password;

    User.getUserByUsername(username, function (err, user) {
        if (err) throw err;
        if (!user) {

            res.render('login', {errors: [{"msg": "Password or Username is not matching"}]});

        } else {
            User.comparePassword(password, user.password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    req.session.user = {username: username};

                    res.redirect('/');
                } else {
                    res.render('login', {errors: [{"msg": "Password or Username is not matching"}]});

                }
            });
        }

    })

}

// Register
exports.startR = function (req, res) {

    var name = req.query.name;
    var email = req.query.email;
    var username = req.query.username;
    var password = req.query.password;
    var password2 = req.query.password2;
    req.checkQuery('name', 'Name is required').notEmpty();
    req.checkQuery('email', 'Email is required').notEmpty();
    req.checkQuery('email', 'Email is not valid').isEmail();
    req.checkQuery('username', 'Username is required').notEmpty();
    req.checkQuery('password', 'Password is required').notEmpty();
    req.checkQuery('password2', 'Passwords do not match').equals(req.query.password);

    // Validation
    req.getValidationResult().then(function (result) {
        if (result.isEmpty()) {
            User.getUserByUsername(username, function (err, user) {
                if (err) throw err;
                if (!user) {
                    User.getUserByEmail(email, function (err, emailr) {
                        if (err) throw err;
                        if (!emailr) {
                            var newUser = new User({
                                name: name,
                                email: email,
                                username: username,
                                password: password,
                                google_id: null
                            });
                            User.createUser(newUser, function (err, user) {
                                if (err) throw err;
                                console.log(user);
                            });
                            query_sql = "INSERT INTO user(user_id, name) VALUES((SELECT HEX(AES_ENCRYPT(123, '" + username + "'))),'" + username + "')"
                            connection.query(query_sql, function (err, rows) {
                            });

                            res.redirect("/");

                        } else {

                            res.render('register', {errors: [{"msg": "Email is already taken"}]})

                        }
                    })
                } else {

                    res.render('register', {errors: [{"msg": "Username is already taken"}]});
                }
            })
        } else {

            var errors = result.array();
            res.render('register', {errors: errors})
        }
    })
};


//*********************Account*********************************//

exports.account = function (req, res) {
    req.session.choiceByUser = req.query.userChoice;
    username = req.session.user.username

    res.render('account.html', {user: req.session.user});

};

