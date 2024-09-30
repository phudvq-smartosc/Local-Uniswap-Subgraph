// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ZuniswapV2Factory} from "../src/ZuniswapV2Factory.sol";
// import {ZuniswapV2Library} from '../src/ZuniswapV2Library.sol';
import {ZuniswapV2Pair} from "../src/ZuniswapV2Pair.sol";
import {ZuniswapV2Router} from "../src/ZuniswapV2Router.sol";
import {MockERC20} from "../lib/solmate/src/test/utils/mocks/MockERC20.sol";
contract UniswapV2Deployment is Script {
    string path = "file.txt";
    ZuniswapV2Factory factory;
    ZuniswapV2Router zuniswapV2Router;

    function run() public {
        vm.writeLine(path, "");
        vm.writeLine(path, "Uniswap Factory/Router Deployment");

        vm.startBroadcast();

        factory = new ZuniswapV2Factory();
        zuniswapV2Router = new ZuniswapV2Router(address(factory));
        writeAddressToFile("Factory", address(factory));
        writeAddressToFile("Router", address(zuniswapV2Router));

        vm.stopBroadcast();
    }

    function writeAddressToFile(
        string memory name,
        address tokenAddress
    ) public {
        string memory addressString = vm.toString(tokenAddress);
        string memory data = string.concat(name, ": ", addressString);
        vm.writeLine(path, data);
    }
}
