const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branch_name: { type: String },
  branch_number: { type: String },
  stock: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  }],
  createdAt: { type: Date, default: Date.now }
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
