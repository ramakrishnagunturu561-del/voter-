const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { authenticateAdmin } = require('../middleware/auth');
const { voterRegistrationRules, handleValidationErrors } = require('../middleware/validation');

// Public Routes
router.post(
  '/register',
  voterRegistrationRules,
  handleValidationErrors,
  voterController.registerVoter
);

// Admin Routes
router.get(
  '/',
  authenticateAdmin,
  voterController.getAllVoters
);

router.get(
  '/stats',
  authenticateAdmin,
  voterController.getVoterStats
);

router.get(
  '/:voterId',
  authenticateAdmin,
  voterController.getVoterById
);

router.put(
  '/:voterId/verify',
  authenticateAdmin,
  voterController.verifyVoter
);

router.put(
  '/:voterId',
  authenticateAdmin,
  voterController.updateVoter
);

module.exports = router;