const Product = require("../models/product");
const { validationResult } = require("express-validator");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    validationResult: [],
    product: {
      title: null,
      imageUrl: null,
      description: null,
      price: null,
    },
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const imageUrl = req.file;
  const description = req.body.description;
  const price = req.body.price;
  const errors = validationResult(req);
  console.log(errors);
  console.log(imageUrl);
  

  if (!errors.isEmpty()) {
    return res.status(422).render("edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      validationResult: errors.array(),
      product: {
        title,
        imageUrl,
        description,
        price,
      },
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.session.user._id,
  });

  product
    .save()
    .then(() => {
      res.redirect("/admin/products");
    })
    // .catch((err) => res.status(500).redirect('/500'));
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = Boolean(req.query.edit);

  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        validationResult: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId.trim();
  const updatedTitle = req.body.title.trim();
  const updatedPrice = req.body.price.trim();
  const updatedDescription = req.body.description.trim();
  const updatedImageUrl = req.body.imageUrl.trim();
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      validationResult: errors.array(),
      product: {
        title: updatedTitle,
        imageUrl: updatedImageUrl,
        description: updatedDescription,
        price: updatedPrice,
        _id: prodId,
      },
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }

      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDescription;
      product.imageUrl = updatedImageUrl;

      return product.save().then(() => {
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    // .populate('userId')
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "admin/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;

  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then((deleteResult) => {
      return res.redirect("/admin/products");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};
