const getDb = require("../util/database").getDb;
const ObjectId = require("mongodb").ObjectId;

class User {
  constructor(username, email, cart, id) {
    this.username = username;
    this.email = email;
    this.cart = cart; // {items: []}
    this._id = id;
  }

  save() {
    const db = getDb();

    return db.collection("users").insertOne(this);
  }

  addToCart(product) {
    const db = getDb();
    let cartItems; 

    if (this.cart && this.cart.items) {
      cartItems = [...this.cart.items];
      const cartProductIndex = cartItems.findIndex((item) => {
        return item.productId.toString() === product._id.toString();
      });
  
      if (cartProductIndex > -1) {
        const cartItem = cartItems[cartProductIndex];
        cartItem.quantity = cartItem.quantity + 1;
      } else {
        cartItems.push({ productId: new ObjectId(product._id), quantity: 1 });
      }
    }

    const updatedCart = cartItems ? { items: cartItems } : {items: [{ productId: new ObjectId(product._id), quantity: 1 }]};

    return db.collection("users")
      .updateOne(
        { _id: new ObjectId(this._id) },
        {$set: {cart: updatedCart}}
      );
  }

  getCart() {
    const db = getDb();
    const productIds = this.cart.items.map((item) => {
      return item.productId;
    });

    return db.collection("products").find({ _id: { $in: productIds } })
      .toArray()
      .then(products => {
        return products.map((item) => {
          return {
            ...item, quantity: this.cart.items.find((cartItem) => {
              return cartItem.productId.toString() === item._id.toString();
            }).quantity
          }

        });
    })
  }

  deleteItemFromCart(id) {
    const db = getDb();
    const updatedCartItems = this.cart.items.filter((item) => {
      return item.productId.toString() !== id.toString()
    });

    return db.collection("users")
    .updateOne(
      { _id: new ObjectId(this._id) },
      {$set: {cart: {items: updatedCartItems}}}
    );
  }

  addOrder() {
    const db = getDb();

    return this.getCart()
    .then((products) => {
        const order = {
          items: products,
          user: {
            _id: new ObjectId(this._id),
            username: this.username,
            email: this.email
          }
        };
        return db.collection("orders").insertOne(order)
    })
    .then((result) => {
      this.cart = { items: [] };

      return db.collection("users")
        .updateOne(
          { _id: new ObjectId(this._id) },
          { $set: { cart: { items: [] } } }
        );
    });    
  }

  getOrders() {
    const db = getDb();

    return db
      .collection("orders")
      .find({ "user._id": new ObjectId(this._id) })
      .toArray()
  }

  static findById(id) {
    const db = getDb();

    return db.collection("users").findOne(new ObjectId(id));
  }
}

module.exports = User;
