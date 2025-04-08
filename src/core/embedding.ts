import { google } from '@ai-sdk/google';
import { cohere } from '@ai-sdk/cohere';
import { mistral } from '@ai-sdk/mistral';
import { embed, embedMany } from 'ai';
import dotenv from 'dotenv';
dotenv.config()






/** su un array di stringhe restituisce un blocco di embedding per memorizzarlo nel vector db */
export async function getEmbeddings(values: string[]): Promise<number[][]> {
	try {
		//const model = google.textEmbeddingModel('text-embedding-004');
		// const model = cohere.embedding(
		// 	'embed-multilingual-v3.0',
		// 	//{ inputType: "search_document" }
		// 	//{ inputType: "search_query" }
		// );
		const model = mistral.textEmbeddingModel('mistral-embed');
		const v = [...values]
		let results = []
		while (v.length > 0) {
			const batch = v.splice(0, 99)
			const r = await embedMany({
				model,
				values: batch,
			})
			results.push(...r.embeddings)
		}
		return results
	} catch (error) {
		console.error("Error generating embedding:", error)
		throw error
	}
}

/** su una stringa restituisce un embedding */
export async function getEmbedding(value: string): Promise<number[]> {
	//const model = google.textEmbeddingModel('text-embedding-004');
	// const model = cohere.embedding(
	// 	'embed-multilingual-v3.0',
	// 	//{ inputType: 'search_document' }
	// 	//{ inputType: "search_query" }
	// );
	const model = mistral.textEmbeddingModel('mistral-embed');
	const r = await embed({
		model,
		value,
	})
	return r.embedding
}
