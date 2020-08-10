import fs from 'fs';
import path from 'path';

export const getCurrentDirectoryBase = (): string => {
	return path.basename(process.cwd());
};

export const directoryExists = (filePath: string): boolean => {
	return fs.existsSync(filePath);
};

export const writeJSONToFile = async (
	fileName: string,
	data: {}
): Promise<void> => {
	return fs.writeFile(fileName, JSON.stringify(data, null, 4), function(err) {
		if (err) {
			console.log(`Error writing to file.`);
			console.log(err);
		}
	});
};

export const writeMarkdownTableToFile = async (
	fileName: string,
	data: any[][]
): Promise<void> => {
	let tableString = '';

	const columnWidth = data[0].length;
	const headerDivider = '\n |' + '-------------|'.repeat(columnWidth);

	for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
		const rowDetails = data[rowIdx];
		tableString = tableString.concat('|');
		for await (const detail of rowDetails) {
			tableString = tableString.concat(detail + '|');
		}
		if (rowIdx === 0) {
			tableString = tableString.concat(headerDivider);
		}
		tableString = tableString.concat('\n');
	}

	return fs.writeFile(fileName, tableString, function(err) {
		if (err) {
			console.log(`Error writing to file.`);
			console.log(err);
		}
	});
};
