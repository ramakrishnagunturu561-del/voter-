// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    // Struct to store candidate information
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    // State variables
    address public admin;
    uint256 public candidateCount;
    uint256 public totalVotes;
    bool public votingActive;
    
    // Mappings
    mapping(uint256 => Candidate) public candidates;
    mapping(bytes32 => bool) public usedTokens;
    mapping(address => bool) public hasVoted; // Extra safety check
    
    // Events
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event VoteCast(uint256 indexed candidateId, bytes32 tokenHash);
    event VotingStatusChanged(bool active);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier votingIsActive() {
        require(votingActive, "Voting is not active");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        votingActive = false;
    }
    
    // Admin functions
    function addCandidate(string memory _name, string memory _party) public onlyAdmin {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _party, 0);
        emit CandidateAdded(candidateCount, _name, _party);
    }
    
    function startVoting() public onlyAdmin {
        require(!votingActive, "Voting is already active");
        votingActive = true;
        emit VotingStatusChanged(true);
    }
    
    function endVoting() public onlyAdmin {
        require(votingActive, "Voting is not active");
        votingActive = false;
        emit VotingStatusChanged(false);
    }
    
    // Voting function
    function vote(uint256 _candidateId, bytes32 _tokenHash) public votingIsActive {
        // Validate candidate exists
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        
        // Check token hasn't been used
        require(!usedTokens[_tokenHash], "Token already used");
        
        // Extra safety: check if address has voted (prevents accidental double voting)
        require(!hasVoted[msg.sender], "Address has already voted");
        
        // Mark token as used
        usedTokens[_tokenHash] = true;
        
        // Mark address as voted
        hasVoted[msg.sender] = true;
        
        // Increment vote count
        candidates[_candidateId].voteCount++;
        totalVotes++;
        
        emit VoteCast(_candidateId, _tokenHash);
    }
    
    // View functions
    function getCandidate(uint256 _candidateId) public view returns (
        uint256 id,
        string memory name,
        string memory party,
        uint256 voteCount
    ) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        Candidate memory c = candidates[_candidateId];
        return (c.id, c.name, c.party, c.voteCount);
    }
    
    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            allCandidates[i - 1] = candidates[i];
        }
        return allCandidates;
    }
    
    function isTokenUsed(bytes32 _tokenHash) public view returns (bool) {
        return usedTokens[_tokenHash];
    }
    
    function getResults() public view returns (Candidate[] memory) {
        return getAllCandidates();
    }
}