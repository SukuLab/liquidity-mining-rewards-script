export const formatNumber = (num: number, decimals = 2): string => {
	return num.toFixed(decimals).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};
