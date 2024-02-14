const User = require('../models/user');

module.exports = stripeOrderSession => {
  if (!stripeOrderSession) {
    throw new Error('No Stripe session');
  }
  const userId = stripeOrderSession.client_reference_id;

  User.findById(userId)
    .then(user => {
      if (!user) {
        throw new Error('The uer is unknown!');
      }

      user
        .addOrder()
        .then(order => {
          if (!order) {
            throw new Error('No order found!');
          }

          if (stripeOrderSession.payment_status === 'paid') {
            return order.changeOrderStatus('PAID');
          }
        })
        .catch(err => console.log(err));
    })
    .catch(err => {
      console.log(err);
    });
};
