const express =  require('express');
const bodyParser = require('body-parser');
// const request = require('request');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const async = require('async');
const nanoid = require("nanoid");

const appConfig = {
  tokenTime: 30, // minute
  mail_user: 'tktthack@gmail.com',
  mail_pass: '0686601430',
};

const gmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: appConfig.mail_user,
        pass: appConfig.mail_pass
    }
});

const app = express();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Set up mysql
const mySql = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'vantho',
  database: 'chat'
});

mySql.connect(function(err) {
  if (err) throw err;
  console.log('Connected database!');
});


app.get('/', function(req, res) {
  res.render('index', {});
});

app.post('/', function (req, res) {

});

app.post('/login', function(req, res) {
  let username = req.body.username;
  let password = req.body.password;

  if (!username || !password ) {
    res.render('login', {error: 'Missing username or password!'});
    return;
  }
});

app.post('/register', function(req, res) {
  let email = req.body.email;
  let password = req.body.password;
  let name = req.body.name;
  // an field is missing
  if (!(name && email && password)) {
    res.render('register', {error: 'Missing field!'});
  } else {
      // password length not satisfied
    if (password.length < 8 || password.length > 20) {
      res.render('register', {error: 'length!'});

    } else if (!/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(email)) { // Wrong format
        res.render('email', {error: 'format'});
    } else if (!/^[a-z0-9]+$/.test(password)) {
      res.render('register', {error: 'format'});
    } else {
        // Check if exist before
        mySql.query("SELECT * FROM users WHERE email=?"[email], function (error, result) {
            if (error) throw error;
            if (result.length > 0) {

            } else {
                bcrypt.hash(password, 10, function(err, hash) {
                    if (err) throw err;
                    // Generate an token
                    let token = nanoid();
                    let tokenExpired = new Date();
                    tokenExpired.setMinutes(tokenExpired.getMinutes() + appConfig.tokenTime);
                    mySql.query("INSERT INTO users (email, name, password, confirmed, token, token_expired_at) VALUES (?, ?, ?, ?, ?, ?)", [email, name, hash, 0, token, tokenExpired], function(error, result) {
                        if (error) throw error;
                        // Send an email
                        let mailOptions = {
                            from: 'Admin chat',
                            to: email,
                            subject: 'Hoan tat dang ky thanh vien',
                            text: 'That was easy!'
                        };
                        // res.render('login', {message: 'created'})
                        gmail.sendMail(mailOptions, function(error, info){
                            if (error) console.log(error);
                        });

                        res.render('register', {message: 'Email da duoc gui, hay xac nhan', email: email});
                    })
                });
            }
        });

    }


  }

});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
