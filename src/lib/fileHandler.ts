import fs from 'fs';
import path from 'path';

export const getCurrentDirectoryBase = (): string => {
	return path.basename(process.cwd());
};

export const directoryExists = (filePath: string): boolean => {
	return fs.existsSync(filePath);
};
