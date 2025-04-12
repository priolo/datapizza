import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { buildLeadAgent } from './agents/leader.js';
import { colorPrint, ColorType } from '../utils.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * Options for loading CSV files
 */
export interface CsvLoadOptions {
	hasHeader?: boolean;
	encoding?: BufferEncoding;
	skipEmptyLines?: boolean;
}

/**
 * Asynchronously loads a CSV file and returns its content as an array of rows
 * @param filePath Path to the CSV file
 * @param options CSV parsing options
 * @returns Promise resolving to an array of string arrays
 */
export async function loadCsvFileAsync(
	filePath: string,
	options: CsvLoadOptions = {}
): Promise<string[]> {
	const {
		hasHeader = true,
		encoding = 'utf-8',
		skipEmptyLines = true,
	} = options;

	try {
		const fileContent = await fs.promises.readFile(filePath, { encoding });
		const rows = fileContent.split(/\r?\n/);
		let result = skipEmptyLines
			? rows.filter(row => row.trim() !== '')
			: rows;
		result = hasHeader ? result.slice(1) : result;
		result = result.map(row => row.startsWith("\"") ? row.slice(1, -1) : row)
		return result
	} catch (error) {
		console.error(`Error loading CSV file: ${error}`);
		throw new Error(`Failed to load CSV file from ${filePath}: ${error}`);
	}
}


async function run() {
	const absolutePath = path.resolve(__dirname, '../../data/pizza/domande.csv')
	const data = await loadCsvFileAsync(absolutePath, {
		hasHeader: true,
		encoding: 'utf-8',
		skipEmptyLines: true,
	})
	const request = data[16]
	//const request = "Quali piatti sono preparati con la Marinatura Temporale Sincronizzata"

	const leadAgent = await buildLeadAgent()
	colorPrint(["REQUEST :", ColorType.Cyan], request)
	const result = await leadAgent.ask(request)
	colorPrint(["RESPONSE :", ColorType.Cyan], result.text)
	leadAgent.kill()

	// for (let i = 0; i < data.length; i++) {
	// 	const query = data[i]
	// 	const result = await leadAgent.ask(query)
	// 	colorPrint([i.toString(), ColorType.Cyan], " : ", result.text)
	// 	leadAgent.kill()
	// }
}

run()