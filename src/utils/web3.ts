import BigNumber from 'bignumber.js';

export interface BigNums {
	BigNumber: BigNumber;
	decimal: string;
}

const ADDR_ZERO = '0x0000000000000000000000000000000000000000';

export const getBigNums = (BigNumber: BigNumber, decimals = 18): BigNums => {
	return {
		BigNumber,
		decimal: convertDecimal(BigNumber, decimals).toString(),
	};
};

export const isNotAddressZero = (address: string): boolean => {
	return String(address) != ADDR_ZERO;
};

export const convertDecimal = (value: BigNumber, decimals = 18): BigNumber => {
	return value.dividedBy(
		new BigNumber(10).exponentiatedBy(new BigNumber(decimals))
	);
};
