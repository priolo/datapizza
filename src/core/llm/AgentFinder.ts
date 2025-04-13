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

		const strategyPrompt = `
## STRATEGY TO SEARCH TOOLS
### [search_with_words] If you have specific words (e.g. a name, topic, theme, concept, etc.)
1. Search using "search_with_words" tool
2. If you have enough context to retrieve the information reply
3. If you don't have enough context collect all the useful #ID_CHAPTER and use "get_specific_chapters" to get more context
4. Answer the question without translating the data
`
		// const strategyPrompt = `
		// Answer the question without translating the data
		// `
		// ## Strategy for using search tools
		// 1. If you have a specific word or phrase (for example a name, a subject, a topic, a concept, etc)
		// and you want to search for it on the whole "document" then use the tool "search_single_word" to retrieve the "text block" that contain that word or phrase.
		// 2. If you want "text block" through a question, description or generic phrase
		// then use the tool "search_block_of_text" to search for "text block" semantically similar to the "query".
		// 3. If you have #ID_CHAPTERs and want to access a broader context, 
		// use "get_specific_chapters" to get the specific "chapters" via a list of IDs.
		// 4. If you want general information immediately through a question, phrase, description
		// then use "search_chapter" to retrieve a series of "chapters" semantically similar to the "query".
		// - Combine these strategies together to achieve your goal.

		// 5. If you want to have the list of "titles" of the known topics
		// then use "get_all_index" to have a generic index of all "text blocks" in "chapters" in "documents".

		/*
1. Search for the specified preparation technique using "search_single_word".
2. Analyze the returned text blocks to identify recipes that use the technique.
3. If necessary, use "get_specific_chapters" to retrieve the full chapters for more context.
4. Extract the names of the recipes that use the specified technique.
5. Provide the final answer with the list of recipe names using "final_answer"
*/

		const examplesPrompt = `
## EXAMPLES FOR SEARCH TOOLS
### EXAMPLE 1
- You have a database of cooking recipes.
- You need to search for all recipes that contain multiple known ingredients, for example "sugar" and "milk".
- Search for each single ingredient as a "word" with "search_single_word" to get the "text blocks" that contain that ingredient.
(keep in mind that the ingredient could be written differently, plural, singular, with typos, etc.)
- Read the "text blocks" and try to understand the recipe.
- If you need more context you can use a list of #ID_CHAPTER and "get_specific_chapters" to get all the "chapters"
- Store the recipes that contain the ingredients you searched for.

### EXAMPLE 2
- You have a database of suppliers.
- You need to know all the countries in which the suppliers operate. For example for the supplier "Datapizza".
- With "search_text_blocks" ask a generic question "Countries served by Datapizza?"
- Read the results and try to understand which countries are served.

### EXAMPLE 3
- You have a database of novels.
- You need to search for a book that talks about when Jade first went to India at the port of Mumbai.
- With "search_chapter" ask a generic question "Jade in India at the port of Mumbai"

### EXAMPLE 4
- You have a database of chat history.
- You need to search for what Jade thinks of the sales department.
- With "search_text_blocks" ask the question "what does Jade think of the sales department?"
- Read the results and try to understand the meaning.
- If you need more context you can use "get_specific_chapters" to get all the complete "chapters".

${true ? "" : `### EXAMPLE 5
- You have a database about chemistry.
- You need to know the list of reactions treated in the database.
- With "get_all_index" you can get a list of "titles" and with these create a list of chemical reactions only.
- If a "title" is too generic you can use part of the "title" with the tools "search_single_word" or "search_text_blocks" or "search_chapter" to have a broader context.`}
`
		return super.getReactSystemPrompt() + contextPrompt //+ strategyPrompt// + examplesPrompt
	}

	protected getToolsStrategyPrompt(): string {
		const prompt = `- If you have a specific word or phrase (for example a name, a subject, a topic, a concept, etc)
- Search for "text block" with the "search_with_words" tool
- If you have enough context to retrieve the information reply
- If you don't have enough context collect all the useful #ID_CHAPTER and use "get_specific_chapters" to get more context
- Answer the question without translating the data`
		return super.getToolsStrategyPrompt() + prompt
	}


	// 5. If you want to have the list of "titles" of the known topics
	// 6. then use "get_all_index" to have a generic index of all "text blocks" in "chapters" in "documents".
	// 7. If you want "text block" through a question, description or generic phrase
	// then use the tool "search_block_of_text" to search for "text block" semantically similar to the "query".
	// 8. If you have #ID_CHAPTERs and want to access a broader context,
	// use "get_specific_chapters" to get the specific "chapters" via a list of IDs.
	// 9. If you want general information immediately through a question, phrase, description
	// then use "search_chapter" to retrieve a series of "chapters" semantically similar to the "query".
	// - Combine these strategies together to achieve your goal.


	// 	protected getContextPrompt(): string {
	// 		const context = `
	// ## TOOLS STRATEGY
	// If you have a specific word or phrase (for example a name, a subject, a topic, a concept, etc)
	// 1. Search for "text block" with the "search_single_word" tool
	// 2. If you have enough context to retrieve the information reply
	// 3. If you don't have enough context collect all the useful #ID_CHAPTER and use "get_specific_chapters" to get more context
	// 4. Answer the question without translating the data
	// `
	// 		return super.getContextPrompt() + context
	// 	}


	protected getOptions(): AgentFinderOptions {
		return {
			...super.getOptions(),
			tools: this.getTools(),
			paragraphLimit: 10,
			captherLimit: 3,
		}
	}

	getTools(): ToolSet {

		const search_with_words: Tool = tool({
			description: `Returns a complete list of all "text blocks" that contain exactly those words.`,
			// Keep in mind that:
			// - If the word is a very common or generic word it will return too many "text blocks". One strategy is to use "search_text_block".
			// - If it is a phrase it is very specific or long it may not return the useful "text block". One strategy is to break up a phrase that is too long
			// `,
			parameters: z.object({
				word: z.string().describe("The word or phrase to search for in all 'text blocks'"),
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

		const search_with_query: Tool = tool({
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

		return { search_with_query, search_with_words, get_specific_chapters, search_chapter, /*get_all_index*/ }
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