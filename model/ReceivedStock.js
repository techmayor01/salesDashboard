const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const receivedStockSchema = new Schema({
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
  item_name: {
    type: String,
    required: true,
  },
  unitCode: String,
  item_qty: {
    type: Number,
    required: true,
  },
  item_rate: {
    type: Number,
    required: true,
  },
  paid_amount: {
    type: Number,
    required: true,
  },
  total_amount: {
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

module.exports = mongoose.model('ReceivedStock', receivedStockSchema);
