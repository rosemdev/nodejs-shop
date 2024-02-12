const { query, body } = require("express-validator");

const express = require('express');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');


const router = express.Router();



// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// // /admin/add-product => POST
router.post('/add-product',
    isAuth,
    body("title", "Please enter a valid title").isString().isLength({ min: 2, max: 45 }).trim(),
    body("price", "Please enter a valid price").isFloat().trim().isLength({ min: 1, max: 10 }),
    body("description", "Please enter a valid description").isLength({ min: 2, max: 45 }).trim(),
    adminController.postAddProduct
);

// // /admin/edit-product => GET
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

// // // /admin/edit-product => POST
router.post('/edit-product/',
    isAuth,
    body("title", "Please enter a valid title").isString().isLength({ min: 2, max: 45 }).trim(),
    body("price", "Please enter a valid price").isFloat().trim().isLength({ min: 1, max: 10 }),
    body("description", "Please enter a valid description").isLength({ min: 2, max: 45 }).trim(),
    adminController.postEditProduct);

// // // /admin/delete-product => POST
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
