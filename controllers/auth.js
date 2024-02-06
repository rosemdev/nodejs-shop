const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

//Constants
const ONE_HOUR_IN_MLSECONDS = 3600000;

// model
const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SendGridApiKey,
    },
  })
);

exports.getLoginPage = (req, res, next) => {
  let message = req.flash("error");
  console.log("Session: getLoginPage", req.session);

  if (message && message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/login", {
    pageTitle: "Login",
    path: "/login",
    errorMessage: message,
    validationResult: [],
    oldInput: {
      email: '',
      password: '',
    },
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      pageTitle: "Login",
      path: "/login",
      errorMessage: errors.array()[0].msg,
      validationResult: errors.array(),
      oldInput: {
        email: email,
        password: password,
      },
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          pageTitle: "Login",
          path: "/login",
          errorMessage: 'Invalid email or password',
          validationResult: errors.array(),
          oldInput: {
            email: email,
            password: password,
          },
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((doMAtch) => {
          if (doMAtch) {
            req.session.user = user;
            req.session.isLoggedIn = true;

            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }

          return res.status(422).render("auth/login", {
            pageTitle: "Login",
            path: "/login",
            errorMessage: 'Invalid email or password',
            validationResult: errors.array(),
            oldInput: {
              email: email,
              password: password,
            },
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");

  if (message && message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationResult: []
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  console.log(errors);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationResult: errors.array()
    });
  }

  return bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [], total: 0 },
      });

      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      return transporter
        .sendMail({
          to: email,
          from: "romasemenyshyn@gmail.com",
          subject: "Signup succeeded!",
          html: "<h1>You sesscessfuly signed up to web shop!</h1>",
        })
        .catch((err) => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error)
        });
    });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");

  if (message && message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset password",
    errorMessage: message,
    token: "",
  });
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }

    const token = buffer.toString("hex");

    User.findOne({ email: email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with this email");

          return res.redirect("/reset");
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + ONE_HOUR_IN_MLSECONDS;

        return user.save();
      })
      .then((result) => {
        // res.redirect('/');

        res.render("auth/reset", {
          path: "/reset",
          pageTitle: "Reset password",
          errorMessage: "",
          token: token,
        });

        return transporter
          .sendMail({
            to: email,
            from: "romasemenyshyn@gmail.com",
            subject: "Password reset",
            html: `<h1>You requested a password reset!</h1>
                    <p>Click <a href="http://localhost:8081/reset/${token}">this link</a> to set a new password</p>`,
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error)
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  let message = req.flash("error");

  if (message && message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  const token = req.params.token;

  return User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "There is no such user or token has expired!");

        return res.redirect("/reset");
      }

      res.render("auth/new-password", {
        path: "/reset",
        pageTitle: "Create new password",
        userId: user._id.toString(),
        passwordToken: token,
        errorMessage: message,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postNewPassword = (req, res, next) => {
  let message = req.flash("error");

  if (message && message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  if (password !== confirmPassword) {
    req.flash("error", "The passwords are not the same");

    return res.redirect("back");
  }

  return User.findOne({
    _id: userId,
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "There is no such user");

        return res.redirect("/reset");
      }

      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;

          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          return transporter
            .sendMail({
              to: user.email,
              from: "romasemenyshyn@gmail.com",
              subject: "Password was reset!",
              html: "<h1>You sesscessfuly reset your password!</h1>",
            })
            .catch((err) => console.log(err));
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};
