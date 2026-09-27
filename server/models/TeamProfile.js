const mongoose = require('mongoose');

const teamProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    shortName: {
      type: String,
      default: '',
    },
    primaryColor: {
      type: String,
      default: '#3b82f6',
    },
  },
  {
    timestamps: true,
  }
);

teamProfileSchema.pre('validate', function (next) {
  if (this.name) {
    this.nameNormalized = this.name.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('TeamProfile', teamProfileSchema);
