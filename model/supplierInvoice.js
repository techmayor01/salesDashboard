const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemSchema = new Schema({
  item_name: {
    type: String,
    required: true,
  },
  item_qty: {
    type: Number,
    required: true,
  },
  item_rate: {
    type: Number,
    required: true,
  }
}, { _id: false });

const supplierInvoiceSchema = new Schema({
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  branch: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  payment_date: {
    type: Date,
    required: true,
  },
  receipt_ref: {
    type: String,
    required: true,
  },
  invoice_number: {
    type: String,
    required: true,
  },
  items: [itemSchema],
  grand_total: {
    type: Number,
    required: true,
  },
  paid_amount: {
    type: Number,
    required: true,
  },
  due_amount: {
    type: Number,
    required: true,
  },
  payment_status: {
    type: String,
    enum: ['paid_half', 'paid_full'],
    default: 'paid_half',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SupplierInvoice', supplierInvoiceSchema);
