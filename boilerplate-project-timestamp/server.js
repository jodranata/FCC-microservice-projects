// server.js
// where your node app starts

// init project
const express = require('express');

const app = express();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
const cors = require('cors');

app.use(cors({ optionSuccessStatus: 200 })); // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
});

// your first API endpoint...
app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

app.get('/api/timestamp', (req, res) => {
  res.json({
    unix: new Date().getTime(),
    utc: new Date().toUTCString(),
  });
});

app.get('/api/timestamp/:dateStr', (req, res) => {
  const { dateStr } = req.params;
  const validDate =
    new Date(dateStr).toString() !== 'Invalid Date'
      ? dateStr
      : new Date(parseInt(dateStr, 10)).toString() !== 'Invalid Date'
      ? parseInt(dateStr, 10)
      : null;

  if (validDate !== null) {
    return res.json({
      unix: new Date(validDate).getTime(),
      utc: new Date(validDate).toUTCString(),
    });
  }
  return res.json({
    error: 'Invalid Date',
  });
});
