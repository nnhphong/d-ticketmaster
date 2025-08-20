// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "hardhat/console.sol";

/**
 * @title TicketMarketplace
 * @dev A marketplace for buying, selling, and transferring event tickets as NFTs.
 * Tickets are ERC721 tokens, and payments are made using an ERC20 token (TCOIN).
 * The contract supports primary and secondary ticket sales, with fees for the platform and event organizers.
 */
contract TicketMarketplace is Ownable, ERC721URIStorage, Pausable {
    /// @dev Struct to store event details.
    struct Event {
        string name; // Name of the event
        string date; // Date of the event
        string time; // Time of the event
        string location; // Location of the event
        string description; // Description of the event
        uint totalTickets; // Total number of tickets available
        uint ticketsSold; // Number of tickets sold
        address organizer; // Address of the event organizer
    }

    /// @dev Struct to store ticket details.
    struct Ticket {
        uint ticketId; // Unique ID of the ticket
        uint eventId; // ID of the event the ticket belongs to
        uint seatNumber; // Seat number of the ticket
        uint ticketPrice; // Primary price of each ticket in TCOIN
    }

    /// @dev The ERC20 token used for payments (TCOIN).
    IERC20 public tcoin;

    /// @dev Counter for generating unique event IDs.
    uint public nextEventId = 1;

    /// @dev Counter for generating unique ticket IDs.
    uint public nextTicketId = 1;

    /// @dev Platform fee percentage (e.g., 5%).
    uint public platformFeePercent = 5;

    /// @dev Royalty fee percentage for event organizers on secondary sales (e.g., 10%).
    uint public royaltyPercent = 10;

    /// @dev Address of the treasury wallet where platform fees are sent.
    address public treasuryWallet;

    /// @dev Emitted when a new event is created.
    event EventCreated(uint eventId, string name, uint totalTickets);

    /// @dev Emitted when a ticket is purchased.
    event TicketPurchased(uint ticketId, uint eventId, address buyer);

    /// @dev Emitted when a ticket is listed for resale.
    event TicketListed(uint ticketId, uint price);

    /// @dev Emitted when a ticket is transferred to another address.
    event TicketTransferred(uint ticketId, address from, address to);

    /// @dev Mapping of event IDs to Event structs.
    mapping(uint => Event) public events;

    /// @dev Mapping of ticket IDs to Ticket structs.
    mapping(uint => Ticket) public tickets;

    /// @dev Mapping of ticket IDs to their resale prices.
    mapping(uint => uint) public secondarySaleTicketPrices;

    /**
     * @dev Initializes the contract.
     * @param _owner The address of the contract owner.
     * @param _treasuryWallet The address of the treasury wallet.
     * @param _tcoin The address of the ERC20 token (TCOIN) used for payments.
     */
    constructor(address _owner, address _treasuryWallet, IERC20 _tcoin) ERC721("Event Ticket", "TIX") Ownable(_owner) {
        treasuryWallet = _treasuryWallet;
        tcoin = _tcoin;
    }

    /**
     * @dev Modifier to restrict access to the owner of a ticket.
     * @param ticketId The ID of the ticket.
     */
    modifier onlyTicketOwner(uint ticketId) {
        require(ownerOf(ticketId) == msg.sender, "Not ticket owner");
        _;
    }

    /**
     * @dev Creates a new event.
     * @param name The name of the event.
     * @param date The date of the event.
     * @param time The time of the event.
     * @param location The location of the event.
     * @param description A description of the event.
     * @param ticketPrice The price of each ticket in TCOIN.
     * @param totalTickets The total number of tickets available.
     */
    function createEvent(
        string memory name,
        string memory date,
        string memory time,
        string memory location,
        string memory description,
        uint[] memory ticketPrice,
        uint[] memory seatNumber,
        uint totalTickets
    ) external whenNotPaused {
        require(ticketPrice.length == totalTickets, "Ticket prices array length must match total tickets");
        events[nextEventId] = Event(
            name,
            date,
            time,
            location,
            description,
            totalTickets,
            0,
            msg.sender
        );

        for (uint i = nextTicketId; i < nextTicketId + totalTickets; i++) {
            tickets[i] = Ticket(i, nextEventId, seatNumber[i - nextTicketId], ticketPrice[i - nextTicketId]);
        }
        nextTicketId += totalTickets;
        emit EventCreated(nextEventId, name, totalTickets);
        nextEventId++;
    }

    // ==== Primary Marketplace Functions ==== //

    /**
     * @dev Allows a user to buy a ticket for an event.
     * @param eventId The ID of the event.
     * @param ticketId The ID of the ticket.
     */
    function buyTicket(uint eventId, uint ticketId) external whenNotPaused {
        Event storage event_ = events[eventId];
        Ticket storage ticket = tickets[ticketId];
        require(ticket.ticketPrice > 0, "Ticket not for sale");
        require(event_.ticketsSold < event_.totalTickets, "Sold out");
        require(tcoin.transferFrom(msg.sender, event_.organizer, ticket.ticketPrice), "Transfer to organizer failed");
        require(tcoin.transferFrom(msg.sender, treasuryWallet, ticket.ticketPrice * platformFeePercent / 100), "Transfer platform fee failed");

        // Mint NFT for the ticket
        _safeMint(msg.sender, ticketId);
        event_.ticketsSold++;

        emit TicketPurchased(ticketId, eventId, msg.sender);
    }

    /**
     * @dev Allows a user to buy a ticket listed for resale.
     * @param ticketId The ID of the ticket.
     */
    function buyResaleTicket(uint ticketId) external whenNotPaused {
        Ticket storage ticket = tickets[ticketId];
        uint price = secondarySaleTicketPrices[ticketId];
        require(price > 0, "Ticket not listed for resale");
        require(msg.sender != ownerOf(ticketId), "Owners cannot buy their own ticket");
        require(tcoin.transferFrom(msg.sender, ownerOf(ticketId), price), "Transfer to seller failed");
        require(tcoin.transferFrom(msg.sender, treasuryWallet, price * platformFeePercent / 100), "Transfer platform fee failed");
        require(tcoin.transferFrom(msg.sender, events[ticket.eventId].organizer, price * royaltyPercent / 100), "Transfer royalty fee failed");

        // Transfer NFT to buyer
        ticket.ticketPrice = price;
        secondarySaleTicketPrices[ticketId] = 0;
        _transfer(ownerOf(ticketId), msg.sender, ticketId);
        emit TicketPurchased(ticketId, ticket.eventId, msg.sender);
    }

    /**
     * @dev Allows a ticket owner to transfer their ticket to another address.
     * @param ticketId The ID of the ticket.
     * @param to The address to transfer the ticket to.
     */ 
    function transferTicket(uint ticketId, address to) external whenNotPaused {
        _transfer(msg.sender, to, ticketId);
        emit TicketTransferred(ticketId, msg.sender, to);
    }

    /**
     * @dev Verifies if a ticket exists and is owned by someone.
     * @param ticketId The ID of the ticket.
     * @return bool True if the ticket exists and is owned, false otherwise.
     */
    function verifyTicket(uint ticketId) external view whenNotPaused returns (bool) {
        require(ticketId <= nextTicketId, "Token does not exist.");
        require(ownerOf(ticketId) != address(0), "Ticket has no owner.");
        return true;
    }

    // ==== Secondary Marketplace Functions ==== //

    /**
     * @dev Allows a ticket owner to list their ticket for resale.
     * @param ticketId The ID of the ticket.
     * @param price The resale price of the ticket.
     */
    function listTicketForSale(uint ticketId, uint price) external whenNotPaused onlyTicketOwner(ticketId) {
        require(price > 0, "Price must be greater than 0");
        require(secondarySaleTicketPrices[ticketId] == 0, "Ticket must not be currently for sale");
        secondarySaleTicketPrices[ticketId] = price;
        emit TicketListed(ticketId, price);
    }

    // ==== Event Organizer Controls ==== //

    /**
     * @dev Allows the event organizer to set the ticket price.
     * @param eventId The ID of the event.
     * @param ticketId The ID of the ticket.
     * @param ticketPrice The new ticket price.
     */
    function setTicketPrice(uint eventId, uint ticketId, uint ticketPrice) external whenNotPaused {
        Event storage event_ = events[eventId];
        Ticket storage ticket = tickets[ticketId];
        require(msg.sender == event_.organizer, "Not event organizer");
        ticket.ticketPrice = ticketPrice;
    }

    // ==== Admin Controls ==== //

    /**
     * @dev Pauses the marketplace, preventing most functions from being called.
     */
    function pauseMarketPlace() external onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes the marketplace, allowing functions to be called again.
     */
    function resumeMarketPlace() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Sets the royalty percentage for secondary sales.
     * @param percentage The new royalty percentage.
     */
    function setRoyaltyPercentage(uint percentage) external onlyOwner {
        require(percentage <= 100, "Invalid percentage");
        royaltyPercent = percentage;
    }

    /**
     * @dev Sets the platform fee percentage.
     * @param percentage The new platform fee percentage.
     */
    function setPlatformFeePercentage(uint percentage) external onlyOwner {
        require(percentage <= 100, "Invalid percentage");
        platformFeePercent = percentage;
    }

    /**
     * @dev Transfers ownership of the contract to a new admin.
     * @param admin The address of the new admin.
     */
    function setAdmin(address admin) external onlyOwner {
        transferOwnership(admin);
    }

    /**
     * @dev Sets the treasury wallet address.
     * @param wallet The address of the new treasury wallet.
     */
    function setTreasuryWallet(address wallet) external onlyOwner {
        treasuryWallet = wallet;
    }
}