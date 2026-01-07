import { ethers } from 'ethers';
import VotingSystemABI from '../contracts/VotingSystem.json';
import TokenGeneratorABI from '../contracts/TokenGenerator.json';

const VOTING_CONTRACT_ADDRESS = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS;
const TOKEN_GENERATOR_ADDRESS = process.env.REACT_APP_TOKEN_GENERATOR_ADDRESS;
const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || '80001';
const RPC_URL = process.env.REACT_APP_RPC_URL;

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.votingContract = null;
    this.tokenContract = null;
    this.account = null;
  }

  // Connect to MetaMask
  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      // Check network
      await this.checkAndSwitchNetwork();

      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];

      // Initialize contracts
      await this.initializeContracts();

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.account = accounts[0];
          window.location.reload();
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return this.account;
    } catch (error) {
      console.error('Connect wallet error:', error);
      throw error;
    }
  }

  // Check and switch to correct network
  async checkAndSwitchNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const targetChainId = `0x${parseInt(NETWORK_ID).toString(16)}`;

    if (chainId !== targetChainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      } catch (switchError) {
        // Network not added, add it
        if (switchError.code === 4902) {
          await this.addNetwork();
        } else {
          throw switchError;
        }
      }
    }
  }

  // Add network to MetaMask
  async addNetwork() {
    const networkConfig = {
      chainId: `0x${parseInt(NETWORK_ID).toString(16)}`,
      chainName: process.env.REACT_APP_NETWORK_NAME || 'Polygon Mumbai Testnet',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrls: [RPC_URL],
      blockExplorerUrls: [process.env.REACT_APP_EXPLORER_URL || 'https://mumbai.polygonscan.com/']
    };

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig]
    });
  }

  // Initialize contract instances
  async initializeContracts() {
    this.votingContract = new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      VotingSystemABI.abi,
      this.signer
    );

    this.tokenContract = new ethers.Contract(
      TOKEN_GENERATOR_ADDRESS,
      TokenGeneratorABI.abi,
      this.signer
    );
  }

  // Get connected account
  getAccount() {
    return this.account;
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.votingContract = null;
    this.tokenContract = null;
    this.account = null;
  }

  // Voting Contract Methods
  async getCandidates() {
    if (!this.votingContract) throw new Error('Contract not initialized');
    
    const candidates = await this.votingContract.getAllCandidates();
    return candidates.map(c => ({
      id: Number(c.id),
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount)
    }));
  }

  async hasVoted(address) {
    if (!this.votingContract) throw new Error('Contract not initialized');
    return await this.votingContract.hasVoted(address);
  }

  async vote(candidateId, tokenHash) {
    if (!this.votingContract) throw new Error('Contract not initialized');
    
    const tx = await this.votingContract.vote(candidateId, tokenHash);
    const receipt = await tx.wait();
    
    return {
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }

  async getVotingStatus() {
    if (!this.votingContract) throw new Error('Contract not initialized');
    return await this.votingContract.votingActive();
  }

  async getTotalVotes() {
    if (!this.votingContract) throw new Error('Contract not initialized');
    return Number(await this.votingContract.totalVotes());
  }

  // Token Contract Methods
  async verifyToken(tokenHash) {
    if (!this.tokenContract) throw new Error('Contract not initialized');
    return await this.tokenContract.verifyToken(tokenHash);
  }

  async isTokenUsed(tokenHash) {
    if (!this.votingContract) throw new Error('Contract not initialized');
    return await this.votingContract.isTokenUsed(tokenHash);
  }

  // Admin Methods
  async isAdmin(address) {
    if (!this.votingContract) throw new Error('Contract not initialized');
    const adminAddress = await this.votingContract.admin();
    return adminAddress.toLowerCase() === address.toLowerCase();
  }

  // Utility Methods
  async getBalance(address) {
    if (!this.provider) throw new Error('Provider not initialized');
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getTransactionReceipt(txHash) {
    if (!this.provider) throw new Error('Provider not initialized');
    return await this.provider.getTransactionReceipt(txHash);
  }

  getExplorerLink(txHash) {
    return `${process.env.REACT_APP_EXPLORER_URL}/tx/${txHash}`;
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;