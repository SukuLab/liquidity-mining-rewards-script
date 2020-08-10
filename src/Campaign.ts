import BigNumber from 'bignumber.js';
import moment from 'moment';
import ERC20Manager, { AccountBalances } from './ERC20Manager';
import { writeJSONToFile } from './lib/fileHandler';
import { getBigNums, BigNums } from './utils/web3';
import {
	CAMPAIGN_BLOCKS,
	REWARDS_PER_PERIOD,
	BIG_NUMBER_REWARDS,
	MIN_BALANCE,
	WEIGHT_MULTIPLIER,
	PROVIDER,
	POOL_ADDRESS,
	POOL_START_BLOCK,
	EXCLUDED_ADDRESSS,
} from './constants';

interface PeriodStatus {
	date: Date;
	startingBlock: number;
	endingBlock: number;
	totalRewards: number;
	rewards: {
		[key: string]: {
			endingBalance: BigNums;
			rewardsBalances: BigNums[];
			totalWeight: BigNums;
			rewards: BigNums;
		};
	};
}

export default class Campaign {
	public erc20Manager: ERC20Manager;

	constructor() {
		this.erc20Manager = new ERC20Manager(
			PROVIDER,
			POOL_ADDRESS,
			POOL_START_BLOCK
		);
	}

	/**
	 * This method runs through each period to calculate reward weights. 
	 * 
	 * Liquidity Providers are required to leave liquidity throughout an entire period 
	 * to be eligible for rewards. By this definition, the minimum amount of liquidity 
	 * provided per period counts towards the weight of rewards.
	 */
	public runCampaign = async (): Promise<{
		periodStatus: PeriodStatus;
		transferDict: AccountBalances;
	}> => {
		try {
			const campaignStartBlock = CAMPAIGN_BLOCKS[0];
			if (typeof campaignStartBlock === 'string') {
				throw new Error('blocks as strings are not supported');
			}

			const balancesPerPeriod = await this.getBalancesPerPeriod(
				CAMPAIGN_BLOCKS
			);

			const initialPeriodStatus = await this.getPeriodStatus(
				balancesPerPeriod,
				CAMPAIGN_BLOCKS
			);

			const finalPeriodStatus = await this.calculateRewardsBasedOnWeight(
				initialPeriodStatus,
				getBigNums(BIG_NUMBER_REWARDS)
			);

			await writeJSONToFile(
				`results/${moment().format('YYYY-MM-DD')}.json`,
				finalPeriodStatus
			);

			return finalPeriodStatus;
		} catch (e) {
			throw new Error(e);
		}
	};

	private getBalancesPerPeriod = async (
		campaignBlocks: number[]
	): Promise<
		{
			accountBalances: AccountBalances;
			rewardBalances: AccountBalances;
		}[]
	> => {
		try {
			const campaignStartingBalances = await this.erc20Manager.getAllBalancesAtBlock(
				campaignBlocks[0]
			);

			// Includes starting balances
			let interPeriodBalances = [ campaignStartingBalances ];
			// End of period rewards
			let endOfPeriodsBalances: {
				accountBalances: AccountBalances;
				rewardBalances: AccountBalances;
			}[] = [];

			// Start comparing balances per week
			for (let period = 1; period < campaignBlocks.length; period++) {
				console.log(`Running balance calucations for period: ${period}`);

				// TEST: Adding 1 to CAMPAIGN_BLOCKS
				const transferDiff = await this.erc20Manager.getTransferDiff(
					interPeriodBalances[period - 1], // Start with the balances from the previous period / start
					campaignBlocks[period - 1] + 1, // Adding one to the previous block to prevent double counting
					campaignBlocks[period] // Count the end block of this period
				);

				// Keep track of balances between each period
				interPeriodBalances.push(transferDiff.endBalanceDiff);
				// Keep track of eligible liquidity.
				endOfPeriodsBalances.push({
					accountBalances: transferDiff.endBalanceDiff,
					// This is the balance that is eligible for rewards
					rewardBalances: transferDiff.minBalanceDiff,
				});

				console.table(transferDiff.minBalanceDiff);
				// TODO: Put ensure this doesn't override files
				await writeJSONToFile(
					`outputs/campaign-period-${period}.json`,
					endOfPeriodsBalances[period - 1].rewardBalances
				);
			}

			return endOfPeriodsBalances;
		} catch (e) {
			throw new Error(`getBalancesPerPeriod: ${e}`);
		}
	};

