const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customer_name: { type: String },
  mobile: { type: String },
  email: { type: String },
  address: {
    type: String
  },
  total_amount: {
    type: Number
  },
  paid_amount: {
    type: Number
  },
  remaining_amount: {
    type: Number
  },
  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
