// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./libraries/ERC1155.sol";
import "./libraries/ERC1155MintBurn.sol";
import "./libraries/ERC1155Metadata.sol";

/**
 * @title Arc1155
 * Arc1155 - ERC1155 contract that has mint functionality, 
 * and supports useful standards from OpenZeppelin,
  like _exists(), name(), symbol(), and totalSupply()
 */
contract Arc1155 is ERC1155, ERC1155MintBurn, ERC1155Metadata {
    event Minted(
        uint256 indexed tokenId,
        address indexed minter,
        string tokenUri
    );

    uint256 private _currentTokenId = 0;

    mapping(uint256 => string) private _tokenURIs;

    mapping(uint256 => uint256) public tokenSupply;

    // Contract name
    string public name = "Arc1155";
    // Contract symbol
    string public symbol = "ARC1155";

    function uri(uint256 _id) public view override returns (string memory) {
        require(_exists(_id), "ERC721Tradable#uri: NONEXISTENT_TOKEN");
        return _tokenURIs[_id];
    }

    /**
     * @dev Returns the total quantity for a token ID
     * @param _id uint256 ID of the token to query
     * @return amount of token in existence
     */
    function totalSupply(uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    /**
     * @dev Creates a new token type and assigns _supply to an address
     * @param _supply Optional amount to supply the first owner
     * @param _uri Optional URI for this token type
     */
    function mint(
        uint256 _supply,
        string calldata _uri
    ) external {
        require(_supply > 0);

        uint256 _id = _getNextTokenID();
        _incrementTokenTypeId();

        if (bytes(_uri).length > 0) {
            emit URI(_uri, _id);
        }

        _mint(msg.sender, _id, _supply, bytes(""));
        tokenSupply[_id] = _supply;

        _setTokenURI(_id, _uri);
    }

    function getCurrentTokenID() public view returns (uint256) {
        return _currentTokenId;
    }

    /**
     * @dev Returns whether the specified token exists by checking to see if it has a creator
     * @param _id uint256 ID of the token to query the existence of
     * @return bool whether the token exists
     */
    function _exists(uint256 _id) public view returns (bool) {
        return tokenSupply[_id] > 0;
    }

    /**
     * @dev calculates the next token ID based on value of _currentTokenId
     * @return uint256 for the next token ID
     */
    function _getNextTokenID() private view returns (uint256) {
        return _currentTokenId + 1;
    }

    /**
     * @dev increments the value of _currentTokenId
     */
    function _incrementTokenTypeId() private {
        _currentTokenId++;
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _id uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setTokenURI(uint256 _id, string memory _uri) internal {
        require(_exists(_id), "_setTokenURI: Token should exist");
        _tokenURIs[_id] = _uri;
    }
}
