import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import { getEmbedding } from "./embedding.js";
import { DOC_TYPE, NodeDoc } from "../types.js";
import * as fs from "fs/promises";

const dbPath = "./vectorsDB/lancedb";

const VECTOR_DIM = 1024 //384 //768; // Dimension of the embedding vector





export async function vectorDBCreateAndStore(nodes: NodeDoc[], tableName: string) {
	const db = await lancedb.connect(dbPath);

	// Check if table exists before creating it
	const tableExists = (await db.tableNames()).includes(tableName);
	let table: lancedb.Table

	if (tableExists) {
		// Use existing table
		console.log(`Table ${tableName} already exists. Using existing table.`);
		table = await db.openTable(tableName);
	} else {
		// Create new table if it doesn't exist
		const schema = new arrow.Schema([
			new arrow.Field("uuid", new arrow.Utf8(), false),
			new arrow.Field("parent", new arrow.Utf8(), true), // Set nullable to true
			new arrow.Field("text", new arrow.Utf8()),
			new arrow.Field("ref", new arrow.Utf8(), true),
			new arrow.Field("type", new arrow.Utf8(), true),
			new arrow.Field("vector", new arrow.FixedSizeList(VECTOR_DIM, new arrow.Field("item", new arrow.Float32()))),
		]);
		table = await db.createEmptyTable(
			tableName,
			schema,
			{ existOk: true }
		);
		await table.createIndex("uuid")
		await table.createIndex("text", {
			config: lancedb.Index.fts(),
		});
	}

	// ADD ITEMS
	await table.add(nodes)
}




export async function vectorDBSearch(text: string, tableName: string, limit: number, type?: DOC_TYPE, refs?: string[]): Promise<NodeDoc[]> {
	const db = await lancedb.connect(dbPath);
	const table = await db.openTable(tableName);
	const vector = await getEmbedding(text);
	//const searchQuery = (table.search(vector) as lancedb.VectorQuery)//.distanceType("cosine")
	const searchQuery = table.query()
		.nearestToText(text, ["text"])
		.nearestTo(vector)

	if (!!refs && refs.length > 0) {
		const whereClause = refs.map(r => `ref LIKE '%${r}%'`).join(" OR ")
		searchQuery.where(whereClause)
	}
	if (!!type) {
		searchQuery.where(`type = '${type}'`)
	}
	const results: NodeDoc[] = await searchQuery.limit(limit).toArray()
	return results.map((item) => ({ ...item, vector: [...item.vector] }))
}

export async function multiWordDBSearch(words: string[], tableName: string, limit: number = 100, type?: DOC_TYPE): Promise<NodeDoc[]> {
	try {
		const db = await lancedb.connect(dbPath)
		const table = await db.openTable(tableName)
		const searchQuery = table.query()
		
		let sql = words.map(word => {
			const cleanWord = word.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
			return `regexp_replace(LOWER(text), '[^a-zA-Z0-9]', '', 'g') LIKE '%${cleanWord}%'`
		}).join(" AND ");
		if (!!type) sql += ` AND type = '${type}'`

		const likeDocs = (await searchQuery
			.where(sql)
			.limit(limit)
			.toArray())
			.map((item) => ({ ...item, vector: [...item.vector] }))

		return Object.values(likeDocs)

	} catch (error) {
		console.error("Error in multiWordDBSearch: ", error);
		return [];
	}
}

export async function getDocumentByRef(ref: string, tableName: string, type?: DOC_TYPE): Promise<NodeDoc[]> {
	try {
		const db = await lancedb.connect(dbPath);
		const table = await db.openTable(tableName);
		const cleanRef = ref.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
		let sql = `regexp_replace(LOWER(ref), '[^a-zA-Z0-9]', '', 'g') LIKE '%${cleanRef}%'`
		if ( !!type ) sql += ` AND type = '${type}'`
		const results: NodeDoc[] = await table.query()
			.where(sql)
			.toArray();
		return results;
	} catch (error) {
		console.error("Error retrieving item by ID:", error);
		return null;
	}
}

export async function getAllIndex(tableName: string, refs?: string[]): Promise<NodeDoc[]> {
	try {
		const db = await lancedb.connect(dbPath);
		const table = await db.openTable(tableName);
		const searchQuery = table.query()
		if (!!refs && refs.length > 0) {
			const whereClause = refs.map(r => `ref LIKE '%${r}%'`).join(" OR ")
			searchQuery.where(whereClause)
		}
		const docs: NodeDoc[] = (await searchQuery.where(`type = '${DOC_TYPE.INDEX}'`).toArray())
			.map((item) => ({ ...item, vector: [...item.vector] }))
		return docs
	} catch (error) {
		console.error("Error retrieving all index:", error);
		return [];
	}
}

export async function getItemById(uuid: string, tableName: string): Promise<NodeDoc | null> {
	try {
		const db = await lancedb.connect(dbPath);
		const table = await db.openTable(tableName);
		const results: NodeDoc[] = await table.query()
			.where(`uuid = '${uuid}'`)
			.limit(1)
			.toArray();
		return results?.[0];
	} catch (error) {
		console.error("Error retrieving item by ID:", error);
		return null;
	}
}





