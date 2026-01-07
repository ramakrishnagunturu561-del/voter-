import React, { useState } from 'react';
import { Key, Loader, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { tokenAPI } from '../services/api';

const AdminPanel = ({ isAdmin }) => {
  const [voterId, setVoterId] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error, info

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    
    // Auto-clear info messages after 5 seconds
    if (type === 'info') {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    
    if (!voterId.trim()) {
      showMessage('Please enter a Voter ID', 'error');
      return;
    }

    setIsGenerating(true);
    setMessage('');
    setGeneratedToken(null);

    try {
      showMessage('Verifying voter and generating token...', 'info');
      
      const response = await tokenAPI.generate(voterId.trim());
      
      const tokenData = response.data.data;
      setGeneratedToken(tokenData);
      
      showMessage('Token generated successfully!', 'success');
      setVoterId(''); // Clear input

    } catch (error) {
      console.error('Token generation error:', error);
      
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      'Failed to generate token';
      
      showMessage(errorMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showMessage('Token copied to clipboard!', 'success');
    }).catch(() => {
      showMessage('Failed to copy token', 'error');
    });
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

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">
            Access Denied
          </h3>
          <p className="text-red-700">
            Only contract administrators can access this panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Token Generation Panel</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Generate one-time eligibility tokens for verified voters
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3">
          Token Generation Process
        </h3>
        <ol className="text-sm text-amber-800 space-y-2 ml-5 list-decimal">
          <li>Verify voter's identity and eligibility (check admin dashboard)</li>
          <li>Ensure voter status is "Verified" in the system</li>
          <li>Enter the voter's unique Voter ID below</li>
          <li>Click "Generate Token" to create eligibility token</li>
          <li>Provide the generated token to the voter securely</li>
          <li>Token can only be used once for voting</li>
        </ol>
      </div>

      {/* Token Generation Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleGenerateToken} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Voter ID *
            </label>
            <input
              type="text"
              value={voterId}
              onChange={(e) => setVoterId(e.target.value.toUpperCase())}
              placeholder="Enter Voter ID (e.g., VOTER001)"
              disabled={isGenerating}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent disabled:bg-gray-100 uppercase"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the unique identifier for the verified voter
            </p>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !voterId.trim()}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating Token...
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                Generate Eligibility Token
              </>
            )}
          </button>
        </form>

        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border flex items-start gap-3 ${getMessageStyle()}`}>
            {getMessageIcon()}
            <p className="flex-1">{message}</p>
          </div>
        )}
      </div>

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800">Token Generated Successfully</h3>
          </div>

          <div className="space-y-4">
            {/* Voter ID */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Voter ID</div>
              <div className="font-mono text-lg font-semibold text-gray-900">
                {generatedToken.voterId}
              </div>
            </div>

            {/* Token Hash */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-green-900">Eligibility Token</div>
                <button
                  onClick={() => copyToClipboard(generatedToken.tokenHash)}
                  className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-medium"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <div className="font-mono text-sm text-green-800 break-all bg-white p-3 rounded border border-green-200">
                {generatedToken.tokenHash}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600 mb-1">Transaction Hash</div>
                <div className="font-mono text-xs text-gray-800 break-all">
                  {generatedToken.transactionHash}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600 mb-1">Block Number</div>
                <div className="font-mono text-lg font-semibold text-gray-900">
                  {generatedToken.blockNumber}
                </div>
              </div>
            </div>

            {/* Generated Time */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Generated At</div>
              <div className="text-gray-900">
                {new Date(generatedToken.generatedAt).toLocaleString()}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Important Instructions:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Provide this token to the voter through a secure channel</li>
                    <li>This token can only be used ONCE for voting</li>
                    <li>Once used, it cannot be reused or regenerated</li>
                    <li>Keep a record of token issuance for audit purposes</li>
                    <li>Voter must use this exact token when casting their vote</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(generatedToken.tokenHash)}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copy Token
              </button>
              
              <button
                onClick={() => setGeneratedToken(null)}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Generate Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Security Best Practices
        </h3>
        <ul className="text-sm text-blue-800 space-y-2 ml-7 list-disc">
          <li>Verify voter identity before generating tokens</li>
          <li>Ensure voter information matches official records</li>
          <li>Use secure communication channels to share tokens</li>
          <li>Never reuse or share tokens between voters</li>
          <li>Maintain audit logs of all token generations</li>
          <li>Report any suspicious activity immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;