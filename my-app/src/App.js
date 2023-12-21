import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import DistributionABI from './DistributionABI.json';
import stETHAbi from './stETH.json';
import './App.css';

const DISTRIBUTION_ADDRESS = '0x850A65DA677264bbb7536f8446336C022eCc85Dc';
const stETH_ADDRESS = '0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F';

export default function App() {
  const [distribution, setDistribution] = useState(null);
  const [address, setAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pendingRewards, setPendingRewards] = useState('');
  const [currentRewards, setCurrentRewards] = useState('0');
  const [availablePools, setAvailablePools] = useState([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loadingPools, setLoadingPools] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [web3, setWeb3] = useState(null);
  const [userDeposits, setUserDeposits] = useState({});

  useEffect(() => {
    const storedIsApproved = loadFromLocalStorage('isApproved');
    if (storedIsApproved !== undefined) {
      setIsApproved(storedIsApproved);
    }
  }, []);

  useEffect(() => {
    if (address && web3) {
      checkApproval();
    }
  }, [address, web3]);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAddress(accounts[0]);
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      const distributionInstance = new web3Instance.eth.Contract(DistributionABI, DISTRIBUTION_ADDRESS);
      setDistribution(distributionInstance);
    } else {
      alert('Please install MetaMask!');
    }
  };

  const handleApprove = async () => {
    if (!web3) {
      alert("Web3 is not initialized. Please connect your wallet.");
      return;
    }
    const stETHContract = new web3.eth.Contract(stETHAbi, stETH_ADDRESS);
    const max = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    try {
      await stETHContract.methods.approve(DISTRIBUTION_ADDRESS, max).send({ from: address });
      setIsApproved(true);
      saveToLocalStorage('isApproved', true);
      alert('Approval successful.');
    } catch (error) {
      console.error("Error approving stETH:", error);
    }
  };

  const checkApproval = async () => {
    if (!web3 || !address) {
      console.log("Web3 is not initialized, or address is not set.");
      return;
    }
    const stETHContract = new web3.eth.Contract(stETHAbi, stETH_ADDRESS);
    try {
      const allowance = await stETHContract.methods.allowance(address, DISTRIBUTION_ADDRESS).call();
      const max = new web3.utils.BN('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      if (new web3.utils.BN(allowance).gte(max)) {
        setIsApproved(true);
      } else {
        setIsApproved(false);
      }
      saveToLocalStorage('isApproved', isApproved);
    } catch (error) {
      console.error("Error fetching approval status:", error);
    }
  };

  const getCurrentUserReward = async () => {
    if (distribution && address) {
      try {
        const reward = await distribution.methods.getCurrentUserReward('0', address).call();
        setCurrentRewards(Web3.utils.fromWei(reward.toString(), 'ether'));
      } catch (error) {
        console.error("Error getting current user reward:", error);
      }
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (distribution && address) {
        getCurrentUserReward();
      }
    }, 3000);
  
    return () => clearInterval(intervalId);
  }, [distribution, address]);
  
  const getUserStakeData = async () => {
    if (distribution && address) {
      try {
        const result = await distribution.methods.usersData(address, '0').call();
        setStakeAmount(Web3.utils.fromWei(result.invested.toString(), 'ether'));
        setPendingRewards(Web3.utils.fromWei(result.pendingRewards.toString(), 'ether'));
      } catch (error) {
        console.error("Error fetching user stake data:", error);
      }
    }
  };

  const findAvailablePools = async () => {
    setLoadingPools(true);
    if (distribution) {
      const pools = [];
      const deposits = {};
      for (let i = 0; i < 10; i++) {
        try {
          const poolData = await distribution.methods.pools(i).call();
          if (poolData && poolData.isPublic) {
            // Get user's deposited amount for this pool
            const userData = await distribution.methods.usersData(address, i.toString()).call();
            deposits[i] = Web3.utils.fromWei(userData.invested.toString(), 'ether');
            pools.push({ id: i, data: poolData });
          }
        } catch (error) {
          console.error(`Error retrieving data for pool ${i}:`, error.message);
        }
      }
      setAvailablePools(pools);
      setUserDeposits(deposits); // Update the state with the fetched deposits
      setLoadingPools(false);
    }
  };


  const claimRewards = async () => {
    if (distribution && address) {
      await distribution.methods.claim('0', address).send({ from: address });
      alert('Rewards claimed successfully.');
    }
  };

  const withdrawTokens = async (poolId, amount) => {
    if (distribution && address) {
      if (!amount || isNaN(amount)) { // Make sure amount is not undefined or NaN
        alert('Please enter a valid amount.');
        return;
      }
      const amountInWei = Web3.utils.toWei(amount, 'ether');
      await distribution.methods.withdraw(poolId, amountInWei).send({ from: address });
      alert('Tokens withdrawn successfully.');
    }
  };
  const depositToPool = async (poolId, amount) => {
    if (!isApproved) {
      alert('Please approve stETH usage first.');
      return;
    }
    if (!amount || isNaN(amount)) {
      alert('Please enter a valid amount.');
      return;
    }
    if (distribution && address) {
      const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
      try {
        await distribution.methods.stake(poolId, amountInWei).send({ from: address });
        alert(`Deposited ${amount} stETH to pool ${poolId}`);
      } catch (error) {
        console.error(`Error depositing to pool ${poolId}:`, error);
      }
    }
  };
  
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAddress(accounts.length > 0 ? accounts[0] : '');
      });
    }
  }, []);

  return (
    <div className="App">
      <button className="ascii-button" onClick={connectWallet}>Connect Wallet</button>
      {address && (
        <>
          <p>Address: {address}</p>
          <button className="ascii-button" onClick={handleApprove}>
            {isApproved ? 'stETH Approved' : 'Approve stETH'}
          </button>
          <button className="ascii-button" onClick={getUserStakeData}>Refresh My Data</button>
          <button className="ascii-button" onClick={findAvailablePools}>
            {loadingPools ? 'Loading Pools...' : 'Find Available Pools'}
          </button>
          {availablePools.map((pool) => (
            <div key={pool.id}>
              <p>Pool ID: {pool.id}</p>
              <p>My Deposited Amount: {userDeposits[pool.id] || '0'} stETH</p>
              <input
                type="text"
                placeholder="Amount to Deposit"
                onChange={(e) => setDepositAmount(e.target.value)}

                className="ascii-input"
              />
              <button className="ascii-button" onClick={() => depositToPool(pool.id, depositAmount)}>
                Deposit to Pool {pool.id}
              </button>
              <input
                type="text"
                placeholder="Amount to Withdraw"
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="ascii-input"
              />
              <button className="ascii-button" onClick={() => withdrawTokens(pool.id, withdrawAmount)}>
                Withdraw from Pool {pool.id}
              </button>
            </div>
          ))}
          <p>Current Rewards: {currentRewards} MOR</p>
          <button className="ascii-button" onClick={claimRewards}>Claim Rewards</button>

        </>
      )}
    </div>
  );
}

function saveToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromLocalStorage(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}
