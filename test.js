const mysql = require('mysql');

const mySql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'vantho',
    database: 'chat'
});



mySql.query("INSERT INTO test (name, expired_at) VALUES (?, ?)",['xxx', d], function (error, result) {
    if (error) throw error;
    console.log(result);
});