import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";

const Navbar = () => {
  const [account, setAccount] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">
          Ticket Marketplace
        </Link>
        <div className="flex space-x-4">
          <Link to="/" className="text-white hover:text-gray-400">
            Home
          </Link>
          <Link to="/profile" className="text-white hover:text-gray-400">
            Profile
          </Link>
          {account ? (
            <button
              onClick={connectWallet}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              {`Connected: ${account.slice(0, 6)}...`}
            </button>) : (
              <button
              onClick={connectWallet}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Connect Wallet
            </button>
            )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;