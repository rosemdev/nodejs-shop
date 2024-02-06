const express = require("express");
const { query, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

//login
router.get("/login", authController.getLoginPage);
router.post(
  "/login",
  body("email", "Please enter a valid email").isEmail().normalizeEmail(),
  body(
    "password",
    "Please enter a password with length min of 5 symbols"
  ).isLength({ min: 5 })
  .trim(),
  authController.postLogin
);
router.post("/logout", authController.postLogout);
//signup
router.get("/signup", authController.getSignup);
router.post(
  "/signup",
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail()
    .custom((value, { req }) => {
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject("The email is already in use");
        }
      });
    }),
  body(
    "password",
    "Please enter a password with length min of 5 symbols"
  ).isLength({ min: 5 })
  .trim(),
  body("confirmPassword").trim().custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password doesn't match!");
    }

    return true;
  }),
  authController.postSignup
);
//RESET
router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);
//Create new password
router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);

module.exports = router;
