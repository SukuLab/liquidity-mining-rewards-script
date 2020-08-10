import ERC20_ABI from './abis/erc20.json';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import { isNotAddressZero, convertDecimal } from './utils/web3';
import { BLOCK_GAP } from './constants.dev';
import { min } from 'bn.js';

export interface AccountBalances {
	[key: string]: { BigNumber: BigNumber; decimal: string };
}

// Initalize Ledger
const emptyBalance: AccountBalances = {};

export default class ERC20Manager {
	public web3: Web3;
	public contract: Contract;
	public decimals: BigNumber = new BigNumber(-1);
	public ready: Promise<boolean>;

	constructor(provider: string, address: string, public startingBlock = 0) {
		this.web3 = new Web3(provider);

		// Get ERC20 Token contract instance
		this.contract = new this.web3.eth.Contract(ERC20_ABI as any, address);

		this.ready = new Promise((resolve, reject) => {
			// Store contract decimals
			this.contract.methods
				.decimals()
				.call({})
				.then((decimals: number) => {
					this.decimals = new BigNumber(decimals);
					console.log(`Successfully returned decimals of: ${decimals}`);
					resolve(true);
				})
				.catch((e: Error) => {
					reject(e);
				});
		});
	}

	public getRawBalance = async (address: string): Promise<BigNumber> => {
		try {
			return await this.contract.methods.balanceOf(address).call();
		} catch (e) {
			throw new Error(e);
		}
	};

	// TODO: Add support for 'latest'
	public getAllBalancesAtBlock = async (
		targetBlock: number
	): Promise<AccountBalances> => {
		const blockDiff = targetBlock - this.startingBlock;
		if (blockDiff < 1) {
			throw new Error(
				`block: ${targetBlock} is before the deployment of this contract at block: ${this
					.startingBlock}`
			);
		}

		const blockGap = BLOCK_GAP;

		let balances = { ...emptyBalance };

		for (
			let currentBlock = this.startingBlock;
			currentBlock <= targetBlock;
			currentBlock += blockGap
		) {
			let endBlock = currentBlock + blockGap;
			// IF the endblock is greater than the target then set end to target
			if (endBlock >= targetBlock) {
				endBlock = targetBlock;
			}

			const { endBalanceDiff, minBalanceDiff } = await this.getTransferDiff(
				balances,
				currentBlock,
				endBlock
			);

			balances = endBalanceDiff;
		}

		return balances;
	};

	public getTransferDiff = async (
		startingBalances: AccountBalances,
		startBlock: number | string,
		endBlock: number | string = 'latest'
	): Promise<{
		endBalanceDiff: AccountBalances;
		minBalanceDiff: AccountBalances;
	}> => {
		try {
			const transferEvents = await this.contract.getPastEvents('Transfer', {
				fromBlock: startBlock,
				toBlock: endBlock,
			});

			let currentBalances = { ...startingBalances };
			let minBalanceDiff = { ...startingBalances };

			for (let i = 0; i < transferEvents.length; i++) {
				// Destructure event return values
				let { from, to, value } = transferEvents[i].returnValues;
				// Convert BN to BigNumber for use here
				let valueBigNimber = new BigNumber(value.toString());
				// Cast addresses to strings
				from = String(from);
				to = String(to);

				// Check if address has been added to balances
				if (isNotAddressZero(from)) {
					// IF this address has not been added yet, add it
					if (!(from in currentBalances)) {
						const newBalance = new BigNumber(valueBigNimber).multipliedBy(
							new BigNumber(-1)
						);

						// Update minBalance
						minBalanceDiff = this.updateMinBalances(
							minBalanceDiff,
							from,
							newBalance
						);
						// Update minBalance
						currentBalances[from] = {
							BigNumber: newBalance,
							decimal: convertDecimal(newBalance).toString(),
						};
					} else {
						const newBalance = currentBalances[from].BigNumber.minus(
							valueBigNimber
						);

						minBalanceDiff = this.updateMinBalances(
							minBalanceDiff,
							from,
							newBalance
						);

						currentBalances[from] = {
							BigNumber: newBalance,
							decimal: convertDecimal(newBalance).toString(),
						};
					}
				}

				// Check if address has been added to balances
				if (isNotAddressZero(to)) {
					if (!(to in currentBalances)) {
						minBalanceDiff = this.updateMinBalances(
							minBalanceDiff,
							to,
							valueBigNimber
						);

						currentBalances[to] = {
							BigNumber: valueBigNimber,
							decimal: convertDecimal(valueBigNimber).toString(),
						};
					} else {
						const newBalance = currentBalances[to].BigNumber.plus(
							valueBigNimber
						);

						minBalanceDiff = this.updateMinBalances(
							minBalanceDiff,
							to,
							newBalance
						);

						currentBalances[to] = {
							BigNumber: newBalance,
							decimal: convertDecimal(newBalance).toString(),
						};
					}
				}
			}

			return { endBalanceDiff: currentBalances, minBalanceDiff };
		} catch (e) {
			throw new Error(e);
		}
	};

	private updateMinBalances = (
		minBalances: AccountBalances,
		account: string,
		balance: BigNumber
	): AccountBalances => {
		if (
			!(account in minBalances) ||
			balance.lt(minBalances[account].BigNumber)
		) {
			minBalances[account] = {
				BigNumber: balance,
				decimal: convertDecimal(balance).toString(),
			};
		}
		return minBalances;
	};
}
