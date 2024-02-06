const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnect = (callback) => {
  MongoClient.connect(process.env.DB_CONNECTION_STRING)
    .then((client) => {
      _db = client.db();
      console.log("connected");
      callback();
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

const getDb = () => {
  if (_db) {
    return _db;
  }

  throw "No Database found!";
};

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
