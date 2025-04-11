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

	protected getStrategyTools(): string {
//		return ""
		return `## Strategia per usare i tools di ricerca
1. Se hai una parola o frase precisa (per esempio un nome, un soggetto, un argomento, un concetto, etc)
e la vuoi cercare su tutto il "documento" allora usa il tool "search_single_word" per recuperare i "blocchi di testo" che contengono quela parola o frase. 
2. Se vuoi "blocchi di testo" attraverso una domanda, descrizione o frase generica
allora usa il tool "search_block_of_text" per cercare "blocchi di testo" semanticamente simili alla "query".
3. Se vuoi subito informazioni generali attraverso una domanda, frase, descrizione 
allora usa "search_chapter" per recuperare una serie di "capitoli" semanticamente simili alla "query".
4. Se hai #ID_CHAPTER e vuoi accedere ad un contesto piu' ampio 
allora usa "get_specific_chapter" per ricevere lo specifico "capitolo" attraverso il suo ID.
5. Se vuoi avere la lista dei "titoli" degli argomenti conosciuti 
allora usa "get_all_index" per avere un indice generico di tutti i "blocchi di testo" nei "capitoli" nei "documenti".
- Usa lo stesso linguaggio dei "documenti" per le query.
- Combina queste strategie tra di loro per raggiungere il tuo obiettivo.
`
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
		return `## ESEMPI
### ESEMPIO 1
- Hai una base dati di ricette di cucina.
- Devi cercare tutte le ricette che contengono più ingredienti conosciuti, per esempio "zucchero" e "latte".
- Cerca ogni singolo ingrediente come "parola" con "search_single_word" per ricavare i "blocchi di testo" che contengono quell'ingrediente.
(tieni conto che l'ingrediente potrebbe essere scritto in modo diverso, plurale, singolare, con errori di battitura, etc)
- Leggi i "blocchi di testo" e cerca di capire la ricetta.
- Se hai bisogno di un contesto più ampio puoi usare #ID_CHAPTER e "get_specific_chapter" per avere il "capitolo" completo.
- Memorizza le ricette che contengono gli ingredienti cercati.

### ESEMPIO 2
- Hai una base dati di fornitori.
- Devi conoscere tutti i paesi in cui operano dai fornitori. Per esempio per il fornitore "Datapizza".
- Con "search_block_of_text" fai una domanda generica "Paesi serviti da Datapizza?"
- Leggi i risultati e cerca di capire quali sono i paesi serviti.

### ESEMPIO 3
- Hai una base dati di romanzi.
- Devi cercare un libro che parli di quando Jade per la prima volta è andata in India al prto di Mumbai.
- Con "search_chapter" fai una domanda generica "Jade in India al porto di Mumbai"

### ESEMPIO 4
- Hai una base dati di history di chat.
- Devi cercare cosa pensa Jade del repartlo vendite.
- Con "search_block_of_text" fai la domanda "cosa pensa Jade del reparto vendite?"
- Leggi i risultati e cerca di capire il significato.
- Se hai bisogno di un contesto più ampio puoi usare "get_specific_chapter" per avere il "capitolo" completo.

### ESEMPIO 5
- Hai una base dati che riguarda la chimica.
- Devi conoscere la lista delle reazioni trattate nell base dati.
- Con "get_all_index" puoi ricavare una lista di "titoli" e con questi creare una lista delle sole reazioni chimiche.
- Se un "titolo" è troppo generico puoi usare parte del "titolo" con i tools "search_single_word" o "search_block_of_text" o "search_chapter" per avere un contesto più ampio.
`
	}

	protected getContext(): string {
		return `## TIENI CONTO CHE:
1. Un "documento" è un insieme di "capitoli".
2. Un "capitolo" è un testo abbastanza lungo che riguarda un argomento.
3. Un "capitolo" è composto da più "blocchi di testo".
4. Un "blocco di testo" è un testo breve di circa 300 lettere.
5. Per le ricerce che restituiscono risultati semanticamente simili deve essere valutato il significato del testo.

${super.getContext()}
`
	}

	getTools(): ToolSet {

		const search_chapter: Tool = tool({
			description: `Restituisce un limitatissimo numero di "capitoli" semanticamente simili alla "query".
I "capitoli" sono un testo abbastanza lungo che riguarda un singolo argomento. 
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
			description: `Restituisce un limitato numero di "blocchi di testo" semanticamente simili alla "query".
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
			description: `Restituisce una lista completa di tutti i "blochi di testo" che contengono esattamente una singola parola o frase.
Tieni presente che:
- Se la parola è una parola molto comune o generica restituirà troppi "blocchi di testo". Una strategia è di usare "search_block_of_text".
- Se è una frase è molto specifica o lunga potrebbe non restituire il "blocco di testo" utile". Una strategia è di spezzare una frase troppo lunga
`,
			parameters: z.object({
				word: z.string().describe("La parola o frase da cercare su tutti i 'blocchi di testo'"),
			}),
			execute: async ({ word }) => {
				const results: NodeDoc[] = await wordDBSearch(word, this.tableName, 100, DOC_TYPE.PARAGRAPH)
				if (results.length == 0) return "Nessun risultato"
				let response = ""
				for (const result of results) {
					response += nodeToString(result)
				}
				return response
			}
		})

		const get_specific_chapter: Tool = tool({
			description: `Restituisce uno specifico "capitolo" attraverso il suo ID.`,
			parameters: z.object({
				id: z.string().describe("l'ID del capitolo"),
			}),
			execute: async ({ id }) => {
				const result: NodeDoc = await getItemById(id, this.tableName)
				if (!result) return "Nessun risultato"
				return nodeToString(result)
			}
		})

		const get_all_index: Tool = tool({
			description:
				`Restituisce una lista di "titoli" o brevi descrizioni di tutti i "blocchi di testo" nei "capitoli" per ogni "documento".`,
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

		return { search_chapter, search_block_of_text, search_single_word, get_specific_chapter, /*get_all_index*/ }
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