const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic testing for TicketMarketPlace contract", function () {
    let TicketMarketPlace, marketPlace, owner, buyer1, buyer2, organizer, treasuryWallet;
    let TCOIN;

    const EVENT_NAME = "Blackpink concert";
    const EVENT_DATE = "2023-12-25";
    const EVENT_TIME = "18:00";
    const EVENT_LOCATION = "Toronto, ON";
    const EVENT_DESCRIPTION = "A great concert!";
    const TICKET_PRICES = [ethers.parseEther("1"), ethers.parseEther("2"), ethers.parseEther("3")]; // 1,2,3 TCOIN
    const SEAT_NUMBERS = [101, 119, 130]; // 1,2,3 TCOIN
    const TOTAL_TICKETS = 3;

    beforeEach(async function() {
        [owner, organizer, buyer1, buyer2, treasuryWallet] = await ethers.getSigners();

        // deploy TCOIN
        const Tcoin = await ethers.getContractFactory("Tcoin");
        TCOIN = await Tcoin.deploy();

        // deploy ticketMarketPlace
        TicketMarketPlace = await ethers.getContractFactory("TicketMarketplace");        
        marketPlace = await TicketMarketPlace.deploy(owner.address, treasuryWallet.address, TCOIN);
        await marketPlace.waitForDeployment();

        // distribute tcoin to buyers
        await TCOIN.transfer(buyer1.address, ethers.parseEther("10"));
        await TCOIN.transfer(buyer2.address, ethers.parseEther("10"));

        await marketPlace.createEvent(
            EVENT_NAME, 
            EVENT_DATE, 
            EVENT_TIME, 
            EVENT_LOCATION, 
            EVENT_DESCRIPTION, 
            TICKET_PRICES, 
            SEAT_NUMBERS,
            TOTAL_TICKETS);

        // console.log("Marketplace address:", await marketPlace.getAddress());
        // console.log("Tcoin address", await TCOIN.getAddress());
    });

    async function buyTicket(buyer, eventId, ticketId) {
        let tx = await marketPlace.connect(buyer).buyTicket(eventId, ticketId);
        return ticketId;
    }
    
    async function buyResaleTicket(buyer, ticketId) {
        let tx = await marketPlace.connect(buyer).buyResaleTicket(ticketId);
        return ticketId;
    }

    it("Should deploy the contract with correct information", async function() {
        expect(await marketPlace.owner()).to.equal(owner.address);        
        expect(await marketPlace.treasuryWallet()).to.equal(treasuryWallet.address);
    });

    it("Should create an event", async function() {
        const event = await marketPlace.events(1);
        expect(event.name).to.equal(EVENT_NAME);
        expect(event.date).to.equal(EVENT_DATE);
        expect(event.time).to.equal(EVENT_TIME);    
        expect(event.location).to.equal(EVENT_LOCATION);
        expect(event.description).to.equal(EVENT_DESCRIPTION);
        expect(event.totalTickets).to.equal(TOTAL_TICKETS);
        expect(event.ticketsSold).to.equal(0);
        expect(event.organizer).to.equal(owner.address);
    });

    it("Should allow buyer to purchase tickets", async function() {
        let eventId = 1, ticketId = 1;
        const balanceBefore = await TCOIN.balanceOf(buyer1.address);
        expect(balanceBefore).to.equal(ethers.parseEther("10"));

        // buy ticket        
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), TICKET_PRICES[ticketId] * 105n / 100n);
        ticketId = await buyTicket(buyer1, eventId, 1);

        const balanceAfter = await TCOIN.balanceOf(buyer1.address);
        expect(balanceAfter).to.equal(ethers.parseEther("8.95")); // 10 - 1.05
        
        // verify ticket purchased 
        const event = await marketPlace.events(eventId);
        const ticket = await marketPlace.tickets(ticketId);
        expect(await marketPlace.verifyTicket(ticketId)).to.equal(true);
        expect(event.ticketsSold).to.equal(1);
        expect(ticket.eventId).to.equal(eventId);
        expect(ticket.seatNumber).to.equal(101);
        expect(ticket.ticketPrice).to.equal(TICKET_PRICES[ticketId - 1]);
        expect(await marketPlace.ownerOf(ticketId)).to.equal(buyer1.address);
        expect(await TCOIN.balanceOf(treasuryWallet)).to.equal(ethers.parseEther("0.05")); // 1.05 * 5%
    });

    it("Should allow listing a ticket for resale and buying it", async function () {
        await marketPlace.connect(owner).createEvent(
            "Indie Music Fest",
            "2025-08-30",
            "18:00",
            "Park",
            "A day of indie music",
            [ethers.parseEther("2"), ethers.parseEther("2"), ethers.parseEther("2")],
            [101, 119, 130],
            3
        );

        let eventId = 2, ticketId = 3;

        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("10"));
        ticketId = await buyTicket(buyer1, eventId, ticketId);

        await marketPlace.connect(buyer1).listTicketForSale(ticketId, ethers.parseEther("6"));
        expect(await marketPlace.secondarySaleTicketPrices(ticketId)).to.equal(ethers.parseEther("6"));

        // buyer 2 buy the resale ticket
        await TCOIN.connect(buyer2).approve(marketPlace.getAddress(), ethers.parseEther("6.9")); // 6 + (10 + 5)% for royalties and platform fee
        let resaleTicketId = await buyResaleTicket(buyer2, ticketId);

        expect(resaleTicketId).to.equal(ticketId);
        expect(await marketPlace.ownerOf(ticketId)).to.equal(buyer2.address);
        await expect(buyResaleTicket(buyer1, ticketId)).to.be.revertedWith("Ticket not listed for resale");
        
        // the admin lower the price for the ticket
        let secondTicketId = 2;
        await marketPlace.connect(owner).setTicketPrice(eventId, secondTicketId, ethers.parseEther("1"));

        // // buyer 1 buy another primary ticket
        ticketId = await buyTicket(buyer1, eventId, secondTicketId);
        expect(ticketId).to.equal(2);
    });

    it("Should transfer a ticket", async function () {
        await marketPlace.connect(owner).createEvent(
            "Indie Music Fest",
            "2025-08-30",
            "18:00",
            "Park",
            "A day of indie music",
            [ethers.parseEther("2"), ethers.parseEther("2"), ethers.parseEther("2")],
            [101, 119, 130],
            3
        );

        let eventId = 2, ticketId = 1;

        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("5"));
        ticketId = buyTicket(buyer1, eventId, ticketId);

        await marketPlace.connect(buyer1).transferTicket(ticketId, buyer2.address);

        expect(await marketPlace.ownerOf(ticketId)).to.equal(buyer2.address);
    });

    // test admin functions
    it("Should allow admin to pause and unpause the marketplace", async function () {
        await marketPlace.connect(owner).pauseMarketPlace();
        await expect(
            marketPlace.connect(buyer1).buyTicket(1, 1)
        ).to.be.reverted;

        await expect(
            marketPlace.connect(buyer1).transferTicket(1, buyer2.address)
        ).to.be.reverted;

        await marketPlace.connect(owner).resumeMarketPlace();
        await expect(
            marketPlace.connect(owner).pauseMarketPlace()
        ).not.to.be.reverted;
    });

    it("Should allow owner to set platform fee and royalty percentage", async function () {
        await marketPlace.connect(owner).setPlatformFeePercentage(8);
        await marketPlace.connect(owner).setRoyaltyPercentage(12);

        expect(await marketPlace.platformFeePercent()).to.equal(8);
        expect(await marketPlace.royaltyPercent()).to.equal(12);
    });

    it("Should allow the owner to change treasury wallet", async function () {
        await marketPlace.connect(owner).setTreasuryWallet(buyer1.address);
        expect(await marketPlace.treasuryWallet()).to.equal(buyer1.address);
    });

    it("Should be able to transfer admin to another person", async function() {
        await marketPlace.connect(owner).setAdmin(buyer1.address);
        expect(await marketPlace.owner()).to.equal(buyer1.address);
    })
});

