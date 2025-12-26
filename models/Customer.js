const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },

    // extra details (after signup)
    name: String,
    phone: String,
    address: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