/**
 * Deletes the entire LanceDB database directory
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteVectorDB(): Promise<boolean> {
	// Ask for confirmation before deleting the database
	const readline = await import('readline');
	const rl = readline.createInterface({input: process.stdin,output: process.stdout});
	const confirmation = await new Promise<boolean>((resolve) => {
		rl.question('Are you sure you want to definitely delete the database? (yes/no): ', (answer) => {
			resolve(answer.toLowerCase() === 'yes');
		});
	});
	rl.close();
	if (!confirmation) {
		console.log('Database deletion cancelled.');
		return false
	}
	console.log('Proceeding with database deletion...');

	try {
		// Check if the directory exists before attempting to delete
		await fs.access(dbPath);
		// Delete the directory and all its contents recursively
		await fs.rm(dbPath, { recursive: true, force: true });
		console.log(`Vector database at ${dbPath} has been deleted`);
		return true
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			console.log(`Vector database at ${dbPath} does not exist`);
			return false
		} else {
			console.error(`Error deleting vector database:`, error);
			throw error;
		}
	}
}

export function nodeToString(node: NodeDoc): string {
	if (!node) return "";

	if (node.type == DOC_TYPE.PARAGRAPH) {
		return (node.uuid ? `#TEXT_BLOCK_ID:${node.uuid}\n` : "")
			+ (node.parent ? `#CHAPTER_ID:${node.parent}\n` : "")
			+ (node.ref ? `#DOCUMENT:${node.ref}\n` : "")
			+ (node.text ?? "")
			+ "\n---\n";
	} else if (node.type == DOC_TYPE.CHAPTER) {
		return (node.uuid ? `#CHAPTER_ID:${node.uuid}\n` : "")
			+ (node.ref ? `#DOCUMENT:${node.ref}\n` : "")
			+ (node.text ?? "")
			+ "\n---\n";
	} else if (node.type == DOC_TYPE.INDEX) {
		return (node.uuid ? `#INDEX_ID:${node.uuid}\n` : "")
			+ (node.ref ? `#DOCUMENT:${node.ref}\n` : "")
			+ (node.text ?? "")
			+ "\n---\n";
	}
}






export async function __wordDBSearch(word: string, tableName: string, limit: number = 100, type?: DOC_TYPE): Promise<NodeDoc[]> {
	try {
		const db = await lancedb.connect(dbPath)
		const table = await db.openTable(tableName)
		const searchQuery = table.query()
		
		let sql = `LOWER(text) LIKE LOWER('%${word}%')`
		if (!!type) sql += ` AND type = '${type}'`
		const likeDocs = (await searchQuery
			.where(sql)
			.limit(limit)
			.toArray())
			.map((item) => ({ ...item, vector: [...item.vector] }))

		let queryNear =  searchQuery.nearestToText(word, ["text"])
		if ( !!type ) queryNear.where(`type = '${type}'`)
		const nearestDocs: NodeDoc[] = []
	// (await queryNear
	// 		//.fullTextSearch(word, { columns: "text"})
	// 		//.limit(limit)
	// 		.toArray())
	// 		.map((item) => ({ ...item, vector: [...item.vector] }))

		// Filter out duplicates from nearestDocs based on UUID
		const docs = [...likeDocs, ...nearestDocs].reduce((acc, doc) => {
			if (acc[doc.uuid]) return acc;
			acc[doc.uuid] = doc;
			return acc;
		}, {})
		return Object.values(docs)//.slice(0, limit)

	} catch (error) {
		console.error("Error: ", error);
		return [];
	}
}

export async function __multiWordDBSearch2(words: string[], tableName: string, limit: number = 100, type?: DOC_TYPE): Promise<NodeDoc[]> {
	try {
		const db = await lancedb.connect(dbPath)
		const table = await db.openTable(tableName)
		const searchQuery = table.query()
		
		// Build SQL conditions for each word with AND logic
		let sql = words.map(word => `LOWER(text) LIKE '%${word.toLowerCase()}%'`).join(" AND ");
		
		if (!!type) sql += ` AND type = '${type}'`
		const likeDocs = (await searchQuery
			.where(sql)
			.limit(limit)
			.toArray())
			.map((item) => ({ ...item, vector: [...item.vector] }))

		// For semantic search, use combined words as the query
		// let queryNear = null
		// for ( const word of words ) {
		// 	queryNear = searchQuery.nearestToText(word, ["text"])
		// }
		
		//if (!!type) queryNear.where(`type = '${type}'`)
		const nearestDocs: NodeDoc[] = []
		// Uncomment if you want semantic search results
		// (await queryNear
		//   .limit(limit)
		//   .toArray())
		//   .map((item) => ({ ...item, vector: [...item.vector] }))

		// Filter out duplicates based on UUID
		const docs = [...likeDocs, ...nearestDocs].reduce((acc, doc) => {
			if (acc[doc.uuid]) return acc;
			acc[doc.uuid] = doc;
			return acc;
		}, {})
		return Object.values(docs)

	} catch (error) {
		console.error("Error in multiWordDBSearch: ", error);
		return [];
	}
}

