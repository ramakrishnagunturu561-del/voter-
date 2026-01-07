const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  // Unique Voter Identification
  voterId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  
  dateOfBirth: {
    type: Date,
    required: true
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  phone: {
    type: String,
    required: true
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  
  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationDate: {
    type: Date
  },
  
  // Documents
  documents: {
    voterCardNumber: String,
    aadharNumber: String,
    photoUrl: String
  },
  
  // Voting Status
  hasReceivedToken: {
    type: Boolean,
    default: false
  },
  
  tokenIssuedDate: {
    type: Date
  },
  
  hasVoted: {
    type: Boolean,
    default: false
  },
  
  votedDate: {
    type: Date
  },
  
  // Wallet Address (optional - for tracking without identity link)
  walletAddress: {
    type: String,
    sparse: true // Allows multiple null values
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'active'],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
voterSchema.index({ voterId: 1 });
voterSchema.index({ email: 1 });
voterSchema.index({ status: 1 });
voterSchema.index({ hasVoted: 1 });

// Virtual for age
voterSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

module.exports = mongoose.model('Voter', voterSchema);