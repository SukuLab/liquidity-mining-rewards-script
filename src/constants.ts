import BigNumber from 'bignumber.js';

export const PROVIDER =
	process.env.PROVIDER || 'wss://mainnet.infura.io/ws/v3/';
// Block start of pool (reduces the blocks to query for events)

export const POOL_START_BLOCK = 10590454;
// Address of the liquidity pool
export const POOL_ADDRESS = '0xFc74eCDEe4e9ffF2f2ef4cdf4F1c777b2EF0e905';

// Max number of blocks to query at a time
export const BLOCK_GAP = 3000;

// NOTE: Update before running
export const CURRENT_PRICE = 0.24;
/**
 * Total Liquidity: https://uniswap.info/pair/0xfc74ecdee4e9fff2f2ef4cdf4f1c777b2ef0e905
 *   divided by
 * Total Supply: https://etherscan.io/token/0xfc74ecdee4e9fff2f2ef4cdf4f1c777b2ef0e905
 */

// NOTE: Update before running
export const CURRENT_POOL_TOKEN_VAlUE = 19.82;

/**
 * These blocks represent the start and end of each period
 */
export const PERIOD_BLOCKS: [number, number][] = [
	[
		10620142, // 2020-08-08T12:00:12 Eastern Time (Start of campaign)
		10633132, // 2020-08-10T11:59:04 Eastern Time (End of first rewards period)
	],
	[
		10646086, // 2020-08-12T11:59:57 Eastern Time (Start of second rewards period)
		10678484, // 2020-08-17T11:59:00 Eastern Time (End of second rewards period)
	],
	[
		10691496, // 2020-08-19T12:00:10 Eastern Time (Start of third rewards period)
		10724062, // 2020-08-17T11:59:54 Eastern Time (End of third rewards period)
	],
	// 2020-09-07T12:00:00 ET (End of fourth rewards period)
	// 2020-09-14T12:00:00 ET (End of fifth rewards period)
	// 2020-09-21T12:00:00 ET (End of sixth rewards period)
	// 2020-09-28T12:00:00 ET (End of seventh rewards period)
	// 2020-10-05T12:00:00 ET (End of Campaign)
];

// The distribution of awards per period
const DECIMALS_OF_REWARDS = new BigNumber(18);
export const REWARDS_PER_PERIOD = 400000;
export const BIG_NUMBER_REWARDS = new BigNumber(
	REWARDS_PER_PERIOD
).multipliedBy(new BigNumber(10).exponentiatedBy(DECIMALS_OF_REWARDS));

/**
 * Each index represents a period that an LP provides liquidity and the multiplier. 
 * 
 *   | # Periods    |  Multiplier  |
 *   |     0        |     0x       | 
 *   |     1        |     1x       | 
 *   |     2        |     2x       | 
 *   |     3        |     2x       | 
 *   |     4        |     3x       | 
 */
export const WEIGHT_MULTIPLIER = [ 0, 1, 2, 2, 3 ];

/**
 * The minimum balance required to be eligible. 0.25 ETH in value
 *
 * POOL_TOKENS / (POOL_ETH / 1/8) = MIN_BALANCE
 *  - MIN_BALANCE fluctuates with changes in the ETH ratio. 2 is the balance 
 *    for ratios on 08/09/2020
 */
export const MIN_BALANCE = 2;

// This is intended to remove liquidity that is NOT provided by community members
export const EXCLUDED_ADDRESSS = [
	'0x9b4823a4C0e28b05c2EfA898c20C36404c089789',
];
