/* eslint-disable prefer-const */
import { BigDecimal, BigInt, store } from '@graphprotocol/graph-ts'

import { ZuniswapV2Factory, ZuniswapV2Pair, ZuniswapV2Transaction, ZuniswapV2User, Mint as MintEvent, Burn as BurnEvent, Token, Swap as SwapEvent } from '../../generated/schema';
import {
    Transfer,
    Swap,
    Burn,
    Mint,
    Sync,
} from '../../generated/templates/ZuniswapV2Pair/ZuniswapV2Pair'
import { updatePairDayData, updatePairHourData, updateTokenDayData, updateUniswapDayData } from './dayUpdates'

import { ADDRESS_ZERO, BI_18, convertTokenToDecimal, createUser, FACTORY_ADDRESS, ONE_BI, ZERO_BD } from './helper'
import { PairCreated } from '../../generated/ZuniswapV2Factory/ZuniswapV2Factory';
function isCompleteMint(mintId: string): boolean {
    return MintEvent.load(mintId)!.sender !== null // sufficient checks
}
export function handleTransfer(event: Transfer): void {
    if (event.params.to.toHexString() == ADDRESS_ZERO &&
        event.params.amount.equals(BigInt.fromI32(1000))) {
        return;
    }

    let factory = ZuniswapV2Factory.load(FACTORY_ADDRESS);
    if (!factory) throw new Error("Factory was not passed into")
    let transactionHash = event.transaction.hash.toHexString();

    // check if mint
    //check if burn
    let from = event.params.from;
    createUser(from)

    let to = event.params.to;
    createUser(to)


    let pair = ZuniswapV2Pair.load(event.address.toHexString())!;
    let value = convertTokenToDecimal(event.params.amount, BI_18)

    // get or create transaction
    let transaction = ZuniswapV2Transaction.load(transactionHash)
    if (transaction === null) {
        transaction = new ZuniswapV2Transaction(transactionHash)
        transaction.blockNumber = event.block.number
        transaction.timestamp = event.block.timestamp
        transaction.mints = []
        transaction.burns = []
        transaction.swaps = []
    }
    let mints = transaction.mints;
    if (from.toHexString() == ADDRESS_ZERO) {
        pair.totalSupply = pair.totalSupply.plus(value)
        pair.save()
    }
    // create new mint if no mints so far or if last one is done already
    // transfers and mints come in pairs, but there could be a case where that doesn't happen and it might break
    // this is to make sure all the mints are under the same transaction
    if (mints.length === 0 || isCompleteMint(mints[mints.length - 1])) {
        let mint = new MintEvent(
            event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(mints.length).toString()),
        )
        mint.transaction = transaction.id
        mint.pair = pair.id
        mint.to = to
        mint.liquidity = value
        mint.timestamp = transaction.timestamp
        mint.transaction = transaction.id
        mint.save()

        transaction.mints = mints.concat([mint.id])
        // save entities
        transaction.save()
        factory.save()
    }

    // case where direct send first on ETH withdrawls
    // for every burn event, there is a transfer first from the LP to the pool (erc-20)
    // when you LP, you get an ERC-20 token which is the accounting token of the LP position
    // the thing that's actually getting transfered is the LP account token
    if (event.params.to.toHexString() == pair.id) {
        let burns = transaction.burns
        let burn = new BurnEvent(
            event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString()),
        )
        burn.transaction = transaction.id
        burn.pair = pair.id
        burn.liquidity = value
        burn.timestamp = transaction.timestamp
        burn.to = event.params.to
        burn.sender = event.params.from
        burn.needsComplete = true
        burn.transaction = transaction.id
        burn.save()

        // TODO: Consider using .concat() for handling array updates to protect
        // against unintended side effects for other code paths.
        burns.push(burn.id)
        transaction.burns = burns
        transaction.save()

        // burn
        // there's two transfers for the LP token,
        // first its going to move from the LP back to the pool, and then it will go from the pool to the zero address
        if (event.params.to.toHexString() == ADDRESS_ZERO && event.params.from.toHexString() == pair.id) {
            pair.totalSupply = pair.totalSupply.minus(value)
            pair.save()

            // this is a new instance of a logical burn
            let burns = transaction.burns
            let burn: BurnEvent
            // this block creates the burn or gets the reference to it if it already exists
            if (burns.length > 0) {
                let currentBurn = BurnEvent.load(burns[burns.length - 1])!
                if (currentBurn.needsComplete) {
                    burn = currentBurn as BurnEvent
                } else {
                    burn = new BurnEvent(
                        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString()),
                    )
                    burn.transaction = transaction.id
                    burn.needsComplete = false
                    burn.pair = pair.id
                    burn.liquidity = value
                    burn.transaction = transaction.id
                    burn.timestamp = transaction.timestamp
                }
            } else {
                burn = new BurnEvent(
                    event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(burns.length).toString()),
                )
                burn.transaction = transaction.id
                burn.needsComplete = false
                burn.pair = pair.id
                burn.liquidity = value
                burn.transaction = transaction.id
                burn.timestamp = transaction.timestamp
            }
            // if accessing last one, replace it
            if (burn.needsComplete) {
                // TODO: Consider using .slice(0, -1).concat() to protect against
                // unintended side effects for other code paths.
                burns[burns.length - 1] = burn.id
            }
            // else add new one
            else {
                // TODO: Consider using .concat() for handling array updates to protect
                // against unintended side effects for other code paths.
                burns.push(burn.id)
            }
            transaction.burns = burns
            transaction.save()
        }
        transaction.save()
    }
}
export function handleSync(event: Sync): void {
    let pair = ZuniswapV2Pair.load(event.address.toHex())!
    let token0 = Token.load(pair.token0)
    let token1 = Token.load(pair.token1)
    if (token0 === null || token1 === null) {
      return
    }
    let uniswap = ZuniswapV2Factory.load(FACTORY_ADDRESS)!
  
    // reset factory liquidity by subtracting onluy tarcked liquidity
    // uniswap.totalLiquidityETH = uniswap.totalLiquidityETH.minus(pair.trackedReserveETH as BigDecimal)
  
    // reset token total liquidity amounts
    token0.totalLiquidity = token0.totalLiquidity!.minus(pair.reserve0)
    token1.totalLiquidity = token1.totalLiquidity!.minus(pair.reserve1)
  
    pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
    pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)
  
    if (pair.reserve1.notEqual(ZERO_BD)) pair.token0Price = pair.reserve0.div(pair.reserve1)
    else pair.token0Price = ZERO_BD
    if (pair.reserve0.notEqual(ZERO_BD)) pair.token1Price = pair.reserve1.div(pair.reserve0)
    else pair.token1Price = ZERO_BD
  
    pair.save()
  
    token0.save()
    token1.save()
  
  
    // now correctly set liquidity amounts for each token
    token0.totalLiquidity = token0.totalLiquidity!.plus(pair.reserve0)
    token1.totalLiquidity = token1.totalLiquidity!.plus(pair.reserve1)
  
    // save entities
    pair.save()
    uniswap.save()
    token0.save()
    token1.save()
  }
