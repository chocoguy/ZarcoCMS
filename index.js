const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const fileupload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const DAO = require('./Controller/DAO.js');
const path = require('path');

const app = express();
require('dotenv').config()
app.use(cors())
app.use(express.json({ extended: false }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use("/cms/v1", require('./Controller/routes'))
//app.use("/api/v1/search", require('./api/search'))
const PORT = process.env.PORT || 5000;


MongoClient.connect(
    process.env.DB_URI,
    { useNewUrlParser: true },
    { poolSize: 50 },
    { connectTimeoutMS: 2500 },
    { useUnifiedTopology: true },
)
    .catch(err => {
        console.error(err.stack)
        process.exit(1)
    })
    .then(async client => {
        await DAO.injectDB(client)
        app.listen(PORT, () => console.log(`Server running on Port ${PORT}`));
    })