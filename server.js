const express =  require('express');
const bodyParser = require('body-parser');
const request = require('request');
const mysql = require('mysql');
const bcrypt = require('bcrypt');


const app = express();

const apiKey = '76e9a0962ffd50b37af23161108be89c';

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
  mySql.query("SELECT * FROM test WHERE name='name1'", function(error, result) {
    if (error) throw error;
    console.log(result);
  });
  res.render('index', {weather: null, error: null});
});

app.post('/', function (req, res) {
  let city = req.body.city;

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
  let username = req.body.username;
  let password = req.body.password;
  let name = req.body.name;
  if (!(name && username && password)) {
    res.render('register', {error: 'Missing field!'});
  } else {
    if (password.length < 8 || password.length > 20) {
      res.render('register', {error: 'length!'});
    } else if (!/^[a-z0-9]+$/.test(password)) {
      res.render('register', {error: 'format'});
    } else {
      bcrypt.hash(password, 10, function(err, hash) {
        if (err) throw err;
        mySql.query("INSERT INTO users (username, name, password) VALUES (?, ?, ?)", [user])
      });
    }


  }

});

//bcrypt.hash('myPassword', 10, function(err, hash) {
//   // Store hash in database
// });

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


// Code request example
// let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`
// request(url, function (err, response, body) {
//   if (err) {
//     res.render('index', {weather: null, error: 'Error, please try again!'})
//   } else {
//     let weather = JSON.parse(body);
//     if (weather.main === undefined) {
//       res.render('index', {weather: null, error: 'Error, please try again'})
//     } else {
//       let weatherText = `it's ${weather.main.temp} degrees in ${weather.name}!`;
//       res.render('index', {weather: weatherText, error: null})
//     }
//   }
// });