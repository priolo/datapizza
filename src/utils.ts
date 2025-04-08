// Color enum for console output
export enum ColorType {
	Reset = "\x1b[0m",
	Black = "\x1b[30m",
	Red = "\x1b[31m",
	Green = "\x1b[32m",
	Yellow = "\x1b[33m",
	Blue = "\x1b[34m",
	Magenta = "\x1b[35m",
	Cyan = "\x1b[36m",
	White = "\x1b[37m",
}

/**
 * Prints colored text to the console
 */
export function colorPrint(...messages: Array<string | [string, ColorType]>): void {
	let output = '';
	for (const message of messages) {
		if (typeof message == "string") {
			output += message
		} else {
			const [text, color] = message;
			output += `${color ?? ColorType.White}${text}${ColorType.Reset}`;
		}
	}
	console.log(output);
}

export function normalizeString(text: string): string {
	const tokens = text.split(/\s{2,}/);
	const normalizedTokens = tokens.map(t => t.replace(/\s+/g, ""));
	return normalizedTokens.join(" ");
}

export function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

export function groupBy(items: any[], keySelector: (item: any) => string): { [key: string]: any[]; } {
	return items.reduce((result, item) => {
		const key = keySelector(item);
		(result[key] || (result[key] = [])).push(item);
		return result;
	}, {});
}

export function countWords(sentence: string): number {
	if (!sentence.trim()) return 0;
	return sentence.trim().split(/\s+/).length;
}

