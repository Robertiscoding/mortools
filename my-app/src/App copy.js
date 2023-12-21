import React, { useState, useEffect } from "react";
import Web3 from "web3";
import DistributionABI from "./DistributionABI.json";

const DISTRIBUTION_ADDRESS = "0x850A65DA677264bbb7536f8446336C022eCc85Dc";

export default function App() {
  const [web3, setWeb3] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [address, setAddress] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [pendingRewards, setPendingRewards] = useState("");

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAddress(accounts[0]);
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        const distributionContract = new web3Instance.eth.Contract(DistributionABI, DISTRIBUTION_ADDRESS);
        setDistribution(distributionContract);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  const getUserStakeData = async () => {
    try {
      const result = await distribution.methods.usersData(address, "0").call();
      console.log(result);
      setStakeAmount(Web3.utils.fromWei(result.invested.toString(), 'ether'));
      setPendingRewards(Web3.utils.fromWei(result.pendingRewards.toString(), 'ether'));
    } catch (error) {
      console.error("Error fetching user stake data:", error);
    }
  };

  const getCurrentUserReward = async () => {
    try {
      const reward = await distribution.methods.getCurrentUserReward("0", address).call();
      alert(`Current User Reward: ${Web3.utils.fromWei(reward.toString(), 'ether')} ETH`);
    } catch (error) {
      console.error("Error getting current user reward:", error);
    }
  };

  const claimRewards = async () => {
    try {
      await distribution.methods.claim("0", address).send({ from: address });
      alert("Rewards claimed successfully.");
    } catch (error) {
      console.error("Error claiming rewards:", error);
    }
  };

  const withdrawTokens = async (amount) => {
    try {
      const amountInWei = Web3.utils.toWei(amount);
      await distribution.methods.withdraw("0", amountInWei).send({ from: address });
      alert("Tokens withdrawn successfully.");
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      {address && (
        <>
          <p>Address: {address}</p>
          <button onClick={getUserStakeData}>Show My Data</button>
          <p>Staked: {stakeAmount} stETH</p>
          <p>Pending Rewards: {pendingRewards} MOR</p>
          <button onClick={claimRewards}>Claim Rewards</button>
          <button onClick={getCurrentUserReward}>Get Current Reward</button>
          <input
            type="text"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Amount to Withdraw"
          />
          <button onClick={() => withdrawTokens(stakeAmount)}>Withdraw</button>
        </>
      )}
    </div>
  );
}
