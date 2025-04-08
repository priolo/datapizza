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

	protected getOptions(): AgentFinderOptions {
		return {
			...super.getOptions(),
			description: "",
			systemPrompt: `
## TIENI CONTO CHE:
1. Un "documento" è un insieme di "capitoli".
2. Un "capitolo" è un testo abbastanza lungo che riguarda un argomento.
3. Un "capitolo" è composto da più "blocchi di testo".
4. Un "blocco di testo" è un testo breve di circa 300 lettere.
5. Per le ricerce che restituiscono risultati semanticamente simili deve essere valutato il significato del testo.

## TOOL A DISPOSIZIONE:
Per avere informazioni devi usare i tool:
- "get_all_index": restituisce una lista di "titoli" o brevi descrizioni di tutti i "blocchi di testo" nei "capitoli" per ogni "documento".
- "search_single_word": restituisce una lista completa di tutti i "blocco di testo" che contengono esattamente la singola parola o frase.
- "search_block_of_text": restituisce un limitato numero di "blocchi di testo" semanticamente simili alla "query".
- "search_chapter": restituisce un limitatissimo numero di "capitoli" semanticamente simili alla "query".
- "get_specific_chapter": per cercare un singolo capitolo specifico attraverso il suo ID.

## STRATEGIA:
1. Se vuoi avere la lista dei "titoli" degli argomenti conosciuti 
allora puoi usare "get_all_index" per avere un indice generico di tutti i "blocchi di testo" nei "capitoli" nei "documenti".
2. Se vuoi informazioni attrverso una domanda, descrizione o frase generica che restituisca "blocchi di testo" semanticamente simili
allora usa il tool "search_block_of_text" per cercare "blocchi di testo" semanticamente simili alla "query" e per avere informazioni utili.
3. In alcuni casi è utile cercare direttamente una parola o frase precisa per ricavare tutti i "blocchi di testo" che la contengono (come per esempio un nome, un soggetto, un argomento, un concetto, etc) 
allora usa il tool "search_single_word" per recuperare i "blocchi di testo". 
4. Se vuoi informazioni più ampie su un "blocco di testo" e conosci #ID_CHAPTER da dove è stato estratto
allora puoi usare "get_specific_chapter" per avere l'intero "capitolo" cioè un contesto più ampio dove cercre informazioni utili.
5. Se vuoi informazioni e vuoi una risposta con un contesto più ampio attraverso una domanda, frase, descrizione 
allora puoi usare "search_chapter" per avere un contesto piu' ampio.
6. Combina queste strategie tra di loro per raggiungere il tuo obiettivo.

## ESEMPIO 1
- Hai una base dati di ricette di cucina.
- Devi cercare tutte le ricette che contengono più ingredienti conosciuti, per esempio "zucchero" e "latte".
- Cerca ogni singolo ingrediente come "parola" con "search_single_word" per ricavare i "blocchi di testo" che contengono quell'ingrediente.
(tieni conto che l'ingrediente potrebbe essere scritto in modo diverso, plurale, singolare, con errori di battitura, etc)
- Leggi i "blocchi di testo" e cerca di capire la ricetta.
- Se hai bisogno di un contesto più ampio puoi usare #ID_CHAPTER e "get_specific_chapter" per avere il "capitolo" completo.
- Memorizza le ricette che contengono gli ingredienti cercati.

## ESEMPIO 2
- Hai una base dati di fornitori.
- Devi conoscere tutti i paesi in cui operano dai fornitori. Per esempio per il fornitore "Datapizza".
- Con "search_block_of_text" fai una domanda generica "Paesi serviti da Datapizza?"
- Leggi i risultati e cerca di capire quali sono i paesi serviti.

## ESEMPIO 3
- Hai una base dati di romanzi.
- Devi cercare un libro che parli di quando Jade per la prima volta è andata in India al prto di Mumbai.
- Con "search_chapter" fai una domanda generica "Jade in India al porto di Mumbai"

## ESEMPIO 4
- Hai una base dati di history di chat.
- Devi cercare cosa pensa Jade del repartlo vendite.
- Con "search_block_of_text" fai la domanda "cosa pensa Jade del reparto vendite?"
- Leggi i risultati e cerca di capire il significato.
- Se hai bisogno di un contesto più ampio puoi usare "get_specific_chapter" per avere il "capitolo" completo.

## ESEMPIO 5
- Hai una base dati che riguarda la chimica.
- Devi conoscere la lista delle reazioni trattate nell base dati.
- Con "get_all_index" puoi ricavare una lista di "titoli" e con questi creare una lista delle sole reazioni chimiche.
- Se un "titolo" è troppo generico puoi usare parte del "titolo" con i tools "search_single_word" o "search_block_of_text" o "search_chapter" per avere un contesto più ampio.
`,
			tools: this.getTools(),
			paragraphLimit: 4,
			captherLimit: 2,
		}
	}
	// 2. Se vuoi informazioni e la "query" è una frase generica, una domanda o una descrizione 
	// allora usa il tool "search_block_of_text" per cercare "blocchi di testo" semanticamente simili alla "query" e per avere informazioni utili.

	getTools(): ToolSet {

		const search_chapter: Tool = tool({
			description: `Attraverso la frase di "query" recupera dei "capitoli" 
I "capitoli" sono un testo abbastanza lungo che riguarda un argomento. 
I "capitoli" sono composti da "blocchi di testo".
`,
			parameters: z.object({
				query: z.string().describe("Il testo che permette la ricerca di informazioni per similitudine su un vector db"),
			}),
			execute: async ({ query }) => {
				//const results: NodeDoc[] = (await queryDBChapter(query, "kb_pizza")).slice(0, 3)
				const options = this.options as AgentFinderOptions
				const results: NodeDoc[] = await vectorDBSearch(query, this.tableName, options.captherLimit, DOC_TYPE.CHAPTER, this.refs)
				if (results.length == 0) return "Nessun risultato"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const search_block_of_text: Tool = tool({
			description: `Attraverso la frase di "query" recupera un breve "blocco di testo".
Da sapere: i "blocchi di testo" compongono un "capitolo".
`,
			parameters: z.object({
				query: z.string().describe("Il testo che permette la ricerca di informazioni per similitudine su un vector db"),
			}),
			execute: async ({ query }) => {
				const options = this.options as AgentFinderOptions
				const results: NodeDoc[] = await vectorDBSearch(query, this.tableName, options.paragraphLimit, DOC_TYPE.PARAGRAPH, this.refs)
				if (results.length == 0) return "Nessun risultato"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			},
		})

		const search_single_word: Tool = tool({
			description: `Cerca puntualmente una singola parola o una frase 
e restituisce il "blocco di testo" che la contiene.
`,
			parameters: z.object({
				query: z.string().describe("Il testo da cercare su tutti i 'blocchi di testo'"),
			}),
			execute: async ({ query }) => {
				const results: NodeDoc[] = await wordDBSearch(query, this.tableName, 100, DOC_TYPE.PARAGRAPH)
				if (results.length == 0) return "Nessun risultato"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const get_specific_chapter: Tool = tool({
			description: `Restituisce uno specifico capitolo cercando il suo ID.`,
			parameters: z.object({
				id: z.string().describe("l'id di tipo uuid del capitolo"),
			}),
			execute: async ({ id }) => {
				const result: NodeDoc = await getItemById(id, this.tableName)
				if (!result) return "Nessun risultato"
				return nodeToString(result)
			}
		})

		const get_all_index: Tool = tool({
			description:
				`Restituisce una lista dei documenti memorizzati e, per ogni documento, un indice dei titoli dei capitoli.`,
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