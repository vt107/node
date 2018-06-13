const mysql = require('mysql');
const async = require('async');

const mySql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'vantho',
    database: 'chat'
});

async.waterfall([
  (callback) => {
    mySql.query("SELECT * FROM items ORDER BY created_at DESC LIMIT 6",[], function (error, newItem) {
      if (error) throw error;
      callback(null, newItem);
    });
  },
  (newItem, callback) => {
    mySql.query("SELECT * FROM items ORDER BY sold DESC LIMIT 6",[], function (error, hotItem) {
      if (error) throw error;
      callback(null, newItem, hotItem);
    });
  }
], (error, newItem, hotItem) => {
  if (error) throw error;
  console.log(newItem.length);
  console.log(hotItem.length);
  process.exit(0);
});

