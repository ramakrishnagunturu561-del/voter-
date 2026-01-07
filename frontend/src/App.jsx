import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AlertCircle, CheckCircle, Vote, Shield, Users, BarChart3 } from 'lucide-react';

// Import contract ABIs (you'll need to generate these after compiling)
import VotingSystemABI from './contracts/VotingSystem.json';
import TokenGeneratorABI from './contracts/TokenGenerator.json';

const VOTING_CONTRACT_ADDRESS = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS;
const TOKEN_GENERATOR_ADDRESS = process.env.REACT_APP_TOKEN_GENERATOR_ADDRESS;
const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || '80001'; // Mumbai testnet

function App() {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('voter');
  const [eligibilityToken, setEligibilityToken] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votingStatus, setVotingStatus] = useState('');
  const [adminVoterId, setAdminVoterId] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [results, setResults] = useState([]);
  const [votingContract, setVotingContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (chainId !== `0x${parseInt(NETWORK_ID).toString(16)}`) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${parseInt(NETWORK_ID).toString(16)}` }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${parseInt(NETWORK_ID).toString(16)}`,
                  chainName: 'Local Hardhat',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['http://localhost:8545'],
                  blockExplorerUrls: []
                }]
              });
            }
          }
        }
        
        setAccount(accounts[0]);
        setIsConnected(true);
        setVotingStatus('Wallet connected successfully!');
        
        await initializeContracts(accounts[0]);
      } catch (error) {
        setVotingStatus('Failed to connect wallet: ' + error.message);
      }
    } else {
      setVotingStatus('Please install MetaMask to use this application');
    }
  };

  // Initialize contract instances
  const initializeContracts = async (userAccount) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const voting = new ethers.Contract(
        VOTING_CONTRACT_ADDRESS,
        VotingSystemABI.abi,
        signer
      );

      const tokenGen = new ethers.Contract(
        TOKEN_GENERATOR_ADDRESS,
        TokenGeneratorABI.abi,
        signer
      );

      setVotingContract(voting);
      setTokenContract(tokenGen);

      // Check if user is admin
      const adminAddress = await voting.admin();
      setIsAdmin(adminAddress.toLowerCase() === userAccount.toLowerCase());

      // Load candidates
      await loadCandidates(voting);

      // Check if user has voted
      const voted = await voting.hasVoted(userAccount);
      setHasVoted(voted);

    } catch (error) {
      console.error('Error initializing contracts:', error);
      setVotingStatus('Error connecting to contracts: ' + error.message);
    }
  };

  // Load candidates from blockchain
  const loadCandidates = async (contract) => {
    try {
      const candidateList = await contract.getAllCandidates();
      const formattedCandidates = candidateList.map(c => ({
        id: Number(c.id),
        name: c.name,
        party: c.party,
        voteCount: Number(c.voteCount)
      }));
      setCandidates(formattedCandidates);
      setResults(formattedCandidates);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  // Generate eligibility token (Admin only)
  const generateToken = async () => {
    if (!adminVoterId) {
      setVotingStatus('Please enter Voter ID');
      return;
    }

    if (!isAdmin) {
      setVotingStatus('Only admin can generate tokens');
      return;
    }

    try {
      setVotingStatus('Generating token...');
      
      const randomSalt = Math.floor(Math.random() * 1000000);
      const tx = await tokenContract.generateToken(adminVoterId, randomSalt);
      await tx.wait();

      // Get the token hash from the event
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return tokenContract.interface.parseLog(log).name === 'TokenGenerated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = tokenContract.interface.parseLog(event);
        const tokenHash = parsedEvent.args.tokenHash;
        setGeneratedToken(tokenHash);
        setVotingStatus(`Token generated successfully for Voter ID: ${adminVoterId}`);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setVotingStatus('Error generating token: ' + error.message);
    }
  };

  // Submit vote
  const submitVote = async () => {
    if (!eligibilityToken) {
      setVotingStatus('Please enter your eligibility token');
      return;
    }
    
    if (!selectedCandidate) {
      setVotingStatus('Please select a candidate');
      return;
    }

    if (!isConnected) {
      setVotingStatus('Please connect your wallet first');
      return;
    }

    try {
      setVotingStatus('Submitting vote to blockchain...');
      
      const tx = await votingContract.vote(selectedCandidate, eligibilityToken);
      setVotingStatus('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      setHasVoted(true);
      setVotingStatus('Vote submitted successfully! Transaction confirmed on Polygon blockchain.');
      setEligibilityToken('');
      setSelectedCandidate('');
      
      // Reload candidates to update vote counts
      await loadCandidates(votingContract);
    } catch (error) {
      console.error('Error submitting vote:', error);
      let errorMsg = 'Failed to submit vote: ';
      
      if (error.message.includes('Token already used')) {
        errorMsg += 'This token has already been used.';
      } else if (error.message.includes('Address has already voted')) {
        errorMsg += 'This wallet address has already voted.';
      } else if (error.message.includes('Voting is not active')) {
        errorMsg += 'Voting is not currently active.';
      } else {
        errorMsg += error.message;
      }
      
      setVotingStatus(errorMsg);
    }
  };

  // Refresh results
  const refreshResults = async () => {
    if (votingContract) {
      await loadCandidates(votingContract);
      setVotingStatus('Results refreshed');
    }
  };

  const totalVotes = results.reduce((sum, c) => sum + c.voteCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Blockchain Voting System</h1>
                <p className="text-gray-600">Secure, Anonymous, Transparent - Powered by Polygon</p>
              </div>
            </div>
            
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Connect MetaMask
              </button>
            ) : (
              <div className="text-right">
                <div className="text-sm text-gray-600">Connected {isAdmin && '(Admin)'}</div>
                <div className="text-xs font-mono bg-gray-100 px-3 py-1 rounded">
                  {account.substring(0, 6)}...{account.substring(38)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('voter')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'voter'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <Vote className="w-5 h-5 inline mr-2" />
              Cast Vote
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 px-6 py-4 font-semibold transition ${
                  activeTab === 'admin'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <Users className="w-5 h-5 inline mr-2" />
                Admin Panel
              </button>
            )}
            <button
              onClick={() => { setActiveTab('results'); refreshResults(); }}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'results'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Live Results
            </button>
          </div>

          <div className="p-6">
            {/* Voter Tab */}
            {activeTab === 'voter' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    How it works
                  </h3>
                  <ol className="text-sm text-blue-800 space-y-1 ml-7">
                    <li>1. Verify your identity with voter ID at registration center</li>
                    <li>2. Receive your one-time cryptographic eligibility token</li>
                    <li>3. Connect your MetaMask wallet to Polygon network</li>
                    <li>4. Enter your token and cast your vote anonymously</li>
                  </ol>
                </div>

                {hasVoted ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-900 mb-2">
                      You have already voted!
                    </h3>
                    <p className="text-green-700">
                      Your vote has been recorded securely on the blockchain.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Eligibility Token
                      </label>
                      <input
                        type="text"
                        value={eligibilityToken}
                        onChange={(e) => setEligibilityToken(e.target.value)}
                        placeholder="Enter your one-time eligibility token (0x...)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Select Candidate
                      </label>
                      <div className="space-y-3">
                        {candidates.map(candidate => (
                          <div
                            key={candidate.id}
                            onClick={() => setSelectedCandidate(candidate.id.toString())}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                              selectedCandidate === candidate.id.toString()
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedCandidate === candidate.id.toString()
                                  ? 'border-purple-600'
                                  : 'border-gray-300'
                              }`}>
                                {selectedCandidate === candidate.id.toString() && (
                                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800">{candidate.name}</div>
                                <div className="text-sm text-gray-600">{candidate.party}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={submitVote}
                      disabled={!isConnected || !eligibilityToken || !selectedCandidate}
                      className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Submit Vote to Blockchain
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">
                    Admin Functions
                  </h3>
                  <p className="text-sm text-amber-800">
                    Generate eligibility tokens for verified voters. Tokens are cryptographically secure and can only be used once.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Voter ID / Unique ID
                  </label>
                  <input
                    type="text"
                    value={adminVoterId}
                    onChange={(e) => setAdminVoterId(e.target.value)}
                    placeholder="Enter voter's unique ID"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={generateToken}
                  className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  Generate Eligibility Token
                </button>

                {generatedToken && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Token Generated</h4>
                    <div className="bg-white p-3 rounded border border-green-300 font-mono text-xs break-all">
                      {generatedToken}
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      Provide this token to the voter. It can only be used once and is cryptographically linked to their voter ID.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Live Results from Polygon Blockchain
                    </h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Total Votes Cast: {totalVotes}
                    </p>
                  </div>
                  <button
                    onClick={refreshResults}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-4">
                  {results.map(candidate => {
                    const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={candidate.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-semibold text-gray-800">{candidate.name}</div>
                            <div className="text-sm text-gray-600">{candidate.party}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600">{percentage}%</div>
                            <div className="text-sm text-gray-600">{candidate.voteCount} votes</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {votingStatus && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 break-words">{votingStatus}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;