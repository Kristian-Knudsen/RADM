const express = require('express');
const RADM = require('../RADM');
const mysql = require('mysql');

var datastorer = new RADM();
const app = express();
const conn = mysql.createConnection({host: "localhost", user: "root", password: "", database: "radm_testing"});

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.send(datastorer.storage);
    datastorer.snapShot();
});

app.get('/t', (req, res) => {
    datastorer.restoreStoragebyChunkId('0ac273c4-35c0-49c2-85f5-9bf7c8446972');
    res.send("Restored data");
});

app.get('/pushdata', (req, res) => {
    let key = req.query.key;
    let value = req.query.value;

    console.log(key, value);

    datastorer.addDocument("table1", key, value);

    res.send("True");
});

app.get('/adminoverview', (req, res) => {
    conn.query("SELECT chunkid, created_at FROM chunks GROUP BY chunkid", (err, result) => {
        if(err) return res.send(err);
        return res.render('index', {data: result});
    })
    
});

app.listen(5000, () => {
    console.log('Test listening at port http://localhost:5000');
});