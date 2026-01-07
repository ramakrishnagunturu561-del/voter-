const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { authenticateAdmin } = require('../middleware/auth');
const { tokenGenerationRules, handleValidationErrors } = require('../middleware/validation');

// Admin Routes - Token Generation
router.post(
  '/generate',
  authenticateAdmin,
  tokenGenerationRules,
  handleValidationErrors,
  tokenController.generateToken
);

router.get(
  '/',
  authenticateAdmin,
  tokenController.getAllTokens
);

router.get(
  '/voter/:voterId',
  authenticateAdmin,
  tokenController.getTokenByVoterId
);

router.get(
  '/verify/:tokenHash',
  tokenController.verifyToken
);

router.put(
  '/:tokenHash/mark-used',
  tokenController.markTokenUsed
);

module.exports = router;