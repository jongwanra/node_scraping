const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'dreamele19!',
  database: 'mycar',
});

const cmd =
  ' CREATE TABLE mycar_info (id int(11) NOT NULL AUTO_INCREMENT, car_name char(10) DEFAULT NULL, car_age int(11) DEFAULT 0, PRIMARY KEY (id));';

createMycarTable(cmd);
function createMycarTable(cmd) {
  connection.connect();
  connection.query(`${cmd}`, function (error, results) {
    if (error) throw error;
    console.log(`Create Table`);
  });
  connection.end();
}

function createDatabase(dbName) {
  connection.connect();
  connection.query(`CREATE DATABASE ${dbName}`, function (error, results) {
    if (error) throw error;
    console.log('DB connected');
  });
  connection.end();
}
