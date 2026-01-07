const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  // Blockchain Transaction Details
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  
  blockNumber: {
    type: Number,
    required: true
  },
  
  blockTimestamp: {
    type: Date,
    required: true
  },
  
  // Vote Details (NO voter identification - anonymous)
  candidateId: {
    type: Number,
    required: true
  },
  
  candidateName: {
    type: String,
    required: true
  },
  
  // Token Used (hash only - no link to voter)
  tokenHash: {
    type: String,
    required: true
  },
  
  // Wallet that cast vote (public info on blockchain)
  voterWallet: {
    type: String,
    required: true
  },
  
  // Vote Status
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'failed'],
    default: 'confirmed'
  },
  
  // Blockchain Network
  network: {
    type: String,
    enum: ['mumbai', 'polygon', 'localhost'],
    default: 'mumbai'
  },
  
  // Gas Details
  gasUsed: {
    type: String
  },
  
  gasPrice: {
    type: String
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: true
  },
  
  // Analytics (non-identifying)
  metadata: {
    timestamp: Date,
    location: String, // General - city/state level only
    deviceType: String
  }
}, {
  timestamps: true
});

// Indexes
voteSchema.index({ transactionHash: 1 });
voteSchema.index({ candidateId: 1 });
voteSchema.index({ blockTimestamp: 1 });
voteSchema.index({ tokenHash: 1 });

// Static method to get vote counts
voteSchema.statics.getResults = async function() {
  return this.aggregate([
    { $match: { status: 'confirmed' } },
    { 
      $group: { 
        _id: '$candidateId',
        candidateName: { $first: '$candidateName' },
        voteCount: { $sum: 1 }
      }
    },
    { $sort: { voteCount: -1 } }
  ]);
};

// Static method to get total votes
voteSchema.statics.getTotalVotes = function() {
  return this.countDocuments({ status: 'confirmed' });
};

// Static method to verify vote exists
voteSchema.statics.verifyVote = function(transactionHash) {
  return this.findOne({ transactionHash, status: 'confirmed' });
};

module.exports = mongoose.model('Vote', voteSchema);