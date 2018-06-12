const express =  require('express');
const bodyParser = require('body-parser');
// const request = require('request');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const nanoid = require("nanoid");
const session = require('express-session')

const validator = require('./helper/validator.js');

const appConfig = {
  url: 'http://localhost:3000',
  tokenTime: 30, // minute
  mail_user: 'tktthack@gmail.com',
  mail_pass: '01686601430',
};

const gmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: appConfig.mail_user,
        pass: appConfig.mail_pass
    }
});

const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  resave: true,
  saveUninitialized: true
}));

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
  console.log(req.session.user);
  res.render('index', {});
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  let email = req.body.email;
  let password = req.body.password;

  if (!validator.lengthValid(email, 5, 200) || !validator.lengthValid(password, 5, 100)) {
    res.render('login', {error: 'e or pass invalid'});
  } else {
    mySql.query("SELECT * FROM users WHERE email=? AND confirmed=?", [email, 1], (error, result) => {
      if (error) throw error;
      if (result.length === 0) {
        res.render('login', {error: 'Sai thogn tin1'});
      } else {
        let user = result[0];
        bcrypt.compare(password, user['password'], (error, result) => {
          if (error) throw error;
          if (result) {
            req.session.user = {
              name: user['name'],
              email: user['email'],
              logged_in: true
            };
            res.render('login', {error: 'Dang nhap thanh cong'});
          } else {
            res.render('login', {error: 'Sai thogn tin2'});
          }
        })
      }
    });
  }
});

app.get('/register', function(req, res) {
  res.render('register');
});

app.get('/confirm-email', function(req, res) {
  let email = req.query.email;
  let token = req.query.token;
  if (!email || !token || email.length > 100 || token.length > 100) {
    res.render('message-only', {message: 'Xac minh that bai1'});
  } else {
    mySql.query("SELECT token, token_expired_at FROM users where email=? and confirmed=?", [email, 0], (error, result) => {
      if (error) throw error;
      if (!(result.length > 0 && new Date() < Date.parse(result[0]['token_expired_at']))) {
        res.render('message-only', {message: 'Xac minh that bai2'});
      } else {
        mySql.query("UPDATE users SET confirmed = ?", [1], (error, result) => {
          if (error) throw error;
          res.render('message-only', {message: 'Da xac minh'});
        })
      }
    });
  }
});

app.post('/register', function(req, res) {
  let email = req.body.email;
  let password = req.body.password;
  let name = req.body.name;

  // an field is missing
  if (!validator.lengthValid(email, 5, 200) || !validator.lengthValid(password, 5, 100)) {
    res.render('register', {error: 'Chieu dai e or pass'});
  } else if (!validator.lengthValid(name, 5, 200)) {
    res.render('register', {error: 'Chieu dai ten'});
  } else {
      // password length not satisfied
    if (password.length < 8 || password.length > 20) {
      res.render('register', {error: 'do dai'});
    } else if (!validator.isEmail(email)) { // Wrong format
        res.render('register', {error: 'dinh dang email'});
    } else if (!validator.alphabetOnly(password)) {
      res.render('register', {error: 'dinh dang password'});
    } else {
        // Check if exist before
        mySql.query("SELECT * FROM users WHERE email=?", [email], function (error, result) {
            if (error) throw error;
            if (result.length > 0 && parseInt(result[0]['confirmed']) === 1) {
              res.render('register', {error: 'email da dang ky'});
            } else {
              if (result.length > 0) {
                mySql.query("DELETE FROM users WHERE email = ?", [email]);
              }
              bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt, function(err, hash) {
                  if (err) throw err;
                  // Generate an token
                  let token = nanoid();
                  let tokenExpired = new Date();
                  tokenExpired.setMinutes(tokenExpired.getMinutes() + appConfig.tokenTime);
                  mySql.query("INSERT INTO users (email, name, password, confirmed, token, token_expired_at) VALUES (?, ?, ?, ?, ?, ?)", [email, name, hash, 0, token, tokenExpired], function(error, result) {
                    if (error) throw error;
                    // Send an email
                    let mailBody = `De hoan tat dang ky:
                        link: ${appConfig.url}/confirm-email?email=${email}&token=${token}"`;
                    sendMail('Admin', email, 'Hoan tat dang ky thanh', mailBody, (error, result) => {
                      if (error) throw error;
                      res.render('register', {message: `Email da duoc gui toi ${email}, hay xac nhan trong 30p`});
                    });

                  })
                });
              });
            }
        });
    }
  }
});

function sendMail(from, toEmail, subject, body, callback) {
  let mailOptions = {
    from: from,
    to: toEmail,
    subject: subject,
    text: body
  };
  // res.render('login', {message: 'created'})
  gmail.sendMail(mailOptions, callback);
}


server.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
