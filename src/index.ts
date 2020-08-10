import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

import Campaign from './Campaign';
import { getBlockTime } from './getBlockByTime';

clear();

console.log(
	chalk.greenBright(
		figlet.textSync('SUKU', {
			font: '3-D',
			horizontalLayout: 'full',
		})
	)
);

const run = async () => {
	try {
		const campaign = new Campaign();
		await campaign.runCampaign();
	} catch (e) {
		throw new Error(e);
	}
};

(async function() {
	await run();
	// process.exit(0);
})();