	private getPeriodStatus = async (
		balancesPerPeriod: {
			accountBalances: AccountBalances;
			rewardBalances: AccountBalances;
		}[],
		campaignBlocks: number[]
	): Promise<PeriodStatus> => {
		// Create object to hold final output for this period
		let periodStatus: PeriodStatus = {
			// Add in starting blocks
			date: new Date(),
			// Here we are only creating a status for the latest rewards/last period
			startingBlock: campaignBlocks[campaignBlocks.length - 2],
			endingBlock: campaignBlocks[campaignBlocks.length - 1],
			totalRewards: REWARDS_PER_PERIOD,
			rewards: {},
		};

		const finalPeriodBalances =
			balancesPerPeriod[balancesPerPeriod.length - 1].accountBalances;
		/**
		 * Initial Instantiation  
		 */
		// Update all accounts in this period to the starting value
		for (const account in finalPeriodBalances) {
			if (Object.prototype.hasOwnProperty.call(finalPeriodBalances, account)) {
				const accountBalance = finalPeriodBalances[account];

				/**
				 * Initialize the period status object 
				 * 
				 * - `endingBalance` is the actual account balance at the time rewards are distributed.
				 * - `rewardsBalances` is an array of balances that are eligible for rewards. As they move
				 * to a higher index the weight multiplier increases. This is meant to give a picture
				 * of how the weights are caluclated
				 *
				 * - `totalWeight` This is the final value of each `rewardsBalances` being adjusted 
				 * by the weight multiplier and summed together
				 */
				periodStatus.rewards[account] = {
					endingBalance: accountBalance,
					rewardsBalances: [ accountBalance ],
					totalWeight: getBigNums(
						new BigNumber(0),
						this.erc20Manager.decimals.toNumber()
					), // The final balance is not rewards worthy unless it has been in there the entire period
					rewards: getBigNums(
						new BigNumber(0),
						this.erc20Manager.decimals.toNumber()
					), // Will be calculated once all weights are known
				};
			} else {
				throw new Error(`getPeriodStatus account ${account} was not found.`);
			}
		}

		/**
		 * This iteration is used to calculate the length of time liquidity was held
		 * and how much to give a different weight to each. 
		 * 
		 * The rewards multipliers goes up to its max after 4 periods. This starts from 
		 * the end and works backward to do the calculation.
		 * 
		 * @dev In the output, accounts will have different `rewardBalances` lengths 
		 *  if accounts held liquidity over a different number of active periods
		 */
		// Loop through each period in reverse to calculate rewards for each multiplier
		// NOTE: There is a max of four periods that are used to justify reward multipliers
		for (let rewardsPeriod = 0; rewardsPeriod < 4; rewardsPeriod++) {
			const rewardsIdx = balancesPerPeriod.length - 1 - rewardsPeriod;
			if (rewardsIdx < 0) {
				break;
			}
			const rewardsPeriodBalances =
				balancesPerPeriod[rewardsIdx].rewardBalances;
			// iterate through all accounts with rewardsBalances for this period
			for (const account in rewardsPeriodBalances) {
				if (
					Object.prototype.hasOwnProperty.call(rewardsPeriodBalances, account)
				) {
					// IF this account does not have an ending balance at the end the latest period
					// then it does not count for rewards
					if (!(account in periodStatus.rewards)) {
						continue;
					}
					// Get reward balance for this account
					const accRewardsBalance: BigNums = rewardsPeriodBalances[account];
					// Get rewards multiplier array for this account
					let rewardsBalances: BigNums[] =
						periodStatus.rewards[account].rewardsBalances;
					// Get last periods rewards balance from multiplier array
					const latestRewardBalance: BigNums =
						rewardsBalances[rewardsBalances.length - 1];

					/**
					 * Calculate the latest multiplier
					 * 
					 * Rewards carry over to the next period if there is equal or 
					 * greater rewards at that period, otherwise the rewards continue 
					 * at the next periods balance.
					 */
					if (
						// if the latest rewards are greater than the next period rewards then only the latest rewards count
						accRewardsBalance.BigNumber.gt(latestRewardBalance.BigNumber)
					) {
						const newRewardsMultiplier = getBigNums(
							latestRewardBalance.BigNumber.minus(
								latestRewardBalance.BigNumber
							),
							this.erc20Manager.decimals.toNumber()
						);
						// remove the last element to update it
						rewardsBalances.pop();
						rewardsBalances.push(newRewardsMultiplier, latestRewardBalance);

						periodStatus.rewards[account].rewardsBalances = rewardsBalances;
					} else {
						const newRewardsMultiplier = getBigNums(
							latestRewardBalance.BigNumber.minus(accRewardsBalance.BigNumber),
							this.erc20Manager.decimals.toNumber()
						);
						// remove the last element to update it
						rewardsBalances.pop();
						rewardsBalances.push(newRewardsMultiplier, accRewardsBalance);

						periodStatus.rewards[account].rewardsBalances = rewardsBalances;
					}

					// Calculate the rewards weights based off of the rewardsMultipliers
					periodStatus.rewards[
						account
					].totalWeight = this.calculateRewardsWeight(
						account,
						rewardsBalances,
						WEIGHT_MULTIPLIER
					);
				} else {
					throw new Error(`getPeriodStatus account ${account} was not found.`);
				}
			}
		}

		return periodStatus;
	};

