import React, { useEffect, useState } from "react";
import NFTCard from "../components/NFTCard";
import TicketMarketPlace from "../contracts/TicketMarketPlace.json";
import Tcoin from "../contracts/Tcoin.json";

const { ethers } = require("ethers");

const Home = () => {
  const [nfts, setNfts] = useState([]);
  const [contract, setContract] = useState(null);
  const [token, setToken] = useState(null);
  const [account, setAccount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    description: "",
    ticketPrice: "",
    seatNumber: "", 
    totalTickets: 0,
  });

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
    const loadBlockchainData = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);
        setContract(contract);

        const token = new ethers.Contract(tokenAddress, Tcoin.abi, signer);
        setToken(token);

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);

        // fetch NFTs from the owner's wallet 
        let tickets = [];
        let len = await contract.nextTicketId();
        
        for (let i = 1; i < len; i++) {
          let ticket = await contract.tickets(i);
          let temp = {
            ticketId: ticket[0], 
            eventId: ticket[1], 
            seatNumber: ticket[2], 
            ticketPrice: ethers.formatEther(ticket[3]),
            image: monkeyImages[i - 1],
          }
          try {
            await contract.ownerOf(i);
            let secondaryPrice = await contract.secondarySaleTicketPrices(i);
            if (secondaryPrice > 0) { // have an owner and is on secondary sale market
              temp.ticketPrice = ethers.formatEther(secondaryPrice);
              tickets.push(temp);
            }
          } catch (err) {
            tickets.push(temp);
          }
        }
        
        setNfts(tickets);
      }
    };

    loadBlockchainData();
  }, []);

  // Toggle form visibility
  const toggleForm = () => {
    setShowForm(!showForm);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Parse ticketPrice and seatNumber from comma-separated strings to arrays
      const ticketPrice = formData.ticketPrice
        .split(",")
        .map((price) => ethers.parseEther(price.trim())); // Convert to TCOIN
      const seatNumber = formData.seatNumber
        .split(",")
        .map((seat) => Number(seat.trim()));

      // Validate that the number of ticket prices and seat numbers matches totalTickets
      if (ticketPrice.length != formData.totalTickets || seatNumber.length != formData.totalTickets) {
        alert("Number of ticket prices or seat numbers does not match total tickets.");
        return;
      }

      // Call the createEvent function in the smart contract      
      const tx = await contract.createEvent(
        formData.name,
        formData.date,
        formData.time,
        formData.location,
        formData.description,
        ticketPrice,
        seatNumber,
        formData.totalTickets
      );
      await tx.wait();
      alert("Event created successfully!");
      setShowForm(false); // Hide the form after submission
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. See console for details.");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-8">Explore NFTs</h1>

        {/* Button to open the form */}
        <button
          onClick={toggleForm}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-8 hover:bg-blue-600"
        >
          Create Event
        </button>

        {/* Event Creation Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">Create New Event</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Date</label>
                  <input
                    type="text"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Time</label>
                  <input
                    type="text"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Total Tickets</label>
                  <input
                    type="number"
                    name="totalTickets"
                    value={formData.totalTickets}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Ticket Prices (comma-separated, e.g., 100,200,300)</label>
                  <input
                    type="text"
                    name="ticketPrice"
                    value={formData.ticketPrice}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700">Seat Numbers (comma-separated, e.g., 1,2,3)</label>
                  <input
                    type="text"
                    name="seatNumber"
                    value={formData.seatNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Display NFTs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <NFTCard tokenAddress={tokenAddress} contractAddress={contractAddress} nft={nft} key={nft.ticketId} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;