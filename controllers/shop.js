const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//Constants
const ITEMS_PER_PAGE = 3;

exports.getIndex = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(productsNumber => {
      totalItems = productsNumber;

      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE + page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
        pageTitle: 'Shop',
        path: '/',
        csrfToken: req.csrfToken(),
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;

      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(productsNumber => {
      totalItems = productsNumber;

      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE + page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
        pageTitle: 'All Products',
        path: '/products',
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        pageTitle: product.title,
        path: '/products',
        product: product,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      res.render('shop/cart', {
        pageTitle: 'Your Cart',
        path: '/cart',
        products: user.cart.items,
        total: user.cart.total,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;

  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect('/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;

  req.user
    .deleteItemFromCart(prodId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  req.user.getOrders().then(orders => {
    res.render('shop/orders', {
      pageTitle: 'Your Orders',
      path: '/orders',
      orders: orders,
    });
  });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      res.render('shop/checkout', {
        pageTitle: 'Checkout',
        path: '/checkout',
        products: user.cart.items,
        total: user.cart.total,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCreateCheckoutSession = (req, res, next) => {
  const DOMAIN = `${req.protocol}://${req.get('host')}`;
  let productMap = new WeakMap();
  let products;

  req.user
    .populate('cart.items.productId')
    .then(user => {
      if (!user) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      }

      products = user.cart.items;

      return products;
    })
    .then(products => {
      return Promise.all(
        products.map(product => {
          return stripe.products
            .create({
              name: product.title,
            })
            .then(stripeProduct => {
              productMap.set(product, { product: stripeProduct });
              return stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: product.price * 100,
                currency: 'usd',
              });
            })
            .then(price => {
              productMap.get(product).price = price;

              return product;
            });
        }),
      );
    })
    .then(products => {
      return products.map(product => {
        return {
          price: productMap.get(product).price.id,
          quantity: 1,
        };
      });
    })
    .then(lineItems => {
      return stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: 'payment',
        client_reference_id: req.user._id.toString(),
        success_url: `${DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${DOMAIN}/checkout/cancel`,
        automatic_tax: { enabled: true },
      });
    })
    .then(session => {
      if (session && session.url) {
        res.redirect(303, session.url);
      }
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getSuccessPage = (req, res, next) => {
  return stripe.checkout.sessions
    .retrieve(req.query.session_id, {
      expand: ['line_items'],
    })
    .then(session => {
      res.render('shop/success', {
        pageTitle: 'Success',
        path: '/success',
        order: {
          products: session.line_items.data,
          total: Number(session.amount_total / 100).toFixed(2),
        },
      });
    })
    .catch(err => next(new Error(err)));
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then(order => {
      if (!order) {
        return next(new Error('No order found'));
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('Unauthorized'));
      }

      const invoiceName = `invoice_${orderId}.pdf`;
      const invoicePath = path.join('data', 'invoices', invoiceName);
      const orderUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const pdfDoc = new pdfDocument();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=${invoiceName}`,
      });

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc
        .fontSize(23)
        .text('Invoice for the order id:', {
          align: 'center',
        })
        .fillColor('#e71661')
        .text(order._id.toString(), {
          align: 'center',
          link: orderUrl,
        });
      pdfDoc
        .fillColor('#000000')
        .text('____________________________________')
        .moveDown();
      pdfDoc.fontSize(18);
      pdfDoc
        .text(`Billing address:`)
        .fontSize(14)
        .text(`Username: ${order.user.username || ''}`)
        .fontSize(14)
        .text(`Email: ${order.user.email || ''}`)
        .moveDown();
      pdfDoc.fontSize(18).text('Ordered products:').moveDown(0.5);

      order.products.forEach((item, index) => {
        pdfDoc
          .fontSize(14)
          .text(
            `${item.quantity} x ${item.product.title} -  $${item.product.price}`,
          );
      });

      pdfDoc.moveDown().fontSize(18).text(`Total: $${order.total}`);
      pdfDoc.pipe(res);
      pdfDoc.end();

      // Not a performant way, instead do fileStreaming
      // fs.readFile(invoicePath, (err, data) => {});
      // for files served localy
      // const file = fs.createReadStream(invoicePath);
      // file.pipe(res);
    })
    .catch(err => next(err));
};
