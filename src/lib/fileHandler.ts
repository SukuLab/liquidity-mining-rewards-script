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