export function handleMint(event: Mint): void {
    // loaded from a previous handler creating this transaction
    // transfer event is emitted first and mint event is emitted afterwards, good to confirm with a protocol eng
    let transaction = ZuniswapV2Transaction.load(event.transaction.hash.toHexString())
    if (transaction === null) {
        return
    }

    let mints = transaction.mints
    let mint = MintEvent.load(mints[mints.length - 1])

    if (mint === null) {
        return
    }

    let pair = ZuniswapV2Pair.load(event.address.toHex())!
    let uniswap = ZuniswapV2Factory.load(FACTORY_ADDRESS)!

    let token0 = Token.load(pair.token0)
    let token1 = Token.load(pair.token1)
    if (token0 === null || token1 === null) {
        return
    }

    // update exchange info (except balances, sync will cover that)
    let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

    // update txn counts
    token0.txCount = token0.txCount.plus(ONE_BI)
    token1.txCount = token1.txCount.plus(ONE_BI)

    // update txn counts
    pair.txCount = pair.txCount.plus(ONE_BI)
    uniswap.txCount = uniswap.txCount.plus(ONE_BI)

    // save entities
    token0.save()
    token1.save()
    pair.save()
    uniswap.save()

    mint.sender = event.params.sender
    mint.amount0 = token0Amount as BigDecimal
    mint.amount1 = token1Amount as BigDecimal
    mint.logIndex = event.logIndex
    mint.save()

    // update day entities
    updatePairDayData(event)
    updatePairHourData(event)
    updateUniswapDayData(event)
    updateTokenDayData(token0 as Token, event)
    updateTokenDayData(token1 as Token, event)
}
export function handleBurn(event: Burn): void {
    let transaction = ZuniswapV2Transaction.load(event.transaction.hash.toHexString())

    // safety check
    if (transaction === null) {
        return
    }

    let burns = transaction.burns
    let burn = BurnEvent.load(burns[burns.length - 1])

    if (burn === null) {
        return
    }

    let pair = ZuniswapV2Pair.load(event.address.toHex())!
    let uniswap = ZuniswapV2Factory.load(FACTORY_ADDRESS)!

    //update token info
    let token0 = Token.load(pair.token0)
    let token1 = Token.load(pair.token1)
    if (token0 === null || token1 === null) {
        return
    }

    let token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

    // update txn counts
    token0.txCount = token0.txCount.plus(ONE_BI)
    token1.txCount = token1.txCount.plus(ONE_BI)

    // update txn counts
    uniswap.txCount = uniswap.txCount.plus(ONE_BI)
    pair.txCount = pair.txCount.plus(ONE_BI)

    // update global counter and save
    token0.save()
    token1.save()
    pair.save()
    uniswap.save()

    // update burn
    // burn.sender = event.params.sender
    burn.amount0 = token0Amount as BigDecimal
    burn.amount1 = token1Amount as BigDecimal
    // burn.to = event.params.to
    burn.logIndex = event.logIndex
    burn.save()

    // update day entities
    updatePairDayData(event)
    updatePairHourData(event)
    updateUniswapDayData(event)
    updateTokenDayData(token0 as Token, event)
    updateTokenDayData(token1 as Token, event)
}
export function handleSwap(event: Swap): void {
    let pair = ZuniswapV2Pair.load(event.address.toHexString())!;
    let token0 = Token.load(pair.token0);
    let token1 = Token.load(pair.token1);

    if (token0 === null || token1 === null) {
        return;
    }

    let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
    let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
    let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
    let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)

    let amount0Total = amount0In.plus(amount0Out);
    let amount1Total = amount1In.plus(amount1Out);

    token0.tradeVolume = token0.tradeVolume.plus(amount0In.plus(amount0Out))
    token1.tradeVolume = token1.tradeVolume.plus(amount1In.plus(amount1Out))

    token0.txCount = token0.txCount.plus(ONE_BI)
    token1.txCount = token1.txCount.plus(ONE_BI)

    pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
    pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)

    pair.save();

    let uniswap = ZuniswapV2Factory.load(FACTORY_ADDRESS)!

    uniswap.txCount = uniswap.txCount.plus(ONE_BI)
    // save entities
    pair.save()
    token0.save()
    token1.save()
    uniswap.save()
    let transaction = ZuniswapV2Transaction.load(event.transaction.hash.toHexString())
    if (transaction === null) {
        transaction = new ZuniswapV2Transaction(event.transaction.hash.toHexString())
        transaction.blockNumber = event.block.number
        transaction.timestamp = event.block.timestamp
        transaction.mints = []
        transaction.swaps = []
        transaction.burns = []
    }
    let swaps = transaction.swaps
    let swap = new SwapEvent(
        event.transaction.hash.toHexString().concat('-').concat(BigInt.fromI32(swaps.length).toString()),
    )

    // update swap event
    swap.transaction = transaction.id
    swap.pair = pair.id
    swap.timestamp = transaction.timestamp
    swap.transaction = transaction.id
    swap.sender = event.params.sender
    swap.amount0In = amount0In
    swap.amount1In = amount1In
    swap.amount0Out = amount0Out
    swap.amount1Out = amount1Out
    swap.to = event.params.to
    swap.from = event.transaction.from
    swap.logIndex = event.logIndex
    swap.save()

    // update the transaction

    // TODO: Consider using .concat() for handling array updates to protect
    // against unintended side effects for other code paths.
    swaps.push(swap.id)
    transaction.swaps = swaps
    transaction.save()

    // update day entities
    let pairDayData = updatePairDayData(event)
    let pairHourData = updatePairHourData(event)
    let uniswapDayData = updateUniswapDayData(event)
    let token0DayData = updateTokenDayData(token0 as Token, event)
    let token1DayData = updateTokenDayData(token1 as Token, event)

    // swap specific updating
    uniswapDayData.save()

    // swap specific updating for pair
    pairDayData.dailyVolumeToken0 = pairDayData.dailyVolumeToken0.plus(amount0Total)
    pairDayData.dailyVolumeToken1 = pairDayData.dailyVolumeToken1.plus(amount1Total)
    pairDayData.save()

    // update hourly pair data
    pairHourData.hourlyVolumeToken0 = pairHourData.hourlyVolumeToken0.plus(amount0Total)
    pairHourData.hourlyVolumeToken1 = pairHourData.hourlyVolumeToken1.plus(amount1Total)
    pairHourData.save()

    // swap specific updating for token0
    token0DayData.dailyVolumeToken = token0DayData.dailyVolumeToken.plus(amount0Total)
    token0DayData.save()

    // swap specific updating
    token1DayData.dailyVolumeToken = token1DayData.dailyVolumeToken.plus(amount1Total)
    // token1DayData.dailyVolumeETH = token1DayData.dailyVolumeETH.plus(amount1Total.times(token1.derivedETH as BigDecimal))

    token1DayData.save()
}
