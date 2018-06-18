const mysql = require('mysql');
// const async = require('async');

const mySql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'vantho',
    database: 'chat'
});

mySql.query("UPDATE test set name = ? WHERE id = 2",['test2'], function (error, result) {
  if (error) throw error;
  console.log(result);
  process.exit();
});
