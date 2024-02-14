//API
const fulFillOrder = require('../util/fulFillOrder');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//Constants
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET;

exports.postWebhook = (req, res, next) => {
  console.log('postWebhook');

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
    console.log(err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(event.type);

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
    stripe.checkout.sessions
      .retrieve(event.data.object.id, {
        expand: ['line_items'],
      })
      .then(sessionWithLineItems => {
        // Fulfill the purchase...
        return fulFillOrder(sessionWithLineItems);
      })
      .catch(error => {
        next(new Error(error));
      });
  }
  res.status(200).end();
};
