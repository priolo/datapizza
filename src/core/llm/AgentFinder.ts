import { tool, Tool, ToolSet } from 'ai';
import { z } from "zod";
import { DOC_TYPE, NodeDoc } from '../../types.js';
import { getAllIndex, getDocumentByRef, getItemById, multiWordDBSearch, nodeToString, vectorDBSearch } from '../db.js';
import Agent, { AgentOptions } from './Agent.js';



interface AgentFinderOptions extends AgentOptions {
	refs?: string[]
	tableName?: string
	/** limit su CAPTHER */
	captherLimit?: number
	/** limit su PARAGRAPH */
	paragraphLimit?: number

	searchDocEnabled?: boolean
}

class AgentFinder extends Agent {

	constructor(
		public name: string,
		options: AgentFinderOptions,
	) {
		super(name, options)
		this.refs = options.refs ?? []
		this.tableName = options.tableName ?? "kb_pizza"
	}

	refs: string[] = []
	tableName: string

	// 	protected getContextPrompt(): string {
	// 		return `
	// ## CONTEXT FOR RESEARCH
	// 1. A "document" is a set of "chapters".
	// 2. A "chapter" is a fairly long text that covers a single topic.
	// 3. A "chapter" is composed of multiple "text blocks".
	// 4. A "text block" is a short text of about 300 letters.
	// 5. A "text block" may not contain the entire sentence.
	// 6. For searches that return semantically similar results, the meaning of the text must be evaluated.
	// `
	// 	}

	protected getReactSystemPrompt(): string {
		const contextPrompt = `
## CONTEXT FOR SEARCH TOOLS
1. A "document" is a set of "chapters".
2. A "chapter" is a fairly long text that covers a single topic.
3. A "chapter" is composed of multiple "text blocks".
4. A "text block" is a short text of about 300 letters.
5. For searches that return semantically similar results, the meaning of the text must be evaluated.
`
		return super.getReactSystemPrompt() + contextPrompt
	}

	// protected getToolsStrategyPrompt(): string {
	// 	const prompt = `	### To search for "chapters" with one or more PRECISE phrases use "search_chapter_with_words" tool
	// 	- if you don't find anything try with just two words at a time and combine the results
	// 	- keep in mind that with just one word it may return too much text to analyze!
	// ### If you have specific words or phrases (e.g. the name of something or someone or a place or a specific phrase etc.)
	// 	- Search with the "search_text_blocks_with_words" tool
	// 	- collect the #CHAPTER_ID you found and use "get_specific_chapters" to get more context
	// ### Answer the question without translating the data`
	// 	return super.getToolsStrategyPrompt() + prompt
	// }

	protected getOptions(): AgentFinderOptions {
		return {
			...super.getOptions(),
			paragraphLimit: 50,
			captherLimit: 10,
			searchDocEnabled: false,
		}
	}

