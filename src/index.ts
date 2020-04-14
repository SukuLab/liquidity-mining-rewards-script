import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

import * as inquirer from './lib/inquirer';
import {} from './lib/fileHandler';

clear();

console.log(
	chalk.blue(figlet.textSync('Node CLI', { horizontalLayout: 'full' }))
);

const run = async () => {
	const credentials = await inquirer.askCredentials();
	console.log(credentials);
};

run();
