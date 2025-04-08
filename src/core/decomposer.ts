import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { split } from './cutter/fix.js';
import { textCutterChapter } from './cutter/llm.js';
import { breakWords } from './cutter/utils.js';
import { getEmbeddings } from './embedding.js';
import fromHTMLToText from './textualize/html.js';
import fromPDFToText from './textualize/pdf.js';
import { DOC_TYPE, NodeDoc } from "../types.js";
import { vectorDBCreateAndStore } from "./db.js";
import { uuidv4 } from "../utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




export async function importPDFToText(relativePath: string): Promise<string> {
	const absolutePath = path.resolve(__dirname, relativePath)
	const text = await fromPDFToText(absolutePath)
	return text
}

export async function importHTMLToText(relativePath: string): Promise<string> {
	const absolutePath = path.resolve(__dirname, relativePath);
	const html = await fs.readFile(absolutePath, 'utf-8');
	const text = fromHTMLToText(html);
	return text;
}

export async function storeInDb(relativePath: string, tableName: string) {
	const text = await importPDFToText(relativePath)
	storeTextInDb(text, tableName, relativePath)
}

export async function storeTextInDb(text: string, tableName: string, ref?: string) {

	// CUTTING
	const chaptersDescStart = await textCutterChapter(text)
	const chaptersTxt: string[] = breakWords(text, chaptersDescStart.map(c => c.opening_words))
	const chaptersDesc = chaptersTxt.map((c, i) => ({
		text: c,
	}))

	// CREATE INDEX DOC
	const indexDoc: NodeDoc = {
		uuid: uuidv4(),
		parent: null,
		text: chaptersDescStart.map(c => c.title).join("\n"),
		type: DOC_TYPE.INDEX,
		ref,
		vector: null,
	}

	// CREATE CHAPTERS DOCS
	const chaptersDoc: NodeDoc[] = chaptersDesc.map<NodeDoc>(c => ({
		uuid: uuidv4(),
		parent: null,
		text: c.text,
		type: DOC_TYPE.CHAPTER,
		ref,
		vector: null,
	}))

	// CREATE PARAGRAPHS DOCS SPILTTING CHAPTERS DOCS
	const paragrapsDoc: NodeDoc[] = []
	for (const chapter of chaptersDoc) {
		const paragraphsText = await split(chapter.text)
		const paragraph = paragraphsText.map<NodeDoc>(p => ({
			uuid: uuidv4(),
			parent: chapter.uuid,
			text: p,
			type: DOC_TYPE.PARAGRAPH,
			ref,
			vector: null,
		}))
		paragrapsDoc.push(...paragraph)
	}

	// EMBEDDING
	const allDocs = [...chaptersDoc, ...paragrapsDoc, indexDoc]
	const txtEmbedding = allDocs.map(doc => doc.text)
	const vectors = await getEmbeddings(txtEmbedding)
	vectors.forEach((vector, i) => allDocs[i].vector = vector)

	// CONNECT/CREATE VECTOR DB
	vectorDBCreateAndStore(allDocs, tableName)

	console.log(`Stored ${ref ?? "--"} in ${allDocs.length} documents in ${tableName} table`)
}
