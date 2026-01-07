const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  // Token Hash (from blockchain)
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  
  // Linked Voter (reference)
  voterId: {
    type: String,
    required: true,
    ref: 'Voter'
  },
  
  // Generation Details
  generatedBy: {
    type: String, // Admin wallet address
    required: true
  },
  
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Blockchain Transaction
  transactionHash: {
    type: String,
    required: true
  },
  
  blockNumber: {
    type: Number
  },
  
  // Token Status
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'revoked'],
    default: 'active'
  },
  
  // Usage Details
  usedAt: {
    type: Date
  },
  
  usedByWallet: {
    type: String
  },
  
  voteTransactionHash: {
    type: String
  },
  
  // Expiry (optional - for time-limited voting)
  expiresAt: {
    type: Date
  },
  
  // Security
  salt: {
    type: String,
    required: true
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  }
}, {
  timestamps: true
});

// Indexes
tokenSchema.index({ tokenHash: 1 });
tokenSchema.index({ voterId: 1 });
tokenSchema.index({ status: 1 });
tokenSchema.index({ generatedAt: 1 });

// Method to mark token as used
tokenSchema.methods.markAsUsed = function(walletAddress, txHash) {
  this.status = 'used';
  this.usedAt = new Date();
  this.usedByWallet = walletAddress;
  this.voteTransactionHash = txHash;
  return this.save();
};

// Static method to find available token for voter
tokenSchema.statics.findAvailableToken = function(voterId) {
  return this.findOne({ 
    voterId, 
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

module.exports = mongoose.model('Token', tokenSchema);