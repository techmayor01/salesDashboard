const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branch_name: { type: String, required: true },

  // User who created the branch (optional)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },

  // One or more users assigned to this branch
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  // Stock references
  stock: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  }],

  suppler_invoice: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SupplierInvoice"
  }],

  received_stock: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReceivedStock"
  }],

  customers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer"
  }],

  createdAt: { type: Date, default: Date.now }
});

const Branch = mongoose.model('Branch', branchSchema);
module.exports = Branch;
