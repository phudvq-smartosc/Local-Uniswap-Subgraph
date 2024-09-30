/* eslint-disable prefer-const */
import { BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts'

import { Bundle, ZuniswapV2Pair, ZuniswapV2PairDayData, Token, ZuniswapV2TokenDayData, ZuniswapV2DayData, ZuniswapV2Factory, ZuniswapV2PairHourData } from '../../generated/schema'
import { FACTORY_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI } from './helper'

export function updateUniswapDayData(event: ethereum.Event): ZuniswapV2DayData {
    let uniswap = ZuniswapV2Factory.load(FACTORY_ADDRESS)!
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let uniswapDayData = ZuniswapV2DayData.load(dayID.toString())
    if (uniswapDayData === null) {
        uniswapDayData = new ZuniswapV2DayData(dayID.toString())
        uniswapDayData.date = dayStartTimestamp
    }

    uniswapDayData.txCount = uniswap.txCount
    uniswapDayData.save()

    return uniswapDayData as ZuniswapV2DayData
}

export function updatePairDayData(event: ethereum.Event): ZuniswapV2PairDayData {
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let dayPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(dayID).toString())
    let pair = ZuniswapV2Pair.load(event.address.toHexString())!
    let pairDayData = ZuniswapV2PairDayData.load(dayPairID)
    if (pairDayData === null) {
        pairDayData = new ZuniswapV2PairDayData(dayPairID)
        pairDayData.date = dayStartTimestamp
        pairDayData.token0 = pair.token0
        pairDayData.token1 = pair.token1
        pairDayData.pairAddress = event.address
        pairDayData.dailyVolumeToken0 = ZERO_BD
        pairDayData.dailyVolumeToken1 = ZERO_BD
        pairDayData.dailyTxns = ZERO_BI
    }

    pairDayData.totalSupply = pair.totalSupply
    pairDayData.reserve0 = pair.reserve0
    pairDayData.reserve1 = pair.reserve1
    pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI)
    pairDayData.save()

    return pairDayData as ZuniswapV2PairDayData
}

export function updatePairHourData(event: ethereum.Event): ZuniswapV2PairHourData {
    let timestamp = event.block.timestamp.toI32()
    let hourIndex = timestamp / 3600 // get unique hour within unix history
    let hourStartUnix = hourIndex * 3600 // want the rounded effect
    let hourPairID = event.address.toHexString().concat('-').concat(BigInt.fromI32(hourIndex).toString())
    let pair = ZuniswapV2Pair.load(event.address.toHexString())!
    let pairHourData = ZuniswapV2PairHourData.load(hourPairID)
    if (pairHourData === null) {
        pairHourData = new ZuniswapV2PairHourData(hourPairID)
        pairHourData.hourStartUnix = hourStartUnix
        pairHourData.pair = event.address.toHexString()
        pairHourData.hourlyVolumeToken0 = ZERO_BD
        pairHourData.hourlyVolumeToken1 = ZERO_BD
        pairHourData.hourlyTxns = ZERO_BI
    }

    pairHourData.totalSupply = pair.totalSupply
    pairHourData.reserve0 = pair.reserve0
    pairHourData.reserve1 = pair.reserve1
    pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI)
    pairHourData.save()

    return pairHourData as ZuniswapV2PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): ZuniswapV2TokenDayData {
    let bundle = Bundle.load('1')!
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let tokenDayID = token.id.toString().concat('-').concat(BigInt.fromI32(dayID).toString())

    let tokenDayData = ZuniswapV2TokenDayData.load(tokenDayID)
    if (tokenDayData === null) {
        tokenDayData = new ZuniswapV2TokenDayData(tokenDayID)
        tokenDayData.date = dayStartTimestamp
        tokenDayData.token = token.id
        tokenDayData.dailyVolumeToken = ZERO_BD
        tokenDayData.dailyTxns = ZERO_BI
    }
    tokenDayData.totalLiquidityToken = token.totalLiquidity!
    tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI)
    tokenDayData.save()

    /**
     * @todo test if this speeds up sync
     */
    // updateStoredTokens(tokenDayData as TokenDayData, dayID)
    // updateStoredPairs(tokenDayData as TokenDayData, dayPairID)

    return tokenDayData as ZuniswapV2TokenDayData
}
