const parseCookies = (req, res, next) => {

  // console.log(req.get('Cookie'));
  let cookieStr = req.get('Cookie') || ''; // get: express method to get cookie stuff // req.cookies?
  let parsedCookies = cookieStr.split('; ').reduce((cookies, cookie) => {
    if (cookie) {
      let parts = cookie.split('=');
      cookies[parts[0]] = parts[1];
    }
    return cookies;


  }, {}) // turn into key/value pair object

  //console.log(cookieStr);
  req.cookies = parsedCookies;

  next(); // need this for Express
};

module.exports = parseCookies;