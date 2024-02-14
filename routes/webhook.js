const express = require('express');
const bodyParser = require('body-parser');

const webhookController = require('../controllers/webhook');
const router = express.Router();

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  webhookController.postWebhook,
);

module.exports = router;
