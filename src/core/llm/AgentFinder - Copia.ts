import { tool, Tool, ToolExecutionOptions, ToolSet } from 'ai';
import { z } from "zod";
import { getAllIndex, getItemById, vectorDBSearch, wordDBSearch } from '../db.js';
import { DOC_TYPE, NodeDoc } from '../../types.js';
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

	protected getStrategyTools(): string {
		return `## Strategy for using tools
1. In some cases it is useful to directly search for a specific word or phrase to obtain all the "text blocks" that contain it (such as a name, a subject, a topic, a concept, etc)
then use the "search_single_word" tool to retrieve the "text blocks".
2. If you want information through a question, description or generic phrase that returns semantically similar "text blocks"
then use the "search_block_of_text" tool to search for "text blocks" semantically similar to the "query" and to have useful information.
3. If you want more information about a "block of text" and you know the #ID_CHAPTER where it was extracted
then you can use "get_specific_chapter" to get the whole "chapter" i.e. a broader context where you can look for useful information.
4. If you want information and you want an answer with a broader context through a question, phrase, description
then you can use "search_chapter" to get a broader context.
5. If you want to have the list of "titles" of known topics
then you can use "get_all_index" to have a generic index of all "text blocks" in "chapters" in "documents".
6. Combine these strategies together to achieve your goal.`
	}

	protected getOptions(): AgentFinderOptions {
		return {
			...super.getOptions(),
			tools: this.getTools(),
			paragraphLimit: 4,
			captherLimit: 2,
		}
	}

	protected getExamples(): string {
		return `## EXAMPLES
### EXAMPLE 1
- You have a database of cooking recipes.
- You need to search for all recipes that contain multiple known ingredients, for example "sugar" and "milk".
- Search for each single ingredient as a "word" with "search_single_word" to get the "text blocks" that contain that ingredient.
(keep in mind that the ingredient could be written differently, plural, singular, with typos, etc.)
- Read the "text blocks" and try to understand the recipe.
- If you need a broader context you can use #ID_CHAPTER and "get_specific_chapter" to get the complete "chapter".
- Store the recipes that contain the ingredients you searched for.

### EXAMPLE 2
- You have a database of suppliers.
- You need to know all the countries in which the suppliers operate. For example for the supplier "Datapizza".
- With "search_block_of_text" ask a generic question "Countries served by Datapizza?"
- Read the results and try to understand which countries are served.

### EXAMPLE 3
- You have a database of novels.
- You need to search for a book that talks about when Jade first went to India at the port of Mumbai.
- With "search_chapter" ask a generic question "Jade in India at the port of Mumbai"

### EXAMPLE 4
- You have a database of chat history.
- You need to search for what Jade thinks of the sales department.
- With "search_block_of_text" ask the question "what does Jade think of the sales department?"
- Read the results and try to understand the meaning.
- If you need a broader context you can use "get_specific_chapter" to get the complete "chapter".

### EXAMPLE 5
- You have a database about chemistry.
- You need to know the list of reactions treated in the database.
- With "get_all_index" you can get a list of "titles" and with these create a list of chemical reactions only.
- If a "title" is too generic you can use part of the "title" with the tools "search_single_word" or "search_block_of_text" or "search_chapter" to have a broader context.
`
	}

	protected getContext(): string {
		return `## PLEASE NOTE THAT:
1. A "document" is a set of "chapters".
2. A "chapter" is a fairly long text that covers a topic.
3. A "chapter" is composed of multiple "blocks of text".
4. A "block of text" is a short text of about 300 letters.
5. For searches that return semantically similar results, the meaning of the text must be evaluated.
${super.getContext()}
`
	}

	getTools(): ToolSet {

		const search_chapter: Tool = tool({
			description: `Returns a very limited number of "chapters" semantically similar to the "query".
"Chapters" are a fairly long text that covers a single topic.
"Chapters" are composed of "blocks of text".
`,
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

		const search_block_of_text: Tool = tool({
			description: `Returns a limited number of "text blocks" semantically similar to the "query".
Note: "Text blocks" make up a "chapter".
`,
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

		const search_single_word: Tool = tool({
			description: `Returns a complete list of all "blocks of text" that contain exactly a single word or phrase.
Keep in mind that:
- If the word is a very common or generic word it will return too many "blocks of text". One strategy is to use "search_block_of_text".
- If it is a phrase it is very specific or long it may not return the useful "block of text". One strategy is to break up a phrase that is too long
`,
			parameters: z.object({
				word: z.string().describe(`The word or phrase to search for in all "text blocks"`),
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

		const get_specific_chapter: Tool = tool({
			description: `Returns a specific "chapter" by its ID.`,
			parameters: z.object({
				id: z.string().describe("l'ID del capitolo"),
			}),
			execute: async ({ id }) => {
				const result: NodeDoc = await getItemById(id, this.tableName)
				if (!result) return "No results"
				return nodeToString(result)
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

		return { search_chapter, search_block_of_text, search_single_word, get_specific_chapter, get_all_index }
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