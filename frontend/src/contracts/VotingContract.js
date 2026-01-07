import { ethers } from "ethers";

export const CONTRACT_ADDRESS = "PASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS";

export const CONTRACT_ABI = [
  "function vote(uint256 candidateIndex)",
  "function getCandidate(uint256 index) view returns (string,uint256)",
  "function getCandidateCount() view returns (uint256)"
];

export async function getVotingContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    signer
  );
}
