import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import TicketMarketPlace from "../contracts/TicketMarketPlace.json";
import Tcoin from "../contracts/Tcoin.json";
import NFTCard from "../components/NFTCard";

const Profile = () => {
  const [balance, setBalance] = useState("0");
  const [ownedTickets, setOwnedTickets] = useState([]);
  const [eventsCreated, setEventsCreated] = useState([]); // Events created by the user
  const [contract, setContract] = useState(null); // Contract instance
  const [account, setAccount] = useState(""); // User's address
  const [loading, setLoading] = useState(true); // Loading state
  const [contractOwner, setContractOwner] = useState(null);
  const [treasuryWallet, setTreasuryWallet] = useState("");
  const [royalty, setRoyaltyPercentage] = useState("");
  const [platformFee, setPlatformFeePercentage] = useState("");


  const tokenAddress = "0x774B51f1037e29D1149261Cb2a9fADD876420fBd";
  const contractAddress = "0xd519003CeBCc87375e20e8EAeC8d307D3d9B6f20";

  const monkeyImages = [
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622024.jpg",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149611030.jpg",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149611033.jpg",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622028.jpg",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622052.jpg?t=st=1741560641~exp=1741564241~hmac=0ea6e742c11019cdc250869d917d917e4ffd7428cb2c6b4f8c177c2cfe5805dd&w=900",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149611036.jpg?t=st=1741560661~exp=1741564261~hmac=181fe4e29fce84d24aa7bdc00f98488da9cf648fd5be30e2d7a3aa14867e9007&w=900",
    "https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149611051.jpg?t=st=1741560743~exp=1741564343~hmac=b0834bc3a930034cdf8b9b1bdca6fcc2c186ed26693c82e9361698737f923eef&w=900",
  ];


  useEffect(() => {
    const loadData = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);

          // Initialize contract instance
          const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);
          setContract(contract);
          setContractOwner(await contract.owner());
            
          const tokenContract = new ethers.Contract(tokenAddress, Tcoin.abi, signer);
          
          // Fetch balance
          const balance = await tokenContract.balanceOf(address); 
          setBalance(ethers.formatEther(balance));

          if (balance == 0) {
            console.log(address, ethers.parseEther("1000"));
            
            await tokenContract.mint(address, ethers.parseEther("1000"));
            setBalance("1000");
          }

          // Fetch events created by the user
          const allEvents = await fetchEventsCreatedByUser(contract, address);
          setEventsCreated(allEvents);

          // Fetch transaction history
          let tickets = [];
          let len = await contract.nextTicketId();
          
          for (let i = 1; i < len; i++) {
            let ticket = await contract.tickets(i);
            try {
              if (await contract.ownerOf(i) == await signer.getAddress()) {
                tickets.push({
                  ticketId: ticket[0], 
                  eventId: ticket[1], 
                  seatNumber: ticket[2], 
                  ticketPrice: ethers.formatEther(ticket[3]),
                  image: monkeyImages[i - 1],
                });
              }
            } catch (err) {}
          }
          setOwnedTickets(tickets);
        } catch (error) {
          console.log("Error loading data: ", error);
          alert("Failed to load data. See console for details.")
        }
        finally {
          setLoading(false);
        }
      }
      else {
        alert("Please install MetaMask to interact with the marketplace.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

// Fetch events created by the user
const fetchEventsCreatedByUser = async (contract, userAddress) => {
  const events = [];
  const nextEventId = await contract.nextEventId();

  for (let i = 1; i < nextEventId; i++) {
    const event = await contract.events(i);
    if (event.organizer === userAddress) {
      events.push({ ...event, eventId: i });
    }
  }
  
  return events;
};

// Pause the marketplace
const pauseMarketplace = async () => {
  try {
    const tx = await contract.pauseMarketPlace();
    await tx.wait();
    alert("Marketplace paused successfully!");
  } catch (error) {
    console.error("Error pausing marketplace:", error);
    alert(`Failed to pause marketplace: ${error.reason || error.message}`);
  }
};

// Unpause the marketplace
const unpauseMarketplace = async () => {
  try {
    const tx = await contract.resumeMarketPlace();
    await tx.wait();
    alert("Marketplace unpaused successfully!");
  } catch (error) {
    console.error("Error unpausing marketplace:", error);
    alert(`Failed to unpause marketplace: ${error.reason || error.message}`);
  }
};

// Set royalty percentage
const changeRoyaltyPercentage = async () => {
  try {
    const tx = await contract.setRoyaltyPercentage(royalty);
    await tx.wait();
    alert("Royalty percentage updated successfully!");
  } catch (error) {
    console.error("Error setting royalty percentage:", error);
    alert(`Failed to set royalty percentage: ${error.reason || error.message}`);
  }
};

// Set platform fee percentage
const changePlatformFeePercentage = async () => {
  try {
    const tx = await contract.setPlatformFeePercentage(platformFee);
    await tx.wait();
    alert("Platform fee percentage updated successfully!");
  } catch (error) {
    console.error("Error setting platform fee percentage:", error);
    alert(`Failed to set platform fee percentage: ${error.reason || error.message}`);
  }
};

// Set treasury wallet
const changeTreasuryWallet = async (walletAddress) => {
  try {
    const tx = await contract.setTreasuryWallet(walletAddress);
    await tx.wait();
    alert("Treasury wallet updated successfully!");
  } catch (error) {
    console.error("Error setting treasury wallet:", error);
    alert(`Failed to set treasury wallet: ${error.reason || error.message}`);
  }
};

if (loading) {
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <p className="text-gray-700">Loading...</p>
    </div>
  );
}

return (
  <div className="bg-gray-100 min-h-screen">
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <p className="text-gray-700">Balance: {balance} TCN</p>

      {/* Events Created by User */}
      <h2 className="text-2xl font-bold mt-8">Events Created</h2>
      <ul>
        {eventsCreated.map((event) => (
          <li key={event.eventId} className="mt-4 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold">{event[0]}</h3>
            <p>Date: {event[1]}</p>
            <p>Time: {event[2]}</p>
            <p>Location: {event[3]}</p>
            <p>Description: {event[4]}</p>
            <p>Total Tickets: {event[5]}</p>
            <p>Tickets Sold: {event[6]}</p>
          </li>
        ))}
      </ul>

      {/* Admin Controls */}
      {(account == contractOwner) && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold">Admin Controls</h2>
          <button
            onClick={pauseMarketplace}
            className="bg-red-500 text-white px-4 py-2 rounded-lg mt-4 hover:bg-red-600"
          >
            Pause Marketplace
          </button>
          <button
            onClick={unpauseMarketplace}
            className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4 ml-4 hover:bg-green-600"
          >
            Unpause Marketplace
          </button>
          <div className="mt-4">
            <input
              type="number"
              placeholder="Royalty Percentage"
              className="w-full p-2 border rounded mb-2"
              value={royalty}
              onChange={(e) => setRoyaltyPercentage(e.target.value)}
            />
            <button
              onClick={changeRoyaltyPercentage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Set Royalty Percentage
            </button>
          </div>
          <div className="mt-4">
            <input
              type="number"
              placeholder="Platform Fee Percentage"
              className="w-full p-2 border rounded mb-2"
              value={platformFee}
              onChange={(e) => setPlatformFeePercentage(e.target.value)}
            />
            <button
              onClick={changePlatformFeePercentage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Set Platform Fee Percentage
            </button>
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Treasury Wallet Address"
              className="w-full p-2 border rounded mb-2"
              value={treasuryWallet}
              onChange={(e) => setTreasuryWallet(e.target.value)}
            />
            <button
              onClick={changeTreasuryWallet}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Set Treasury Wallet
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <h2 className="text-2xl font-bold mt-8">Owned Ticket</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ownedTickets.map((ticket) => (
        <NFTCard tokenAddress={tokenAddress} contractAddress={contractAddress} nft={ticket} key={ticket.ticketId} onProfile={true}/>
      ))}
      </div>
    </div>
  </div>
);
};

export default Profile;