	protected getSystemTools(): ToolSet {

		const search_text_blocks_with_words: Tool = tool({
			description: `Returns a complete list of all "text blocks" that contain exactly those words.
Keep in mind that:
	- If it's just one word and it's very common or generic it will return too much text!
	- If it's a very long sentence, it might return nothing. One strategy is to break up the sentence.
`,
			parameters: z.object({
				words: z.array(z.string()).describe("Words to search for in all 'text blocks'"),
			}),
			execute: async ({ words }) => {
				const results: NodeDoc[] = await multiWordDBSearch(words, this.tableName, 100, DOC_TYPE.PARAGRAPH)
				if (results.length == 0) return "No results"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const search_text_blocks_with_query: Tool = tool({
			description: `1. Use ONLY if you have a semantically similar sentence such as a question or situation.
2. It is not guaranteed to return all occurrences, prefer "search_chapter_with_words" for a more precise search.
3. RETURNS: a limited number of "text blocks" semantically similar to the "query".
`,
			// Note: "text blocks" make up a "chapter".
			// `,
			parameters: z.object({
				query: z.string().describe("The text that allows the search for information by similarity on a vector db"),
			}),
			execute: async ({ query }) => {
				const options = this.options as AgentFinderOptions
				const results: NodeDoc[] = await vectorDBSearch(query, this.tableName, options.paragraphLimit, DOC_TYPE.PARAGRAPH, this.refs)
				if (results.length == 0) return "No results"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			},
		})

		const search_chapter_with_words: Tool = tool({
			description: `1. USE THIS TOOL FOR RESEACH: if you are looking for one or more phrases (such as a title, name, place, practice...)
2. If you are looking for more than two phrases and don't find anything: search only for two phrases together excluding the third and then check the result for the third phrase.
	   For example : ["Pippo", "Pluto", "Paperino"] = ["Pippo", "Pluto"]
3. If the sentence is long, it may return nothing. Try breaking the sentence.
	   For example: "Ivano's house" = ["Ivano", "house"], "Pasta with porcini mushrooms" = ["pasta", "porcini"]; "A red Ford model car" = ["car", "Ford"]
5. You may not find the phrase because it changes slightly. In that case use the "search_text_blocks_with_query" tool.
6. Minimize the number of searches.
7. ATTENTION: If it's just one word and it's very common or generic it will return too much text!
8. The phrases in the array are combined using AND.
9. RETURNS: the "chapters" that contain exactly the sentences.
`,
			parameters: z.object({
				phrases: z.array(z.string()).describe("Phases to search for in all 'chapters'"),
			}),
			execute: async ({ phrases }) => {
				const results: NodeDoc[] = await multiWordDBSearch(phrases, this.tableName, 100, DOC_TYPE.CHAPTER)
				if (results.length == 0) return "No results"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const search_chapter_with_query: Tool = tool({
			description: `Returns a very limited number of "chapters" semantically similar to the "query".`,
			// "Chapters" are a fairly long text that covers a single topic.
			// "Chapters" are composed of "text blocks".
			// `,
			parameters: z.object({
				query: z.string().describe("The text that allows the search for information by similarity on a vector db"),
			}),
			execute: async ({ query }) => {
				//const results: NodeDoc[] = (await queryDBChapter(query, "kb_pizza")).slice(0, 3)
				const options = this.options as AgentFinderOptions
				const results: NodeDoc[] = await vectorDBSearch(query, this.tableName, options.captherLimit, DOC_TYPE.CHAPTER, this.refs)
				if (results.length == 0) return "No results"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const get_specific_chapters: Tool = tool({
			description: `Only useful in combination with "text blocks".
Do not use if is CHAPTER_ID because it returns exactly the same "chapter".
Useful if you have CHAPTER_IDs and want to read the entire "chapters".			
RETURNS: one or more specific "chapters" by one or more CHAPTER_IDs
`,
			parameters: z.object({
				ids: z.array(z.string()).describe("the chapters ids (CHAPTER_ID)"),
			}),
			execute: async ({ ids }) => {
				if (!ids || ids.length == 0) return "No results"
				const results: NodeDoc[] = []
				for (const id of ids) {
					results.push(await getItemById(id, this.tableName))
				}
				if (results.length == 0) return "No results"
				return results.map(result => nodeToString(result)).join("")
			}
		})

		const get_specific_document: Tool = tool({
			description: `1. Se stai cercando un DOCUMENTO con una o più frasi (come un titolo, nome, luogo, pratica...)
`,
			parameters: z.object({
				phrases: z.array(z.string()).describe("Phases to search for in all 'text blocks'"),
			}),
			execute: async ({ phrases }) => {

			}
		})

		const search_document_with_ref: Tool = tool({
			description: `1. RETURNS: all chapters contained in a document by reference (#DOCUMENT) or file name of the document.
2. The result may be very long
`,
			parameters: z.object({
				ref: z.string().describe("A string indicating the origin of the document or its identifier (#DOCUMENT)"),
			}),
			execute: async ({ ref }) => {
				const results: NodeDoc[] = await getDocumentByRef(ref, this.tableName, DOC_TYPE.CHAPTER)
				if (results.length == 0) return "No results"
				return results.map(result => nodeToString(result)).join("")
			}
		})

		const get_all_index: Tool = tool({
			description:
				`Returns a list of "titles" or short descriptions of all "text blocks" in "chapters" for each "document".`,
			parameters: z.object({}),
			execute: async () => {
				const docs = await getAllIndex(this.tableName)
				if (docs.length == 0) return
				const recordsIndex = docs.map(doc => {
					const title = doc.ref
					const records = doc.text.split("\n").reduce((acc, line) => {
						if (!line || (line = line.trim()).length == 0) return acc
						return `${acc} - ${line}\n`
					}, "")
					return `### ${title}:\n${records}`
				})
				return recordsIndex.join("")
			}
		})

		const tools = {
			search_chapter_with_words, 
			search_text_blocks_with_query, 
			get_specific_chapters, 
		}
		if ((<AgentFinderOptions>this.options).searchDocEnabled) {
			tools["search_document_with_ref"] = search_document_with_ref
		}

		return {
			...super.getSystemTools(),
			...tools
		}
	}
}

export default AgentFinder



