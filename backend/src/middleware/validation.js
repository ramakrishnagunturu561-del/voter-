
const { body, validationResult } = require('express-validator');

// Validation Rules
const voterRegistrationRules = [
  body('voterId').notEmpty().withMessage('Voter ID is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required')
];

const tokenGenerationRules = [
  body('voterId').notEmpty().withMessage('Voter ID is required')
];

const voteRecordRules = [
  body('transactionHash').notEmpty().withMessage('Transaction hash is required'),
  body('candidateId').isInt().withMessage('Valid candidate ID is required'),
  body('tokenHash').notEmpty().withMessage('Token hash is required')
];

// Validation Error Handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  voterRegistrationRules,
  tokenGenerationRules,
  voteRecordRules,
  handleValidationErrors
};