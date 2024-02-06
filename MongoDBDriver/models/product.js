const getDb = require("../util/database").getDb;
const ObjectId = require("mongodb").ObjectId;

class Product {
  constructor(title, price, description, imageUrl, id, userId) {
    this.title = title;
    this.price = price;
    this.description = description;
    this.imageUrl = imageUrl;
    this.userId = userId;

    if (id) {
      this._id = new ObjectId(id);
    }
  }

  save() {
    const db = getDb();
    let dbOp;

    if (this._id) {
      dbOp = db
        .collection("products")
        .updateOne({ _id: this._id }, { $set: this });
    } else {
      dbOp = db.collection("products").insertOne(this);
    }
    return dbOp
      .then((result) => {
        console.log(result);
      })
      .catch((err) => console.log(err));
  }

  static fetchAll() {
    const db = getDb();

    return db
      .collection("products")
      .find()
      .toArray()
      .then((products) => {
        return products;
      })
      .catch((err) => console.log(err));
    }
    
    static findById(id) {
        const db = getDb();
    
        return db.collection("products").findOne(new ObjectId(id));
    }

  static deleteById(id) {
    const db = getDb();

    return db
      .collection("products")
      .deleteOne({ _id: new ObjectId(id) })
      .then((deleteResult) => {
        return deleteResult;
      })
      .catch((err) => console.log(err));
    }
}

module.exports = Product;
