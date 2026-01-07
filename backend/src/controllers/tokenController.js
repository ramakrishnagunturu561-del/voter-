const { ethers } = require('ethers');
const Voter = require('../models/Voter');
const Token = require('../models/Token');

// Generate Token for Verified Voter
exports.generateToken = async (req, res) => {
  try {
    const { voterId } = req.body;

    // Find voter
    const voter = await Voter.findOne({ voterId });

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    // Check if voter is verified
    if (!voter.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Voter is not verified yet'
      });
    }

    // Check if token already issued
    if (voter.hasReceivedToken) {
      const existingToken = await Token.findOne({ 
        voterId, 
        status: 'active' 
      });
      
      if (existingToken) {
        return res.status(400).json({
          success: false,
          message: 'Token already issued for this voter',
          data: {
            tokenHash: existingToken.tokenHash,
            generatedAt: existingToken.generatedAt
          }
        });
      }
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    // Load TokenGenerator contract
    const TokenGeneratorABI = require('../../../artifacts/contracts/TokenGenerator.sol/TokenGenerator.json');
    const tokenGeneratorContract = new ethers.Contract(
      process.env.TOKEN_GENERATOR_ADDRESS,
      TokenGeneratorABI.abi,
      wallet
    );

    // Generate random salt
    const salt = Math.floor(Math.random() * 1000000000);

    // Call smart contract to generate token
    console.log(`Generating token for voter: ${voterId}`);
    const tx = await tokenGeneratorContract.generateToken(voterId, salt);
    console.log('Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Extract token hash from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = tokenGeneratorContract.interface.parseLog(log);
        return parsed.name === 'TokenGenerated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('TokenGenerated event not found in transaction logs');
    }

    const parsedEvent = tokenGeneratorContract.interface.parseLog(event);
    const tokenHash = parsedEvent.args.tokenHash;

    // Save token to database
    const token = new Token({
      tokenHash,
      voterId,
      generatedBy: wallet.address,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      salt: salt.toString(),
      status: 'active'
    });

    await token.save();

    // Update voter record
    voter.hasReceivedToken = true;
    voter.tokenIssuedDate = new Date();
    await voter.save();

    res.status(201).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        tokenHash,
        voterId,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        generatedAt: token.generatedAt
      }
    });

  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate token',
      error: error.message
    });
  }
};

// Get Token by Voter ID
exports.getTokenByVoterId = async (req, res) => {
  try {
    const { voterId } = req.params;

    const token = await Token.findOne({ voterId })
      .sort({ generatedAt: -1 });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'No token found for this voter'
      });
    }

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch token',
      error: error.message
    });
  }
};

// Verify Token Status
exports.verifyToken = async (req, res) => {
  try {
    const { tokenHash } = req.params;

    const token = await Token.findOne({ tokenHash });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    // Check blockchain status
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    const TokenGeneratorABI = require('../../../artifacts/contracts/TokenGenerator.sol/TokenGenerator.json');
    const tokenGeneratorContract = new ethers.Contract(
      process.env.TOKEN_GENERATOR_ADDRESS,
      TokenGeneratorABI.abi,
      provider
    );

    const isValid = await tokenGeneratorContract.verifyToken(tokenHash);

    res.json({
      success: true,
      data: {
        tokenHash,
        status: token.status,
        isValidOnChain: isValid,
        generatedAt: token.generatedAt,
        usedAt: token.usedAt
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token',
      error: error.message
    });
  }
};

// Mark Token as Used
exports.markTokenUsed = async (req, res) => {
  try {
    const { tokenHash } = req.params;
    const { walletAddress, voteTransactionHash } = req.body;

    const token = await Token.findOne({ tokenHash });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    if (token.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Token already used'
      });
    }

    await token.markAsUsed(walletAddress, voteTransactionHash);

    // Update voter status
    await Voter.findOneAndUpdate(
      { voterId: token.voterId },
      { 
        hasVoted: true, 
        votedDate: new Date(),
        walletAddress 
      }
    );

    res.json({
      success: true,
      message: 'Token marked as used',
      data: {
        tokenHash,
        usedAt: token.usedAt
      }
    });
  } catch (error) {
    console.error('Mark token used error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark token as used',
      error: error.message
    });
  }
};

// Get All Tokens (Admin)
exports.getAllTokens = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const tokens = await Token.find(filter)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ generatedAt: -1 });

    const count = await Token.countDocuments(filter);

    res.json({
      success: true,
      data: tokens,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tokens',
      error: error.message
    });
  }
};