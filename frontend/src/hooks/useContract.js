import { useState, useEffect, useCallback } from 'react';
import blockchainService from '../services/blockchain';
import { parseContractError } from '../utils/contractHelpers';

/**
 * Custom React Hook for Contract Interactions
 */

// Hook for voting contract
export const useVotingContract = () => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (blockchainService.votingContract) {
      setContract(blockchainService.votingContract);
    }
  }, [blockchainService.votingContract]);

  const executeContractMethod = useCallback(async (method, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await method(...args);
      setLoading(false);
      return { success: true, data: result };
    } catch (err) {
      const errorMsg = parseContractError(err);
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  return { contract, loading, error, executeContractMethod };
};

// Hook for candidates
export const useCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await blockchainService.getCandidates();
      setCandidates(data);
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      const errorMsg = parseContractError(err);
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  useEffect(() => {
    if (blockchainService.votingContract) {
      loadCandidates();
    }
  }, [blockchainService.votingContract, loadCandidates]);

  return { candidates, loading, error, reload: loadCandidates };
};

// Hook for voting status
export const useVotingStatus = () => {
  const [votingActive, setVotingActive] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!blockchainService.account || !blockchainService.votingContract) {
      return;
    }

    setLoading(true);
    
    try {
      const [active, voted, total] = await Promise.all([
        blockchainService.getVotingStatus(),
        blockchainService.hasVoted(blockchainService.account),
        blockchainService.getTotalVotes()
      ]);

      setVotingActive(active);
      setHasVoted(voted);
      setTotalVotes(total);
    } catch (err) {
      console.error('Status check error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { votingActive, hasVoted, totalVotes, loading, refresh: checkStatus };
};

// Hook for wallet connection
export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connectedAccount = await blockchainService.connectWallet();
      setAccount(connectedAccount);
      setIsConnected(true);

      // Check if admin
      const adminStatus = await blockchainService.isAdmin(connectedAccount);
      setIsAdmin(adminStatus);

      // Get balance
      const bal = await blockchainService.getBalance(connectedAccount);
      setBalance(bal);

      setLoading(false);
      return { success: true, account: connectedAccount };
    } catch (err) {
      const errorMsg = err.message || 'Failed to connect wallet';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  const disconnect = useCallback(() => {
    blockchainService.disconnect();
    setAccount(null);
    setIsConnected(false);
    setIsAdmin(false);
    setBalance('0');
  }, []);

  return {
    account,
    isConnected,
    isAdmin,
    balance,
    loading,
    error,
    connect,
    disconnect
  };
};

// Hook for token verification
export const useTokenVerification = () => {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const verifyToken = useCallback(async (tokenHash) => {
    setVerifying(true);
    setResult(null);
    
    try {
      const isValid = await blockchainService.verifyToken(tokenHash);
      const isUsed = await blockchainService.isTokenUsed(tokenHash);
      
      const verificationResult = {
        isValid,
        isUsed,
        canUse: isValid && !isUsed
      };
      
      setResult(verificationResult);
      setVerifying(false);
      return verificationResult;
    } catch (err) {
      console.error('Token verification error:', err);
      setVerifying(false);
      return null;
    }
  }, []);

  return { verifying, result, verifyToken };
};

// Hook for listening to contract events
export const useContractEvents = (eventName) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!blockchainService.votingContract) return;

    const contract = blockchainService.votingContract;
    
    const handleEvent = (...args) => {
      const event = args[args.length - 1]; // Last argument is the event object
      setEvents(prev => [event, ...prev]);
    };

    contract.on(eventName, handleEvent);

    return () => {
      contract.off(eventName, handleEvent);
    };
  }, [eventName]);

  return events;
};

// Hook for transaction status
export const useTransaction = () => {
  const [status, setStatus] = useState('idle'); // idle, pending, success, error
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (txFunction) => {
    setStatus('pending');
    setError(null);
    setTxHash(null);
    
    try {
      const tx = await txFunction();
      setTxHash(tx.hash);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setStatus('success');
        return { success: true, receipt };
      } else {
        setStatus('error');
        setError('Transaction failed');
        return { success: false, error: 'Transaction failed' };
      }
    } catch (err) {
      const errorMsg = parseContractError(err);
      setStatus('error');
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return { status, txHash, error, execute, reset };
};

export default {
  useVotingContract,
  useCandidates,
  useVotingStatus,
  useWallet,
  useTokenVerification,
  useContractEvents,
  useTransaction
}