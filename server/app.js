const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/',
(req, res) => {
  // if cookie then show links
  // res.render('index');
  // if no cookie then signup
  res.render('signup');
});

app.get('/login',
(req, res) => {

  res.render('login');
});

app.get('/create',
(req, res) => {
  res.render('index');
});

app.get('/links',
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links',
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    console.log('app.post/links', req.body, url);
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
// These routes should enable a user to register for a new account and for users to log in to your application.
// POST: '/signup' username and password
app.post('/signup',
(req, res, next) => {

  // does the user already exist?

  return models.Users.create(
    {username: req.body.username, password: req.body.password}
    ).then(user => {
      // see if user exists first, if so send feedback; if not then proceed
      // send back cookie
      res.render('index'); // change to login???

      console.log('server app.js app.post/signup:', user);
    })
});


// POST: '/login' username and password
app.post('/login',
(req, res, next) => {

  // does the user already exist?
  let user = {username: req.body.username, password: req.body.password};

  // return models.Users.getAll(user).then(data => console.log(data))

  // return models.Users.create(
  //   {username: req.body.username, password: req.body.password}
  //   ).then(user => {
  //     // see if user exists first, if so send feedback; if not then proceed
  //     // send back cookie and user's links
  //     res.render('index');
  //     // reroute browser to linksView.js
  //     console.log('server app.js app.post/signup:', user);
  //   })
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => { // our shortly code???

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
