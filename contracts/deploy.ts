import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EntangleCoin with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const founderAddress = deployer.address;
  const rewardsPoolAddress = process.env.REWARDS_POOL_ADDRESS || deployer.address;

  const EntangleCoin = await ethers.getContractFactory("EntangleCoin");
  const token = await EntangleCoin.deploy(founderAddress, rewardsPoolAddress);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("EntangleCoin deployed to:", address);
  console.log("Total Supply:", ethers.formatEther(await token.totalSupply()), "ENTGL");
  console.log("Founder Balance:", ethers.formatEther(await token.balanceOf(founderAddress)), "ENTGL");
  console.log("Rewards Pool Balance:", ethers.formatEther(await token.balanceOf(rewardsPoolAddress)), "ENTGL");
  console.log("\nContract Details:");
  console.log("  Name:", await token.name());
  console.log("  Symbol:", await token.symbol());
  console.log("  Token Value: 25% of share price");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
