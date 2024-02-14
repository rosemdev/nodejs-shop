const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Constants
const CREATED = 'CREATED';
const PAID = 'PAID';
const NOT_PAID = 'NOT_PAID';
const FAILED = 'FAILED';
const CANCELED = 'CANCELED';
const STATUSES = [CREATED, PAID, NOT_PAID, FAILED, CANCELED];

const orderSchema = new Schema({
  status: {
    type: String,
    required: true,
    enum: STATUSES,
    default: CREATED,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  user: {
    username: { type: String, required: false },
    email: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  total: { type: Number, required: true },
});

orderSchema.methods.changeOrderStatus = function (status) {
  if (!STATUSES.includes(status)) {
    throw new Error('The status is not allowed!');
  }

  this.status = status;
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
