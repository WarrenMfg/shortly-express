const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {

  // req.cookies --> .nameTheCookieWhateverYouWant
  Promise.resolve(req.cookies.shortlyID) // create promise; chain with then() statements
    .then(num => {
      if (!num) {
        // geneate session
        throw num;
      }

      // load session
      return models.Sessions.get({num}) // returns promise

    })
    .then(session => { // what is tap? passes argument to next chain link --bluebird?
      if (!session) {
        // generate session
        throw session;
      }

      return session;
    })
    .catch(() => { // handle session/errs in one place?
      // session
      return models.Sessions.create() // promise
        .then((result) => {
          return models.Sessions.get({id: result.insertId})
        })
        .then(session => { // what is tap? passes argument to next chain link --bluebird?
          // console.log('session catch', session);
          res.cookie('shortlyID', session.hash);
          return session;
        })
    })
    .then(session => {
      //return to client
      req.session = session;
      next();
    })

  // if cookie
    // check for session
    // if valid
      // load session
    // else make new session


  // else make new session

  // next(); // for express
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

// what goes here
module.exports.verifySession = (req, res, next) => {
  let session = req.session;

  if (!models.Sessions.isLoggedIn(session)) {
    // not logged in
    res.redirect('/login');
  } else {
    next();
  }
}