const { ethers } = require('ethers');
const Vote = require('../models/Vote');
const Token = require('../models/Token');

// Record Vote from Blockchain
exports.recordVote = async (req, res) => {
  try {
    const { transactionHash, candidateId, candidateName, tokenHash, voterWallet } = req.body;

    // Check if vote already recorded
    const existingVote = await Vote.findOne({ transactionHash });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'Vote already recorded'
      });
    }

    // Verify transaction on blockchain
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!receipt) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not found on blockchain'
      });
    }

    // Get block details
    const block = await provider.getBlock(receipt.blockNumber);

    // Create vote record
    const vote = new Vote({
      transactionHash,
      blockNumber: receipt.blockNumber,
      blockTimestamp: new Date(block.timestamp * 1000),
      candidateId,
      candidateName,
      tokenHash,
      voterWallet,
      status: 'confirmed',
      network: process.env.NODE_ENV === 'production' ? 'polygon' : 'mumbai',
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : '0'
    });

    await vote.save();

    res.status(201).json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        transactionHash,
        candidateId,
        blockNumber: receipt.blockNumber,
        timestamp: vote.blockTimestamp
      }
    });

  } catch (error) {
    console.error('Record vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record vote',
      error: error.message
    });
  }
};

// Get Vote Results
exports.getResults = async (req, res) => {
  try {
    const results = await Vote.getResults();
    const totalVotes = await Vote.getTotalVotes();

    res.json({
      success: true,
      data: {
        totalVotes,
        results: results.map(r => ({
          candidateId: r._id,
          candidateName: r.candidateName,
          voteCount: r.voteCount,
          percentage: ((r.voteCount / totalVotes) * 100).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results',
      error: error.message
    });
  }
};

// Verify Vote by Transaction Hash
exports.verifyVote = async (req, res) => {
  try {
    const { transactionHash } = req.params;

    const vote = await Vote.verifyVote(transactionHash);

    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'Vote not found or not confirmed'
      });
    }

    res.json({
      success: true,
      message: 'Vote verified successfully',
      data: {
        transactionHash: vote.transactionHash,
        candidateId: vote.candidateId,
        candidateName: vote.candidateName,
        blockNumber: vote.blockNumber,
        timestamp: vote.blockTimestamp,
        status: vote.status
      }
    });
  } catch (error) {
    console.error('Verify vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify vote',
      error: error.message
    });
  }
};

// Get All Votes (Admin)
exports.getAllVotes = async (req, res) => {
  try {
    const { candidateId, page = 1, limit = 50 } = req.query;

    const filter = { status: 'confirmed' };
    if (candidateId) filter.candidateId = parseInt(candidateId);

    const votes = await Vote.find(filter)
      .select('transactionHash candidateId candidateName blockNumber blockTimestamp voterWallet')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ blockTimestamp: -1 });

    const count = await Vote.countDocuments(filter);

    res.json({
      success: true,
      data: votes,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch votes',
      error: error.message
    });
  }
};

// Sync Votes from Blockchain
exports.syncVotesFromBlockchain = async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    const VotingSystemABI = require('../../../artifacts/contracts/VotingSystem.sol/VotingSystem.json');
    
    const votingContract = new ethers.Contract(
      process.env.VOTING_CONTRACT_ADDRESS,
      VotingSystemABI.abi,
      provider
    );

    // Get all VoteCast events
    const filter = votingContract.filters.VoteCast();
    const events = await votingContract.queryFilter(filter);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      const txHash = event.transactionHash;
      
      // Check if already recorded
      const existingVote = await Vote.findOne({ transactionHash: txHash });
      if (existingVote) {
        skippedCount++;
        continue;
      }

      // Get transaction receipt and block
      const receipt = await provider.getTransactionReceipt(txHash);
      const block = await provider.getBlock(receipt.blockNumber);
      
      // Get candidate info
      const candidateId = Number(event.args.candidateId);
      const candidate = await votingContract.getCandidate(candidateId);

      // Create vote record
      const vote = new Vote({
        transactionHash: txHash,
        blockNumber: receipt.blockNumber,
        blockTimestamp: new Date(block.timestamp * 1000),
        candidateId,
        candidateName: candidate.name,
        tokenHash: event.args.tokenHash,
        voterWallet: receipt.from,
        status: 'confirmed',
        network: process.env.NODE_ENV === 'production' ? 'polygon' : 'mumbai',
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : '0'
      });

      await vote.save();
      syncedCount++;
    }

    res.json({
      success: true,
      message: 'Blockchain sync completed',
      data: {
        totalEvents: events.length,
        synced: syncedCount,
        skipped: skippedCount
      }
    });

  } catch (error) {
    console.error('Sync votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync votes from blockchain',
      error: error.message
    });
  }
};