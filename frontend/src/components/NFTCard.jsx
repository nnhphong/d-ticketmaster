import React, { useState } from "react";
import { ethers } from "ethers";
import TicketMarketPlace from "../contracts/TicketMarketPlace.json";
import Tcoin from "../contracts/Tcoin.json";

const NFTCard = ({ tokenAddress, contractAddress, nft, onProfile }) => {
  // State to control form visibility
  const [showTransferForm, setShowTransferForm] = useState(false); 
  const [showSellForm, setShowSellForm] = useState(false); 
  const [recipientAddress, setRecipientAddress] = useState(""); // State to store recipient address
  const [secondaryPrice, setSecondaryPrice] = useState()

  const buyResaleTicket = async(contract, TCOIN) => {
    try {
      const ticketPrice = await contract.secondarySaleTicketPrices(nft.ticketId);
      await TCOIN.approve(contractAddress, ethers.parseEther(ticketPrice.toString()) * 150n / 100n);
      const tx = await contract.buyResaleTicket(nft.ticketId, { gasLimit: 300000 });
      await tx.wait();
      alert("Ticket purchased successfully!");
    } catch (error) {
      const revertReason = error || "Transaction failed";
      alert(`${revertReason}`);
    }
  }

  const buyPrimaryTicket = async (contract, TCOIN) => {
    try {
      await TCOIN.approve(contractAddress, ethers.parseEther(nft.ticketPrice) * 150n / 100n);
      const tx = await contract.buyTicket(nft.eventId, nft.ticketId);
      await tx.wait();
      alert("Ticket purchased successfully!");
    } catch (error) {
      const revertReason = error.reason || "Transaction failed";
      alert(`${revertReason}`);
    }
  }

  const buyNFT = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);
      const TCOIN = new ethers.Contract(tokenAddress, Tcoin.abi, signer);
      try {
        await contract.ownerOf(nft.ticketId);
        alert("Buy resale");
        buyResaleTicket(contract, TCOIN);
      } catch (err) {
        buyPrimaryTicket(contract, TCOIN);
      }
    }
  };

  const sellNFT = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);

      const tx = await contract.listTicketForSale(nft.ticketId, ethers.parseEther(secondaryPrice));
      await tx.wait();
      alert("Ticket listed for sale successfully!");
      setShowSellForm(false); 
    }
  };

  const transferNFT = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);

      try {
        const tx = await contract.transferTicket(nft.ticketId, recipientAddress);
        await tx.wait();
        alert("Ticket transferred successfully!");
        setShowTransferForm(false); // Close the form after successful transfer
      } catch (error) {
        alert("Transfer failed" + error);
      }
    }
  };

  const verifyNFT = async (ticketId) => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, TicketMarketPlace.abi, signer);
      try {
        const tx = await contract.verifyTicket(nft.ticketId);
        if (tx) {
          alert("Validation successful: ticket ID " + ticketId + " is valid on the blockchain");
        }
        else {
          alert("Validation unsccessful: ticket is invalid");
        }
      }
      catch (err) {
        alert("Validation unsuccessful");
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <img src={nft.image} alt={nft.name} className="w-full h-48 object-cover rounded-t-lg" />
      <div className="p-4">
        <h3 className="text-xl font-bold">Ticket ID: {nft.ticketId}</h3>
        <p className="text-gray-800 font-bold">Event ID: {nft.eventId}</p>
        <p className="text-gray-800 font-bold">Seat number: {nft.seatNumber}</p>
        <p className="text-gray-800 font-bold">{nft.ticketPrice} TCOIN</p>
        {!onProfile && (
          <button onClick={buyNFT} className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Buy Now
          </button>
        )}
        {onProfile && (
          <button onClick={() => setShowSellForm(true)} className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
            Sell
          </button>
        )}
        {onProfile && (
          <button
            onClick={() => setShowTransferForm(true)} // Open the transfer form
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Transfer
          </button>
        )}
        {onProfile && (
          <button onClick={() => verifyNFT(nft.ticketId)} className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
            Verify Ticket
          </button>
        )}
      </div>

      {/* Transfer Form Modal */}
      {showTransferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Transfer Ticket</h2>
            <input
              type="text"
              placeholder="Recipient's Wallet Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowTransferForm(false)} // Close the form
                className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={transferNFT} // Call the transfer function
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {
        showSellForm && (
          (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Sell Ticket on Secondary Sale</h2>
                <input
                  type="text"
                  placeholder="Secondary price"
                  value={secondaryPrice}
                  onChange={(e) => setSecondaryPrice(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSellForm(false)} // Close the form
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sellNFT} // Call the transfer function
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          )
        )
      }
    </div>
  );
};

export default NFTCard;