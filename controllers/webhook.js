//Models
const User = require('../models/user');

//API
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//Constants
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET;

exports.postWebhook = (req, res, next) => {
  const payload = req.body;
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      STRIPE_ENDPOINT_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    User.findById(session.client_reference_id)
      .then(user => {
        if (!user) {
          throw new Error('The user is unknown!');
        }

        return user.addOrder();
      })
      .then(order => {
        if (order && session.payment_status === 'paid') {
          return order.changeOrderStatus('PAID');
        }
      })
      .catch(err => next(new Error(err)));
  }
  res.status(200).end();
};
