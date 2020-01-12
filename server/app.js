const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`); // renders files in this directory
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


app.use(require('./middleware/cookieParser'));
app.use(Auth.createSession);

// https://www.shortly.com/
app.get('/', Auth.verifySession, (req, res) => { // callback

  // if cookie
    // if not expired
      // show links
    // else (if expired)
      // show login
  // else if no cookie then signup

  // temporary until we write the pseudocode above
  res.render('index');
  // for troubleshooting: res.render('signup');
});

// is this needed?
app.get('/login',
(req, res) => {
  res.render('login');
});

app.get('/signup',
(req, res) => {
  res.render('signup');
});

app.get('/create', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession, (req, res, next) => {
  models.Links.getAll() // no argument gets all links
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      // console.log('app.get /links:', error)
      res.status(500).send(error);
    });
});

app.post('/links', Auth.verifySession, (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        // console.log('app.post(\'/links: models.Links.get', link)
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
      // console.log('app.post /links error:', error)
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
  // does user already exist?
  let username = req.body.username;
  let password = req.body.password;

  return models.Users.get({username})
    .then(user => {
      // if yes --> go to signup or login?
      if (user) {
        // go to signup or login?
        throw user;
      }

      // create user
      return models.Users.create({username, password});
    })
    .then(results => {
      // session stuff
      // console.log('signup after create promise', results);
      return models.Sessions.update({hash: req.session.hash}, {userId: results.insertId});
    })
    .then(() => {
      // once signed in go to /
      res.redirect('/');
    })
    .error(err => { // occurs on error (promise rejection)
      // console.log('err in signup', err);
      res.status(500).send(err);
    })
    .catch(user => { // catch exceptions (for throw)
      // go back to signup or login
      res.redirect('/signup');
    })

  // does the user already exist?
  // models.Users.get({username: req.body.username}).then(data => console.log(data));
/*
  return models.Users.create(
    {username: req.body.username, password: req.body.password}
    ).then(user => {
      // see if user exists first, if so send feedback; if not then proceed
      // send back cookie
      // console.log('models.Users.create user:', user);
      res.location('index');
      res.render('index'); // change to login???
    }).catch(err => {
      // send
      res.location('signup');
      res.render('signup');
    }); */
});


// POST: '/login' username and password
app.post('/login',
(req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;

  return models.Users.get({username})
    .then(user => {
      if (!user || !models.Users.compare(password, user.password, user.salt)) {
        // redirect to login
        throw user;
      }

      return models.Sessions.update({hash: req.session.hash}, {userId: user.id});

    })
    .then(() => {
      // go to main
      res.redirect('/');
    }) // add error here?
    .error(err => {
      // console.log('login error', err)
      res.status(500).send(err);
    })
    .catch(() => {
      res.redirect('/login');
    })

  // find user
    // if found with password match
      // check if session
      // go to '/'
    // else
      // redirect to login


/*
  // does the user already exist?
  let user = {username: req.body.username, password: req.body.password};
  // check if the username exists -- models.Users.get
  // check if the username entered the right password

  // select salt from users where username = req.body.username
  return models.Users.get(salt: )
  models.Users.get({password: utils.createHash(req.body.password)})
    .then(results => {
      console.log('login hashed password:', results, 'for password: ', req.body.password);
      // models.Users.compare( results??? user object???  )
    }).catch(err => console.log('login hashed error', err)) */

  // was password correct?

  // get user's links from database

  // models.Links.getAll()
  //   .then(links => {
  //     res.status(200).send(links);
  //   })
  //   .error(error => {
  //     res.status(500).send(error);
  //   });

  // render user's personal links page

  // return models.Users.getAll(user).then(data => console.log(data))

});

app.get('/logout', (req, res, next) => {

  return models.Sessions.delete({hash: req.cookies.shortlyid})
    .then(() => {
      res.clearCookie('shortlyid');
      res.redirect('/login');
    })
    .error(error => {
      res.status(500).send(error);
    });
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
