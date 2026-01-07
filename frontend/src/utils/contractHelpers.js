import { ethers } from 'ethers';

/**
 * Contract Helper Functions
 * Utility functions for interacting with smart contracts
 */

// Format token hash for contract call
export const formatTokenHash = (tokenString) => {
  // Ensure token starts with 0x
  if (!tokenString.startsWith('0x')) {
    return '0x' + tokenString;
  }
  return tokenString;
};

// Parse candidate data from contract
export const parseCandidate = (candidateData) => {
  return {
    id: Number(candidateData.id),
    name: candidateData.name,
    party: candidateData.party,
    voteCount: Number(candidateData.voteCount)
  };
};

// Parse multiple candidates
export const parseCandidates = (candidatesArray) => {
  return candidatesArray.map(parseCandidate);
};

// Format BigNumber to readable number
export const formatBigNumber = (bigNumber) => {
  return Number(bigNumber.toString());
};

// Format address for display
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

// Format transaction hash for display
export const formatTxHash = (txHash) => {
  if (!txHash) return '';
  return `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`;
};

// Get explorer URL for transaction
export const getExplorerUrl = (txHash, networkId = '80001') => {
  const explorers = {
    '80001': 'https://mumbai.polygonscan.com/tx/',
    '137': 'https://polygonscan.com/tx/',
    '31337': 'http://localhost:8545/' // Local
  };
  
  return `${explorers[networkId] || explorers['80001']}${txHash}`;
};

// Get explorer URL for address
export const getAddressExplorerUrl = (address, networkId = '80001') => {
  const explorers = {
    '80001': 'https://mumbai.polygonscan.com/address/',
    '137': 'https://polygonscan.com/address/'
  };
  
  return `${explorers[networkId] || explorers['80001']}${address}`;
};

// Convert timestamp to readable date
export const formatTimestamp = (timestamp) => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
};

// Calculate voting percentage
export const calculatePercentage = (votes, totalVotes) => {
  if (totalVotes === 0) return 0;
  return ((votes / totalVotes) * 100).toFixed(2);
};

// Wait for transaction confirmation
export const waitForTransaction = async (txHash, provider, confirmations = 1) => {
  try {
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return {
      success: receipt.status === 1,
      receipt
    };
  } catch (error) {
    console.error('Transaction wait error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Estimate gas for transaction
export const estimateGas = async (contract, method, args = []) => {
  try {
    const gasEstimate = await contract[method].estimateGas(...args);
    return gasEstimate;
  } catch (error) {
    console.error('Gas estimation error:', error);
    return null;
  }
};

// Get gas price
export const getGasPrice = async (provider) => {
  try {
    const feeData = await provider.getFeeData();
    return feeData.gasPrice;
  } catch (error) {
    console.error('Gas price error:', error);
    return null;
  }
};

// Format MATIC amount
export const formatMATIC = (wei) => {
  return ethers.formatEther(wei);
};

// Parse MATIC to wei
export const parseMATIC = (matic) => {
  return ethers.parseEther(matic.toString());
};

// Check if valid Ethereum address
export const isValidAddress = (address) => {
  return ethers.isAddress(address);
};

// Generate random salt for token generation
export const generateRandomSalt = () => {
  return Math.floor(Math.random() * 1000000000);
};

// Hash voter ID (for privacy)
export const hashVoterId = (voterId) => {
  return ethers.keccak256(ethers.toUtf8Bytes(voterId));
};

// Validate token format
export const isValidToken = (token) => {
  if (!token) return false;
  
  // Remove 0x prefix if exists
  const cleanToken = token.startsWith('0x') ? token.slice(2) : token;
  
  // Check if 64 hex characters (32 bytes)
  return /^[0-9a-fA-F]{64}$/.test(cleanToken);
};

// Parse error message from contract revert
export const parseContractError = (error) => {
  const errorMessages = {
    'Token already used': 'This eligibility token has already been used to cast a vote.',
    'Address has already voted': 'This wallet address has already voted.',
    'Voting is not active': 'Voting is not currently active.',
    'Invalid candidate': 'Invalid candidate selection.',
    'Only admin can call': 'Only admin can perform this action.',
    'Token already generated': 'A token has already been generated for this voter ID.',
    'user rejected': 'Transaction was rejected by user.',
    'insufficient funds': 'Insufficient MATIC balance for transaction.'
  };
  
  const errorString = error.message || error.toString();
  
  for (const [key, value] of Object.entries(errorMessages)) {
    if (errorString.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'An error occurred. Please try again.';
};

// Check network
export const checkNetwork = async (provider, expectedChainId) => {
  try {
    const network = await provider.getNetwork();
    return Number(network.chainId) === Number(expectedChainId);
  } catch (error) {
    console.error('Network check error:', error);
    return false;
  }
};

// Get network name
export const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai Testnet',
    31337: 'Localhost'
  };
  
  return networks[chainId] || `Unknown Network (${chainId})`;
};

// Validate voting time
export const isVotingPeriodActive = (startTime, endTime) => {
  const now = Math.floor(Date.now() / 1000);
  return now >= startTime && now <= endTime;
};

// Calculate remaining time
export const getRemainingTime = (endTime) => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTime - now;
  
  if (remaining <= 0) return 'Voting ended';
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

export default {
  formatTokenHash,
  parseCandidate,
  parseCandidates,
  formatBigNumber,
  formatAddress,
  formatTxHash,
  getExplorerUrl,
  getAddressExplorerUrl,
  formatTimestamp,
  calculatePercentage,
  waitForTransaction,
  estimateGas,
  getGasPrice,
  formatMATIC,
  parseMATIC,
  isValidAddress,
  generateRandomSalt,
  hashVoterId,
  isValidToken,
  parseContractError,
  checkNetwork,
  getNetworkName,
  isVotingPeriodActive,
  getRemainingTime
};