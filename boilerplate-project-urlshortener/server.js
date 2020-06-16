'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const shortId = require('shortid')
var cors = require('cors');
require('dotenv').config();
var app = express();

const dns = require('dns');
// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.DB_URI);

mongoose.connect(process.env.MONGO_URI, 
                 { 
                    useNewUrlParser: true, 
                    useUnifiedTopology: true, 
                    useFindAndModify: false,
                    serverSelectionTimeoutMS: 5000
                 })

const connection = mongoose.connection;
connection.on('error', (err) => {console.error(err.message)});
connection.once('open', () => {
  console.log('MongoDB database connection established successfully')});
app.use(cors());
/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});

const REPLACE_REGEX = /^https?:\/\//i
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: String,
  short_url: String,
})
const URL = mongoose.model('URL', urlSchema);

app.post('/api/shorturl/new', (req, res) => {
  const { url } = req.body;

  const noProtocolUrl = url.replace(REPLACE_REGEX, '');
  dns.lookup(noProtocolUrl, async (err, address, family) => {
    if (err) return res.status(401).json({ 
      error: 'invalid URL'
    });
    const shortUrl = shortId.generate();
    const existedUrl = await URL.findOne({ original_url: url });
    if (existedUrl) return res.json({
      original_url: existedUrl.original_url,
      short_url: existedUrl.short_url,
    });
    const urlObj = {
      original_url: url,
      short_url: shortUrl,
    };
    const createUrl = new URL(urlObj)
    createUrl.save();
    res.json(urlObj)
  })
})

app.get('/api/shorturl/:urlId', async (req, res) => {
  try {
    const { urlId } = req.params
    const existedUrl = await URL.findOne();
    if (!existedUrl) return res.status(404).json({error: 'No URL Found'});
    res.redirect(urlId)  
  } catch(err) {
    res.status(500).json({error: 'Server Erro'})
  }
})

