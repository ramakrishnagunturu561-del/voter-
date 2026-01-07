const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { authenticateAdmin } = require('../middleware/auth');
const { voteRecordRules, handleValidationErrors } = require('../middleware/validation');

// Public Routes
router.get('/results', voteController.getResults);

router.get('/verify/:transactionHash', voteController.verifyVote);

// Protected Routes
router.post(
  '/record',
  voteRecordRules,
  handleValidationErrors,
  voteController.recordVote
);

// Admin Routes
router.get(
  '/',
  authenticateAdmin,
  voteController.getAllVotes
);

router.post(
  '/sync',
  authenticateAdmin,
  voteController.syncVotesFromBlockchain
);

module.exports = router;