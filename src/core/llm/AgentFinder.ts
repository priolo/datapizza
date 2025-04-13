import { tool, Tool, ToolSet } from 'ai';
import { z } from "zod";
import { DOC_TYPE, NodeDoc } from '../../types.js';
import { getAllIndex, getItemById, vectorDBSearch, wordDBSearch } from '../db.js';
import Agent, { AgentOptions } from './Agent.js';



interface AgentFinderOptions extends AgentOptions {
	refs?: string[]
	tableName?: string
	/** limit su CAPTHER */
	captherLimit?: number
	/** limit su PARAGRAPH */
	paragraphLimit?: number
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

	protected getReactSystemPrompt(): string {
		const contextPrompt = `
## CONTEXT FOR RESEARCH
1. A "document" is a set of "chapters".
2. A "chapter" is a fairly long text that covers a single topic.
3. A "chapter" is composed of multiple "text blocks".
4. A "text block" is a short text of about 300 letters.
5. For searches that return semantically similar results, the meaning of the text must be evaluated.
`
		return super.getReactSystemPrompt() + contextPrompt
	}

	protected getToolsStrategyPrompt(): string {
		const prompt = `	If you have specific words or phrases (e.g. the name of something or someone or a place or a specific phrase etc.)
		- Search with the "search_text_blocks_with_words" tool
		- If you have enough context to retrieve the information reply
		- If you don't have enough context collect all the useful #ID_CHAPTER and use "get_specific_chapters" to get more context
		- Answer the question without translating the data`
		return super.getToolsStrategyPrompt() + prompt
	}

	protected getOptions(): AgentFinderOptions {
		return {
			...super.getOptions(),
			tools: this.getTools(),
			paragraphLimit: 50,
			captherLimit: 10,
		}
	}

	getTools(): ToolSet {

		const search_text_blocks_with_words: Tool = tool({
			description: `Returns a complete list of all "text blocks" that contain exactly those words.
Keep in mind that:
	- If the word is a very common or generic word it will return too many "text blocks". One strategy is to use "search_text_blocks_with_query".
	- If it's a very long sentence it may not return "text blocks". One strategy is to break up the sentence
`,
			parameters: z.object({
				word: z.string().describe("Words to search for in all 'text blocks'"),
			}),
			execute: async ({ word }) => {
				const results: NodeDoc[] = await wordDBSearch(word, this.tableName, 100, DOC_TYPE.PARAGRAPH)
				if (results.length == 0) return "No results"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const search_text_blocks_with_query: Tool = tool({
			description: `Returns a limited number of "text blocks" semantically similar to the "query".`,
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

		const search_chapter: Tool = tool({
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
			description: `Returns one or more specific "chapters" by one or more IDs`,
			parameters: z.object({
				ids: z.array(z.string()).describe("the chapter IDs"),
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

		return { search_text_blocks_with_query, search_text_blocks_with_words, get_specific_chapters, search_chapter, /*get_all_index*/ }
	}
}

export default AgentFinder



function nodeToString(node: NodeDoc): string {
	if (!node) return ""
	return (node.uuid ? `#ID:${node.uuid}\n` : "")
		+ (node.parent ? `#ID_CHAPTER:${node.parent}\n` : "")
		+ (node.text ?? "")
		+ "\n---\n"
}