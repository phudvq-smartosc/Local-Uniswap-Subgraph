// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../lib/solmate/src/test/utils/mocks/MockERC20.sol";
contract ERC20SetupDeployment is Script {
    string path = "file.txt";
    string tokenName = "Phu Token";
    string tokenSymbol = "PTK";
    function run() public {
        vm.writeLine(path, '-----------------------------------');
        vm.writeLine(path, 'New ERC20 Deployment');   

        vm.startBroadcast();

        CreateNewTokenAndStore(tokenName, tokenSymbol, 18);

        vm.stopBroadcast();
    }
    function CreateNewTokenAndStore(string memory name, string memory symbol, uint8 decimal) public returns (MockERC20) {
        MockERC20 mockToken = new MockERC20(name, symbol, decimal);
        address mockTokenAddress = address(mockToken);
        writeAddressToFile(mockToken.symbol(), mockTokenAddress);
        return mockToken;
    }
    function writeAddressToFile(string memory tokenSymbol, address tokenAddress) public {
        string memory addressString = vm.toString(tokenAddress);
        string memory data = string.concat(tokenSymbol , ': ' , addressString);
        vm.writeLine(path, data); 
    }   
}
