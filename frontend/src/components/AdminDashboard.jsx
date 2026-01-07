import React, { useState, useEffect } from 'react';
import { Users, Key, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { voterAPI, tokenAPI } from '../services/api';

const AdminDashboard = () => {
  const [voters, setVoters] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);

  useEffect(() => {
    loadVoters();
    loadStats();
  }, [filterStatus]);

  const loadVoters = async () => {
    setIsLoading(true);
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await voterAPI.getAll(params);
      setVoters(response.data.data);
    } catch (error) {
      console.error('Error loading voters:', error);
      setMessage('Failed to load voters');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await voterAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleVerifyVoter = async (voterId, verified) => {
    try {
      await voterAPI.verify(voterId, { verified });
      setMessage(`Voter ${verified ? 'verified' : 'rejected'} successfully`);
      loadVoters();
      loadStats();
      setSelectedVoter(null);
    } catch (error) {
      setMessage('Failed to update voter status');
    }
  };

  const handleGenerateToken = async (voterId) => {
    setGeneratingToken(true);
    setMessage('');
    
    try {
      const response = await tokenAPI.generate(voterId);
      setMessage(`Token generated successfully! Hash: ${response.data.data.tokenHash.substring(0, 20)}...`);
      loadVoters();
      loadStats();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      active: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Voters</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalVoters}</p>
              </div>
              <Users className="w-12 h-12 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified Voters</p>
                <p className="text-3xl font-bold text-green-600">{stats.verifiedVoters}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tokens Issued</p>
                <p className="text-3xl font-bold text-blue-600">{stats.tokensIssued}</p>
              </div>
              <Key className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Votes Cast</p>
                <p className="text-3xl font-bold text-purple-600">{stats.votedCount}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Turnout: {stats.votingPercentage}%
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'pending'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('verified')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'verified'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Verified
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">{message}</p>
        </div>
      )}

      {/* Voters Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : voters.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No voters found
                  </td>
                </tr>
              ) : (
                voters.map((voter) => (
                  <tr key={voter._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {voter.voterId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voter.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(voter.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {voter.hasReceivedToken ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {voter.hasVoted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {voter.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerifyVoter(voter.voterId, true)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyVoter(voter.voterId, false)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {voter.isVerified && !voter.hasReceivedToken && (
                        <button
                          onClick={() => handleGenerateToken(voter.voterId)}
                          disabled={generatingToken}
                          className="text-purple-600 hover:text-purple-800 font-medium disabled:text-gray-400"
                        >
                          {generatingToken ? 'Generating...' : 'Generate Token'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVoter(voter)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voter Details Modal */}
      {selectedVoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Voter Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Voter ID</p>
                  <p className="font-semibold">{selectedVoter.voterId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(selectedVoter.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-semibold">{selectedVoter.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-semibold">
                    {new Date(selectedVoter.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedVoter.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedVoter.phone}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Address</p>
                <p className="font-semibold">
                  {selectedVoter.address.street && `${selectedVoter.address.street}, `}
                  {selectedVoter.address.city}, {selectedVoter.address.state}
                  {selectedVoter.address.zipCode && ` - ${selectedVoter.address.zipCode}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Token Issued</p>
                  <p className="font-semibold">
                    {selectedVoter.hasReceivedToken ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Has Voted</p>
                  <p className="font-semibold">
                    {selectedVoter.hasVoted ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVoter(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;