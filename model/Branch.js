const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branch_name: { type: String },
  branch_number: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
