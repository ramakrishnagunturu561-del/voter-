const Voter = require('../models/Voter');

// Register New Voter
exports.registerVoter = async (req, res) => {
  try {
    const { voterId, fullName, email, phone, dateOfBirth, address, documents } = req.body;

    // Check if voter already exists
    const existingVoter = await Voter.findOne({ 
      $or: [{ voterId }, { email }] 
    });

    if (existingVoter) {
      return res.status(400).json({
        success: false,
        message: 'Voter with this ID or email already exists'
      });
    }

    // Create new voter
    const voter = new Voter({
      voterId,
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      documents,
      status: 'pending'
    });

    await voter.save();

    res.status(201).json({
      success: true,
      message: 'Voter registered successfully. Awaiting verification.',
      data: {
        voterId: voter.voterId,
        fullName: voter.fullName,
        status: voter.status
      }
    });
  } catch (error) {
    console.error('Register voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register voter',
      error: error.message
    });
  }
};

// Get All Voters (Admin)
exports.getAllVoters = async (req, res) => {
  try {
    const { status, hasVoted, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (hasVoted !== undefined) filter.hasVoted = hasVoted === 'true';

    const voters = await Voter.find(filter)
      .select('-__v')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Voter.countDocuments(filter);

    res.json({
      success: true,
      data: voters,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all voters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voters',
      error: error.message
    });
  }
};

// Get Voter by ID
exports.getVoterById = async (req, res) => {
  try {
    const { voterId } = req.params;

    const voter = await Voter.findOne({ voterId });

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    res.json({
      success: true,
      data: voter
    });
  } catch (error) {
    console.error('Get voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voter',
      error: error.message
    });
  }
};

// Verify Voter (Admin)
exports.verifyVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    const { verified, adminNotes } = req.body;

    const voter = await Voter.findOne({ voterId });

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    voter.isVerified = verified;
    voter.status = verified ? 'verified' : 'rejected';
    voter.verificationDate = new Date();
    if (adminNotes) voter.adminNotes = adminNotes;

    await voter.save();

    res.json({
      success: true,
      message: `Voter ${verified ? 'verified' : 'rejected'} successfully`,
      data: {
        voterId: voter.voterId,
        status: voter.status
      }
    });
  } catch (error) {
    console.error('Verify voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify voter',
      error: error.message
    });
  }
};

// Update Voter
exports.updateVoter = async (req, res) => {
  try {
    const { voterId } = req.params;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.voterId;
    delete updates.hasVoted;
    delete updates.hasReceivedToken;

    const voter = await Voter.findOneAndUpdate(
      { voterId },
      updates,
      { new: true, runValidators: true }
    );

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    res.json({
      success: true,
      message: 'Voter updated successfully',
      data: voter
    });
  } catch (error) {
    console.error('Update voter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voter',
      error: error.message
    });
  }
};

// Get Voter Statistics
exports.getVoterStats = async (req, res) => {
  try {
    const totalVoters = await Voter.countDocuments();
    const verifiedVoters = await Voter.countDocuments({ isVerified: true });
    const votedCount = await Voter.countDocuments({ hasVoted: true });
    const pendingVerification = await Voter.countDocuments({ status: 'pending' });
    const tokensIssued = await Voter.countDocuments({ hasReceivedToken: true });

    res.json({
      success: true,
      data: {
        totalVoters,
        verifiedVoters,
        votedCount,
        pendingVerification,
        tokensIssued,
        votingPercentage: verifiedVoters > 0 ? ((votedCount / verifiedVoters) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get voter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};