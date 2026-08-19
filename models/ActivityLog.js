const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["NEW_ORDER", "NEW_USER_REGISTRATION", "ADMIN_ACTION", "SYSTEM"],
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
