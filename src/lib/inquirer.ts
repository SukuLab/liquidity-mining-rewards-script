import inquirer from 'inquirer';

export const askCredentials = (): Promise<{
	username: string;
	password: string;
}> => {
	const questions = [
		{
			name: 'username',
			type: 'input',
			message: 'Enter your username or e-mail address:',
			validate: function(value: string) {
				if (value.length) {
					return true;
				} else {
					return 'Please enter your username or e-mail address.';
				}
			},
		},
		{
			name: 'password',
			type: 'password',
			message: 'Enter your password:',
			validate: function(value: string) {
				if (value.length) {
					return true;
				} else {
					return 'Please enter your password.';
				}
			},
		},
	];
	return inquirer.prompt(questions);
};