	private calculateRewardsWeight = (
		account: string,
		rewardsWeight: BigNums[],
		multipliers: number[]
	): BigNums => {
		if (rewardsWeight.length > multipliers.length) {
			throw new Error(
				`calculateRewardsWeight: rewards weight array is longer than multipliers. This may be a mistake.`
			);
		}

		// console.dir(rewardsWeight);

		// Weights are zero if less than than required liquidity is provided
		const eligibleRewards = rewardsWeight.reduce(
			(
				accumulator: BigNums,
				currentValue: BigNums,
				currentIndex: number,
				array
			): BigNums => {
				// NOTE: the zero index is liquidity that has not been in for a full period
				if (currentIndex === 0) {
					return accumulator;
				}

				return getBigNums(
					accumulator.BigNumber.plus(currentValue.BigNumber),
					this.erc20Manager.decimals.toNumber()
				);
			},
			getBigNums(new BigNumber(0), 0)
		);

		// Filter out NON community addresses and an balances that are insufficient
		if (
			EXCLUDED_ADDRESSS.includes(account) ||
			Number(eligibleRewards.decimal) < MIN_BALANCE
		) {
			return getBigNums(
				new BigNumber(0),
				this.erc20Manager.decimals.toNumber()
			);
		}

		return rewardsWeight.reduce(
			(
				accumulator: BigNums,
				currentValue: BigNums,
				currentIndex,
				array
			): BigNums => {
				const multiplier: BigNumber = new BigNumber(multipliers[currentIndex]);

				let newWeight = accumulator.BigNumber.plus(
					currentValue.BigNumber.times(multiplier)
				);

				return getBigNums(newWeight, this.erc20Manager.decimals.toNumber());
			},
			getBigNums(new BigNumber(0), 0)
		);
	};

	// Once all the weights have been determined then this can go through and calculate the
	// rewards in the base token
	private calculateRewardsBasedOnWeight = (
		periodStatus: PeriodStatus,
		rewardsPerPeriod: BigNums
	): {
		periodStatus: PeriodStatus;
		transferDict: AccountBalances;
	} => {
		let rewards = periodStatus.rewards;
		let transferDict: AccountBalances = {};

		let totalWeight = new BigNumber(0);
		// Loop through each account and sum the weights
		for (const account in rewards) {
			if (Object.prototype.hasOwnProperty.call(rewards, account)) {
				totalWeight = totalWeight.plus(rewards[account].totalWeight.BigNumber);
			}
		}

		// Loop through each account and calculate the rewards
		for (const account in rewards) {
			if (Object.prototype.hasOwnProperty.call(rewards, account)) {
				const rewardAmount = rewards[account].totalWeight.BigNumber
					.multipliedBy(rewardsPerPeriod.BigNumber)
					.dividedBy(totalWeight);

				const rewardsBigNums = getBigNums(rewardAmount);

				rewards[account].rewards = rewardsBigNums;
				transferDict[account] = rewardsBigNums;
			}
		}

		return { periodStatus, transferDict };
	};
}
