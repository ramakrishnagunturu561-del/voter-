const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Blockchain Voting System to Polygon...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC");

  // Deploy TokenGenerator
  console.log("\n📦 Deploying TokenGenerator...");
  const TokenGenerator = await hre.ethers.getContractFactory("TokenGenerator");
  const tokenGenerator = await TokenGenerator.deploy();
  await tokenGenerator.waitForDeployment();
  const tokenGeneratorAddress = await tokenGenerator.getAddress();
  console.log("✅ TokenGenerator deployed to:", tokenGeneratorAddress);

  // Deploy VotingSystem
  console.log("\n📦 Deploying VotingSystem...");
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy();
  await votingSystem.waitForDeployment();
  const votingSystemAddress = await votingSystem.getAddress();
  console.log("✅ VotingSystem deployed to:", votingSystemAddress);

  // Add sample candidates
  console.log("\n👥 Adding sample candidates...");
  await votingSystem.addCandidate("Candidate A", "Democratic Party");
  console.log("✅ Added Candidate A");
  
  await votingSystem.addCandidate("Candidate B", "Republican Party");
  console.log("✅ Added Candidate B");
  
  await votingSystem.addCandidate("Candidate C", "Independent");
  console.log("✅ Added Candidate C");

  // Start voting
  console.log("\n🗳️  Starting voting...");
  await votingSystem.startVoting();
  console.log("✅ Voting is now active!");

  // Save deployment info
  console.log("\n📄 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Network:", hre.network.name);
  console.log("TokenGenerator:", tokenGeneratorAddress);
  console.log("VotingSystem:", votingSystemAddress);
  console.log("Admin Address:", deployer.address);
  console.log("=".repeat(50));

  // Save to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    tokenGenerator: tokenGeneratorAddress,
    votingSystem: votingSystemAddress,
    admin: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 To verify contracts on PolygonScan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${tokenGeneratorAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${votingSystemAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });