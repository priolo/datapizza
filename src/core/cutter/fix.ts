import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";



export async function split(text: string, minChunkSize: number = 50): Promise<string[]> {
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: 300,
		chunkOverlap: 10,
		separators: ["\n\n", "\n", ".", "!", "?", "!", ",", ";", ":", " ", ""],
		keepSeparator: false,
	})
	const chunks = await textSplitter.splitText(text);
	
	// Process chunks to merge small ones with the previous chunk
	const mergedChunks: string[] = [];
	
	for (let i = 0; i < chunks.length; i++) {
		const currentChunk = chunks[i];
		
		// If this is the first chunk or it's large enough, add it to the result
		if (i === 0 || currentChunk.length >= minChunkSize) {
			mergedChunks.push(currentChunk);
		} else {
			// If the chunk is too small, concatenate with the previous chunk
			const lastIndex = mergedChunks.length - 1;
			mergedChunks[lastIndex] = mergedChunks[lastIndex] + ' ' + currentChunk;
		}
	}

	return mergedChunks;
}
