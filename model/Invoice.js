const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  qty: {
    type: Number,
    required: true
  },
  unitcode: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  paid_amount: {
    type: Number,
    required: true
  },
  remaining_amount: {
    type: Number,
    required: true
  },
  payment_type: {
    type: String,
    enum: ['cash', 'transfer', 'pos', 'credit', 'other'], // customize as needed
    required: true
  },
  invoice_no: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

});

module.exports = mongoose.model('Invoice', invoiceSchema);
