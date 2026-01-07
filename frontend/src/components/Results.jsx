import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Trophy, RefreshCw, Loader } from 'lucide-react';
import { useCandidates } from '../hooks/useContract';
import { voteAPI } from '../services/api';
import { calculatePercentage } from '../utils/contractHelpers';

const Results = () => {
  const { candidates: blockchainCandidates, loading: loadingBlockchain, reload: reloadBlockchain } = useCandidates();
  const [backendResults, setBackendResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataSource, setDataSource] = useState('blockchain'); // 'blockchain' or 'backend'

  useEffect(() => {
    loadBackendResults();
  }, []);

  useEffect(() => {
    if (blockchainCandidates.length > 0) {
      const total = blockchainCandidates.reduce((sum, c) => sum + c.voteCount, 0);
      setTotalVotes(total);
    }
  }, [blockchainCandidates]);

  const loadBackendResults = async () => {
    setLoadingBackend(true);
    try {
      const response = await voteAPI.getResults();
      setBackendResults(response.data.data.results || []);
      setTotalVotes(response.data.data.totalVotes || 0);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading backend results:', error);
    } finally {
      setLoadingBackend(false);
    }
  };

  const handleRefresh = async () => {
    if (dataSource === 'blockchain') {
      await reloadBlockchain();
    } else {
      await loadBackendResults();
    }
    setLastUpdated(new Date());
  };

  const getCurrentResults = () => {
    if (dataSource === 'blockchain') {
      return blockchainCandidates;
    } else {
      return backendResults.map(r => ({
        id: r.candidateId,
        name: r.candidateName,
        party: '', // Backend doesn't store party
        voteCount: r.voteCount
      }));
    }
  };

  const results = getCurrentResults();
  const isLoading = dataSource === 'blockchain' ? loadingBlockchain : loadingBackend;

  // Sort candidates by vote count (descending)
  const sortedResults = [...results].sort((a, b) => b.voteCount - a.voteCount);
  const winner = sortedResults[0];

  // Calculate statistics
  const voterTurnoutPercentage = 100; // This would need total eligible voters
  const leadingCandidate = sortedResults[0];
  const runnerUp = sortedResults[1];
  const margin = leadingCandidate && runnerUp 
    ? leadingCandidate.voteCount - runnerUp.voteCount 
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Election Results</h2>
              <p className="text-sm text-gray-600">
                {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Data Source Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDataSource('blockchain')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  dataSource === 'blockchain'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Blockchain
              </button>
              <button
                onClick={() => setDataSource('backend')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  dataSource === 'backend'
                    ? 'bg-white text-purple-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Database
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Votes</p>
              <p className="text-3xl font-bold text-gray-800">{totalVotes}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Candidates</p>
              <p className="text-3xl font-bold text-gray-800">{results.length}</p>
            </div>
            <Trophy className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Leading By</p>
              <p className="text-3xl font-bold text-gray-800">{margin}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">votes</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Data Source</p>
              <p className="text-lg font-bold text-purple-600 capitalize">{dataSource}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      {winner && totalVotes > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <Trophy className="w-16 h-16 text-yellow-600" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                Current Leader: {winner.name}
              </h3>
              <p className="text-gray-600">
                Leading with {winner.voteCount} votes ({calculatePercentage(winner.voteCount, totalVotes)}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Detailed Results</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading results...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No votes cast yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedResults.map((candidate, index) => {
              const percentage = calculatePercentage(candidate.voteCount, totalVotes);
              const isWinner = index === 0 && totalVotes > 0;

              return (
                <div
                  key={candidate.id}
                  className={`p-6 transition hover:bg-gray-50 ${
                    isWinner ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                      isWinner 
                        ? 'bg-yellow-400 text-yellow-900' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Candidate Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-gray-800">
                          {candidate.name}
                        </h4>
                        {isWinner && (
                          <Trophy className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      {candidate.party && (
                        <p className="text-sm text-gray-600">{candidate.party}</p>
                      )}
                    </div>

                    {/* Vote Count */}
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-600">
                        {percentage}%
                      </p>
                      <p className="text-sm text-gray-600">
                        {candidate.voteCount} votes
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        isWinner 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                          : 'bg-gradient-to-r from-purple-400 to-purple-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Information Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About These Results</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>
                <strong>Blockchain:</strong> Live data directly from smart contract on Polygon
              </li>
              <li>
                <strong>Database:</strong> Aggregated data from backend server
              </li>
              <li>Results are updated in real-time as votes are cast</li>
              <li>All votes are cryptographically secured and immutable</li>
              <li>Each vote is recorded on the blockchain for transparency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;