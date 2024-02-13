// Nodejs packages
const path = require('path');

// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//Constants
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET;

//Utils
const fulFillOrder = require('./util/fulFillOrder');

// Models
const User = require('./models/user');

// Routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

// Initialization
const app = express();
const store = new MongoDBStore({
  uri: process.env.DB_CONNECTION_STRING,
  collection: 'sessions',
});
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime() + '_' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'),
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  }),
);

// Request from 3rd parties that unable to have csrfProtection
app.use(
  '/checkout/webhook',
  bodyParser.raw({ type: 'application/json' }),
  (req, res, next) => {
    console.log('postWebhook');

    const payload = req.body;
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        STRIPE_ENDPOINT_SECRET,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(event.type);

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
      stripe.checkout.sessions
        .retrieve(event.data.object.id, {
          expand: ['line_items'],
        })
        .then(sessionWithLineItems => {
          // Fulfill the purchase...
          return fulFillOrder(sessionWithLineItems);
        })
        .catch(error => {
          next(new Error(error));
        });
    }
    res.status(200).end();
  },
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();

  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  // for sync code will trigger error handling middleware
  // throw new Error('error');

  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }

      req.user = user;
      next();
    })
    .catch(err => {
      // uuse in async code
      next(new Error(err));
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error);
  if (error.httpStatusCode) {
    res.status(error.httpStatusCode);
  }

  res.render('500', {
    pageTitle: 'Error!',
    path: '/500',
  });
});

mongoose
  .connect(process.env.DB_CONNECTION_STRING)
  .then(() => {
    app.listen(8081);
  })
  .catch(err => console.log(err));
