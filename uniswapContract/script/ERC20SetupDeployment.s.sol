// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../lib/solmate/src/test/utils/mocks/MockERC20.sol";
contract ERC20SetupDeployment is Script {
    string path = "file.txt";

    function run() public {
        vm.writeLine(path, '----------------------------');
        vm.writeLine(path, 'Base ERC20 Deployment');   

        vm.startBroadcast();

        MockERC20 mockWBTC = CreateNewTokenAndStore("Wrapped Bitcoin", "WBTC", 18);
        MockERC20 mockWETH = CreateNewTokenAndStore("Ethereum", "ETH", 18);
        MockERC20 mockBNB = CreateNewTokenAndStore("Binance", "BNB", 18);
        MockERC20 mockUSDT = CreateNewTokenAndStore("Tether USD", "USDT", 18);
        MockERC20 mockTONCOIN = CreateNewTokenAndStore("Wrapped TON Coin", "TONCOIN", 18);

        //TODO: MINTING FOR USERS
        // mockWBTC.mint(to, value);
        vm.stopBroadcast();
    }
    function CreateNewTokenAndStore(string memory name, string memory symbol, uint8 decimal) public returns (MockERC20) {
        MockERC20 mockToken = new MockERC20(name, symbol, decimal);
        address mockTokenAddress = address(mockToken);
        writeToFile(mockToken.symbol(), mockTokenAddress);
        return mockToken;
    }
    function writeToFile(string memory tokenSymbol, address tokenAddress) public {
        string memory addressString = vm.toString(tokenAddress);
        string memory data = string.concat(tokenSymbol , ': ' , addressString);
        vm.writeLine(path, data); 
    }   
}
