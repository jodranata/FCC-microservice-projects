// the glitch website https://glitch.com/edit/#!/quickest-far-pendulum?path=package.json%3A20%3A4
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors');
const shortId = require('shortid');
const mongoose = require('mongoose');
// mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  serverSelectionTimeoutMS: 5000,
});
const connection = mongoose.connection;
connection.on('error', err => {
  console.error(err.message);
});
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json())

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// I can provide my own project, not the example url.
const Schema = mongoose.Schema;
const userSchema = new Schema(
  {
    username: String,
    _id: String,
  },
  { strict: false },
);
const User = mongoose.model('User', userSchema);
// I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post('/api/exercise/new-user', async (req, res) => {
  const {
    body: { username },
  } = req;
  if (username.length <= 3)
    return res
      .status(400)
      .json({ error: 'Username must be more than 3 characters' });
  const existedUser = await User.findOne({ username: username });
  if (existedUser)
    return res.json({ username: existedUser.username, _id: existedUser._id });
  const userId = shortId.generate();
  const userObj = { username, _id: userId };
  const createUser = new User(userObj);
  createUser.save();
  res.json(userObj);
});

const isDateValid = dateStr => {
  const objDate = new Date(dateStr);
  return objDate.toString() !== 'Invalid Date';
};

// I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.get('/api/exercise/users', (req, res) => {
  try {
    User.find({})
      .select('-__v')
      .exec((err, docs) => {
        if (err) return res.status(500).json({ error: err });
        res.json(docs);
      });
  } catch (error) {
    res.status(500).json('Internal Server Error');
  }
});

app.post('/api/exercise/add', (req, res) => {
  const {
    body: { userId, description, duration, date },
  } = req;
  if (!userId || !description || !duration)
    return res.status(400).json({ error: 'required fields must be filled' });
  const objDate = date === '' ? new Date() : new Date(date);
  if (objDate.toString() === 'Invalid Date')
    return res.status(400).json({ error: 'date must be on YYYY-MM-DD format' });
  const exercise = {
    description,
    duration: parseInt(duration),
    date: objDate,
  };

  User.findById(userId, (err, existedUser) => {
    if (err) return res.status(500).json('Internal Server Error');
    if (!existedUser) return res.status(404).json({ error: 'User Not Found' });
    const cloneUser = existedUser.toObject();

    const exerciseArr =
      !cloneUser.log || cloneUser.log.length < 1
        ? [exercise]
        : [...cloneUser.log, exercise];

    User.findByIdAndUpdate(
      userId,
      { log: exerciseArr },
      { strict: false, new: true, select: '-__v' },
      (err, newUserData) => {
        if (err)
          return res.status(500).json({ error: 'Internal Server Error' });
        res.json({
          username: cloneUser.username,
          _id: cloneUser._id,
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date.toDateString(),
        });
      },
    );
  });
});
// I can retrieve a full exercise log of any user by getting /api/exercise/log
// with a parameter of userId(_id).
// App will return the user object with added array log
// and count (total exercise count).
app.get('/api/exercise/log', (req, res) => {
  const {
    query: { userId, from, to, limit },
  } = req;

  //   check if from & to is null or not. if it's not check if the date is valid or not
  const startDate = !from
    ? new Date(0)
    : isDateValid(from)
    ? new Date(from)
    : null;
  const endDate = !to ? new Date() : isDateValid(to) ? new Date(to) : null;

  //  checkif limit is null or not
  const reqLimit = limit ? parseInt(limit) : 0;

  if (!userId) return res.status(400).json('Invalid User Id');

  if (startDate === null || endDate === null)
    return res.status(400).json('Invalid Date format');

  //  search user db by ID
  User.findById(userId, '-__v', (err, user) => {
    if (err) return res.status(500).json('Internal Server Error');
    if (!user) return res.status(404).json('User Not found');
    // clone data, because added data not in schema;
    const cloneUser = user.toObject();

    //  filter log obj based on from & to date
    const log = cloneUser.log
      .filter(obj => startDate < obj.date && obj.date < endDate)
      .sort((a, b) => a.date > b.date)
      .map(obj => {
        return {
          ...obj,
          date: obj.date.toDateString(),
        };
      });
    // limit the log based on limit, if limit is null || > log.length, limit = log.length
    log.length = !limit
      ? log.length
      : reqLimit <= log.length
      ? reqLimit
      : log.length;
    const filteredUserData = {
      username: user.username,
      _id: userId,
      count: log.length,
      log: log,
    };
    return res.json(filteredUserData);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res
    .status(errCode)
    .type('txt')
    .send(errMessage);
});

//
