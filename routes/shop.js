const express = require('express');

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');
const router = express.Router();

router.get('/', shopController.getIndex);
router.get('/products', shopController.getProducts);
router.get('/products/:productId', shopController.getProduct);
router.get('/cart', isAuth, shopController.getCart);
router.post('/cart', isAuth, shopController.postCart);
router.post('/cart-delete-item', shopController.postCartDeleteProduct);
router.get('/checkout', isAuth, shopController.getCheckout);
router.post(
  '/create-checkout-session',
  isAuth,
  shopController.postCreateCheckoutSession,
);
router.get('/orders', isAuth, shopController.getOrders);
router.get('/checkout/success', isAuth, shopController.getSuccessPage);
router.get('/checkout/cancel', isAuth, shopController.getCheckout);
router.get("/orders/:orderId", isAuth, shopController.getInvoice);

module.exports = router;
