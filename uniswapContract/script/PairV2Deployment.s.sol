// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ZuniswapV2Factory} from "../src/ZuniswapV2Factory.sol";
// import {ZuniswapV2Library} from '../src/ZuniswapV2Library.sol';
import {ZuniswapV2Pair} from "../src/ZuniswapV2Pair.sol";
import {ZuniswapV2Router} from "../src/ZuniswapV2Router.sol";
import {MockERC20} from "../lib/solmate/src/test/utils/mocks/MockERC20.sol";
contract PairV2Deployment is Script {
    string path = "file.txt";
    address factoryAddress = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
    ZuniswapV2Factory factory =
        ZuniswapV2Factory(factoryAddress);
    address token1 = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
    address token2 = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;

    function run() public {
        vm.writeLine(path, "");
        vm.writeLine(path, "Uniswap Pair Deployment");

        vm.startBroadcast();

        address newPairAddress = newPair(token1, token2);
        writePairAddressToFile(
            MockERC20(token1).symbol(),
            MockERC20(token2).symbol(),
            newPairAddress
        );

        vm.stopBroadcast();
    }

    function newPair(
        address tokenAddress1,
        address tokenAddress2
    ) public returns (address) {
        address newPairAddress = factory.createPair(
            tokenAddress1,
            tokenAddress2
        );

        return newPairAddress;
    }

    function writeAddressToFile(
        string memory name,
        address tokenAddress
    ) public {
        string memory addressString = vm.toString(tokenAddress);
        string memory data = string.concat(name, ": ", addressString);
        vm.writeLine(path, data);
    }

    function writePairAddressToFile(
        string memory token1Symbol,
        string memory token2Symbol,
        address tokenAddress
    ) public {
        string memory addressString = vm.toString(tokenAddress);
        string memory data = string.concat(
            token1Symbol,
            "-",
            token2Symbol,
            ": ",
            addressString
        );
        vm.writeLine(path, data);
    }
}
