const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Order = require('../models/order');

const userSchema = new Schema({
  username: {
    type: String,
    required: false,
  },

  email: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },

  resetToken: {
    type: String,
    required: false,
  },

  resetTokenExpiration: {
    type: Date,
    required: false,
  },

  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        title: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
  },
});

userSchema.methods.addToCart = function (product) {
  let cartItems = [...this.cart.items];
  let total = +Number.parseFloat(this.cart.total || 0).toFixed(2);

  product.price = +Number.parseFloat(product.price).toFixed(2);
  total = +(total + product.price).toFixed(2);

  const cartProductIndex = cartItems.findIndex(item => {
    return item.productId.toString() === product._id.toString();
  });

  if (cartProductIndex > -1) {
    const cartItem = cartItems[cartProductIndex];
    cartItem.quantity = cartItem.quantity + 1;
    cartItem.price = +Number.parseFloat(
      cartItem.quantity * product.price,
    ).toFixed(2);
  } else {
    cartItems.push({
      productId: product._id,
      title: product.title,
      quantity: 1,
      price: product.price,
    });
  }

  const updatedCart = cartItems.length
    ? { items: cartItems, total: total }
    : {
        items: [
          {
            productId: product._id,
            title: product.title,
            quantity: 1,
            price: product.price,
          },
        ],
        total: product.price,
      };

  this.cart = updatedCart;

  return this.save();
};

userSchema.methods.deleteItemFromCart = function (id) {
  const updatedCartItems = this.cart.items.filter(item => {
    if (item.productId.toString() === id.toString()) {
      this.cart.total = Number(this.cart.total - item.price).toFixed(2);
    }

    return item.productId.toString() !== id.toString();
  });

  this.cart.items = updatedCartItems;

  return this.save();
};

userSchema.methods.addOrder = function () {
  return this.populate('cart.items.productId')
    .then(user => {
      const orderedProducts = user.cart.items.map(item => {
        return {
          product: { ...item.productId._doc },
          quantity: item.quantity,
        };
      });

      const order = new Order({
        user: { username: this.username, email: this.email, userId: this._id },
        products: orderedProducts,
        total: this.cart.total,
      });

      this.cart.items = [];
      this.cart.total = 0;
      this.save();
      return order.save();
    })
    .catch(err => next(new Error(err)));
};

userSchema.methods.getOrders = function () {
  return Order.find({ 'user.userId': this._id }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('User', userSchema);
