// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NftCollection
 * @dev ERC-721 NFT smart contract with comprehensive features
 * - Maximum supply enforcement (10,000 NFTs)
 * - Safe minting with ownership tracking
 * - Pausable minting functionality
 * - Token metadata (tokenURI) support
 * - Owner-only administrative functions
 */
contract NftCollection is ERC721, Ownable {
    using Strings for uint256;

    // State variables
    uint256 private _tokenIdCounter;
    uint256 public constant MAX_SUPPLY = 10000;
    string private _baseTokenURI;
    bool public mintingPaused;

    // Events
    event MintingPaused(bool paused);
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor initializes the NFT collection
     */
    constructor() ERC721("NftCollection", "NFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
        mintingPaused = false;
        _baseTokenURI = "https://api.nftcollection.com/metadata/";
    }

    /**
     * @dev Modifier to check if minting is not paused
     */
    modifier whenNotPaused() {
        require(!mintingPaused, "Minting is currently paused");
        _;
    }

    /**
     * @dev Safely mints a new NFT to the specified address
     * @param to Address to mint the NFT to
     * Requirements:
     * - Minting must not be paused
     * - Total supply must not exceed MAX_SUPPLY
     * - `to` address must not be zero address
     */
    function safeMint(address to) public onlyOwner whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    /**
     * @dev Batch mint multiple NFTs to an address
     * @param to Address to mint NFTs to
     * @param quantity Number of NFTs to mint
     */
    function batchMint(address to, uint256 quantity) public onlyOwner whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(quantity > 0, "Quantity must be greater than zero");
        require(_tokenIdCounter + quantity <= MAX_SUPPLY, "Would exceed max supply");
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(to, tokenId);
        }
    }

    /**
     * @dev Pauses or unpauses minting
     * @param paused New paused state
     */
    function setMintingPaused(bool paused) public onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }

    /**
     * @dev Updates the base URI for token metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Returns the total number of tokens minted
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId Token ID to get URI for
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Returns the base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