describe("Security testing for TicketMarketPlace contract", function () {
    let TicketMarketPlace, marketPlace, owner, buyer1, buyer2, organizer, treasuryWallet;
    let TCOIN;

    const EVENT_NAME = "Blackpink concert";
    const EVENT_DATE = "2023-12-25";
    const EVENT_TIME = "18:00";
    const EVENT_LOCATION = "Toronto, ON";
    const EVENT_DESCRIPTION = "A great concert!";
    const TICKET_PRICES = [ethers.parseEther("1"), ethers.parseEther("2"), ethers.parseEther("3")]; // 1,2,3 TCOIN
    const SEAT_NUMBERS = [101, 119, 130]; // 1,2,3 TCOIN
    const TOTAL_TICKETS = 3;

    beforeEach(async function() {
        [owner, organizer, buyer1, buyer2, treasuryWallet] = await ethers.getSigners();

        // deploy TCOIN
        const Tcoin = await ethers.getContractFactory("Tcoin");
        TCOIN = await Tcoin.deploy();

        // deploy ticketMarketPlace
        TicketMarketPlace = await ethers.getContractFactory("TicketMarketplace");        
        marketPlace = await TicketMarketPlace.deploy(owner.address, treasuryWallet.address, TCOIN);
        await marketPlace.waitForDeployment();

        // distribute tcoin to buyers
        await TCOIN.transfer(buyer1.address, ethers.parseEther("10"));
        await TCOIN.transfer(buyer2.address, ethers.parseEther("10"));

        await marketPlace.createEvent(
            EVENT_NAME, 
            EVENT_DATE, 
            EVENT_TIME, 
            EVENT_LOCATION, 
            EVENT_DESCRIPTION, 
            TICKET_PRICES, 
            SEAT_NUMBERS,
            TOTAL_TICKETS);
    });

    async function buyTicket(buyer, eventId, ticketId) {
        let tx = await marketPlace.connect(buyer).buyTicket(eventId, ticketId);
        return ticketId;
    }
    
    async function buyResaleTicket(buyer, ticketId) {
        let tx = await marketPlace.connect(buyer).buyResaleTicket(ticketId);
        return ticketId;
    }

    it("Should deploy the contract with correct information", async function() {
        expect(await marketPlace.owner()).to.equal(owner.address);        
        expect(await marketPlace.treasuryWallet()).to.equal(treasuryWallet.address);
    });

    it("Should create an event", async function() {
        const event = await marketPlace.events(1);
        expect(event.name).to.equal(EVENT_NAME);
        expect(event.date).to.equal(EVENT_DATE);
        expect(event.time).to.equal(EVENT_TIME);    
        expect(event.location).to.equal(EVENT_LOCATION);
        expect(event.description).to.equal(EVENT_DESCRIPTION);
        expect(event.totalTickets).to.equal(TOTAL_TICKETS);
        expect(event.ticketsSold).to.equal(0);
        expect(event.organizer).to.equal(owner.address);
    });

    it("Should not create an event", async function() {
        await expect(marketPlace.createEvent(
            EVENT_NAME, 
            EVENT_DATE, 
            EVENT_TIME, 
            EVENT_LOCATION, 
            EVENT_DESCRIPTION, 
            TICKET_PRICES, 
            SEAT_NUMBERS,
            0)).to.be.reverted;
    });

    // ticket and transaction stuff
    it("should revert if a user tries to list an invalid price for secondary ticket sale", async function () {
        await expect(
            marketPlace.connect(buyer1).listTicketForSale(1, 0) // 0 is not a valid price
        ).to.be.reverted;
    });

    it("should revert if a user tries to buy a ticket for a non-existent event", async function () {
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("10"));
        
        await expect(
            marketPlace.connect(buyer1).buyTicket(999, 1) // Event ID 999 does not exist
        ).to.be.revertedWith("Sold out");
    });

    it("should revert when trying to buy a resale ticket that is not listed", async function () {
        await expect(
            marketPlace.connect(buyer1).buyResaleTicket(1)
        ).to.be.revertedWith("Ticket not listed for resale");
    });

    it("Should not allow buyer to purchase tickets if not enough balance", async function() {
        let eventId = 1;
        await expect(
            marketPlace.connect(buyer1).buyTicket(eventId, 1)
        ).to.be.reverted;
    });

    it("Should not allow buyer to purchase tickets if not enough allowance", async function() {
        let eventId = 1;
        await expect(
            marketPlace.connect(buyer1).buyTicket(eventId, 1)
        ).to.be.reverted;
    });

    it("The owner should not buy their own secondary sale ticket", async function(){
        await marketPlace.connect(owner).createEvent(
            "Indie Music Fest",
            "2025-08-30",
            "18:00",
            "Park",
            "A day of indie music",
            [ethers.parseEther("2"), ethers.parseEther("2"), ethers.parseEther("2")],
            [101, 119, 130],
            3
        );

        let eventId = 2, ticketId = 3;

        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("10"));
        ticketId = await buyTicket(buyer1, eventId, ticketId);

        await marketPlace.connect(buyer1).listTicketForSale(ticketId, ethers.parseEther("6"));
        expect(await marketPlace.secondarySaleTicketPrices(ticketId)).to.equal(ethers.parseEther("6"));

        await expect(buyTicket(buyer1, eventId, ticketId)).to.be.reverted;
    });

    it("Buyer should not be able to buy a sold ticket that is not listed for secondary sale yet", async function(){
        let eventId = 1, ticketId = 3;
        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("200"));
        ticketId = await buyTicket(buyer1, eventId, ticketId);
        await expect(buyTicket(buyer2, eventId, ticketId)).to.be.reverted;
    });

    it("Should not proceed a transaction that is not enough for platform fee for primary sale", async function(){
        let eventId = 1, ticketId = 3;
        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("136.5"));
        expect(buyTicket(buyer1, eventId, ticketId)).to.be.reverted;
    });

    it("Should not proceed a transaction that is not enough for platform fee for secondary sale", async function(){
        let eventId = 1, ticketId = 3;
        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("130"));
        ticketId = await buyTicket(buyer1, eventId, ticketId);
        await expect(buyResaleTicket(buyer2, eventId, ticketId)).to.be.reverted;
    });

    it("Should not proceed a transaction that is not enough for royalty fee", async function(){
        let eventId = 1, ticketId = 3;
        // buyer 1 buy a primary ticket and resale it on the secondary market
        await TCOIN.connect(buyer1).approve(marketPlace.getAddress(), ethers.parseEther("136.5"));
        ticketId = await buyTicket(buyer1, eventId, ticketId);
        await expect(buyResaleTicket(buyer2, eventId, ticketId)).to.be.reverted;
    });

    it("Should not call verify for a non-existent ticket", async function() {
        await expect(marketPlace.connect(buyer1).verifyTicket(10)).to.be.reverted;
    });

    it("Should not call verify for a non-minted ticket", async function() {
        await expect(marketPlace.connect(buyer1).verifyTicket(1)).to.be.reverted;
    });

    it("Should not buy a non-existent ticket", async function(){
        await expect(buyTicket(buyer1, 1, 4)).to.be.reverted;
    });

    // administration stuff

    it("should revert when a non-owner tries to pause the marketplace", async function () {
        await expect(
            marketPlace.connect(buyer1).pauseMarketPlace()
        ).to.be.reverted;
    });

    it("Normal user cannot transfer admin to another user", async function() {
        await expect(
            marketPlace.connect(buyer1).setAdmin(buyer2.address)
        ).to.be.reverted;
    }); 

    it("Normal user cannot change treasuryWallet", async function() {
        await expect(
            marketPlace.connect(buyer1).setTreasuryWallet(buyer1.address)
        ).to.be.reverted;
    });

    it("Should not change platform fee for an invalid percentage", async function() {
        await expect(
            marketPlace.connect(owner).setPlatformFeePercentage(101)
        ).to.be.reverted;
    });

    it("Should not change royalties for an invalid percentage", async function() {
        await expect(
            marketPlace.connect(owner).setRoyaltyPercentage(101)
        ).to.be.reverted;
    });

    it("Normal user cannot change ticketPrice", async function() {      
        await expect(
            marketPlace.connect(buyer1).setTicketPrice(1, 1, ethers.parseEther("2"))
        ).to.be.reverted;
    });
});