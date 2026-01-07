import React, { useState, useEffect } from 'react';
import { Vote, CheckCircle, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { useCandidates, useVotingStatus, useTransaction } from '../hooks/useContract';
import blockchainService from '../services/blockchain';
import { voteAPI, tokenAPI } from '../services/api';
import { 
  formatAddress, 
  getExplorerUrl, 
  isValidToken,
  parseContractError 
} from '../utils/contractHelpers';

const VoterInterface = ({ account, isConnected }) => {
  const [eligibilityToken, setEligibilityToken] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error, info
  
  const { candidates, loading: loadingCandidates, reload: reloadCandidates } = useCandidates();
  const { hasVoted, votingActive, refresh: refreshStatus } = useVotingStatus();
  const { status: txStatus, txHash, execute: executeVote, reset: resetTx } = useTransaction();

  useEffect(() => {
    if (isConnected && account) {
      refreshStatus();
    }
  }, [isConnected, account, refreshStatus]);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const handleTokenChange = (e) => {
    const value = e.target.value.trim();
    setEligibilityToken(value);
    
    // Clear previous messages
    if (message) {
      setMessage('');
    }
  };

  const validateInputs = () => {
    if (!isConnected) {
      showMessage('Please connect your MetaMask wallet first', 'error');
      return false;
    }

    if (!eligibilityToken) {
      showMessage('Please enter your eligibility token', 'error');
      return false;
    }

    if (!isValidToken(eligibilityToken)) {
      showMessage('Invalid token format. Token should be 64 hex characters (with or without 0x prefix)', 'error');
      return false;
    }

    if (!selectedCandidate) {
      showMessage('Please select a candidate', 'error');
      return false;
    }

    if (!votingActive) {
      showMessage('Voting is not currently active', 'error');
      return false;
    }

    return true;
  };

  const handleSubmitVote = async () => {
    if (!validateInputs()) {
      return;
    }

    resetTx();
    showMessage('Verifying token...', 'info');

    try {
      // Step 1: Verify token with backend
      const tokenResponse = await tokenAPI.verify(eligibilityToken);
      
      if (!tokenResponse.data.data.isValidOnChain) {
        showMessage('Invalid token. This token was not issued by the system.', 'error');
        return;
      }

      showMessage('Token verified. Preparing transaction...', 'info');

      // Step 2: Submit vote to blockchain
      const result = await executeVote(async () => {
        return blockchainService.vote(
          parseInt(selectedCandidate),
          eligibilityToken
        );
      });

      if (!result.success) {
        const errorMsg = parseContractError(result.error);
        showMessage(errorMsg, 'error');
        return;
      }

      showMessage('Vote submitted! Waiting for blockchain confirmation...', 'info');

      // Step 3: Record vote in backend
      const candidate = candidates.find(c => c.id === parseInt(selectedCandidate));
      
      await voteAPI.record({
        transactionHash: result.receipt.transactionHash,
        candidateId: parseInt(selectedCandidate),
        candidateName: candidate.name,
        tokenHash: eligibilityToken,
        voterWallet: account
      });

      // Step 4: Mark token as used in backend
      await tokenAPI.markUsed(eligibilityToken, {
        walletAddress: account,
        voteTransactionHash: result.receipt.transactionHash
      });

      showMessage('Vote confirmed! Thank you for voting.', 'success');
      
      // Clear form
      setEligibilityToken('');
      setSelectedCandidate('');
      
      // Refresh data
      await refreshStatus();
      await reloadCandidates();

    } catch (error) {
      console.error('Vote submission error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit vote';
      showMessage(errorMsg, 'error');
    }
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-yellow-900 mb-2">
            Wallet Not Connected
          </h3>
          <p className="text-yellow-700">
            Please connect your MetaMask wallet to cast your vote.
          </p>
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-green-900 mb-3">
            You Have Already Voted!
          </h3>
          <p className="text-green-700 mb-4">
            Your vote has been securely recorded on the Polygon blockchain.
          </p>
          <div className="bg-white rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">Voter Address:</p>
            <p className="font-mono text-xs break-all">{account}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Vote className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Cast Your Vote</h2>
            <p className="text-sm text-gray-600">Voting from: {formatAddress(account)}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            How to Vote
          </h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-7 list-decimal">
            <li>Enter your one-time eligibility token (received after verification)</li>
            <li>Select your preferred candidate</li>
            <li>Click "Submit Vote"</li>
            <li>Approve the transaction in MetaMask</li>
            <li>Wait for blockchain confirmation</li>
          </ol>
        </div>

        {/* Eligibility Token Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Eligibility Token *
          </label>
          <input
            type="text"
            value={eligibilityToken}
            onChange={handleTokenChange}
            placeholder="Enter your eligibility token (0x...)"
            disabled={txStatus === 'pending'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent font-mono text-sm disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            This token was provided to you after voter verification
          </p>
        </div>

        {/* Candidate Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Candidate *
          </label>
          
          {loadingCandidates ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 text-purple-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading candidates...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">No candidates available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  onClick={() => txStatus !== 'pending' && setSelectedCandidate(candidate.id.toString())}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                    txStatus === 'pending' ? 'opacity-50 cursor-not-allowed' :
                    selectedCandidate === candidate.id.toString()
                      ? 'border-purple-600 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedCandidate === candidate.id.toString()
                        ? 'border-purple-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedCandidate === candidate.id.toString() && (
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-lg">{candidate.name}</div>
                      <div className="text-sm text-gray-600">{candidate.party}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Current Votes</div>
                      <div className="text-xl font-bold text-purple-600">{candidate.voteCount}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitVote}
          disabled={
            !isConnected || 
            !eligibilityToken || 
            !selectedCandidate || 
            txStatus === 'pending' ||
            !votingActive
          }
          className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {txStatus === 'pending' ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Submitting Vote...
            </>
          ) : (
            <>
              <Vote className="w-5 h-5" />
              Submit Vote to Blockchain
            </>
          )}
        </button>

        {/* Transaction Hash Link */}
        {txHash && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 font-medium">Transaction Hash:</span>
              <a
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs font-mono text-blue-700 mt-1 break-all">{txHash}</p>
          </div>
        )}

        {/* Status Messages */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border flex items-start gap-3 ${getMessageStyle()}`}>
            {getMessageIcon()}
            <p className="flex-1">{message}</p>
          </div>
        )}

        {/* Voting Status */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Voting Status:</span>
            <span className={`font-semibold ${votingActive ? 'text-green-600' : 'text-red-600'}`}>
              {votingActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterInterface;