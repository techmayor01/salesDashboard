const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customer_name: { type: String },
  mobile: { type: String },
  email: { type: String },
  address: { type: String },

  
  transactions: [
    {
      product: { type: String, required: true },    // Item name or description
      qty: { type: Number, required: true },      // Quantity customer buys
      unit_code: { type: String },                     // Example: "pcs", "kg"
      rate: { type: Number, required: true },          // Rate per unit
      total: { type: Number, required: true },         // quantity * rate
      paid_amount: { type: Number },
      remaining_amount: { type: Number },
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
