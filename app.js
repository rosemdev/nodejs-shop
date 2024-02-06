// Nodejs packages
const path = require("path");

// Libraries
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");

// Models
const User = require("./models/user");


// Routes
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");

// Initialization
const app = express();
const store = new MongoDBStore({
  uri: process.env.DB_CONNECTION_STRING,
  collection: "sessions",
});
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime() + '_' + file.originalname);
  }
});

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage: fileStorage}).single('image'));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
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
    .then((user) => {
      if (!user) {
        return next();
      }

      req.user = user;
      next();
    })
    .catch((err) => {
      // uuse in async code
      next(new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  if (error.httpStatusCode) {
    res.status(error.httpStatusCode);
  }

  res.render("500", {
    pageTitle: "Error!",
    path: "/500",
  });
});

mongoose
  .connect(process.env.DB_CONNECTION_STRING)
  .then(() => {
    app.listen(8081);
  })
  .catch((err) => console.log(err));
