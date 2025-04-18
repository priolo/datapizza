import Agent from "../../core/llm/Agent.js"
import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance, get_resturant_distances } from "./tools.js"



export async function buildMenuAgent() {

	const ingPreAgent = await buildIngredientsPreparationsAgent()
	const recipesAgent = await buildRecipesAgent()

	const agent = new Agent(
		"MENU",
		{
			descriptionPrompt: `Agente che risponde a domande su: ricette, ingredienti e tecniche di preparazione`,
			agents: [ingPreAgent, recipesAgent],
			clearOnResponse: false,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildRecipesAgent() {
	const agent = new AgentFinder(
		"RECIPE-BY-INGREDIENTS-PREPARATION",
		{
			descriptionPrompt: `Agente che 
ACCETTA: i nomi degli ingredienti o delle tecniche di preparazione. Puoi fare anche combinazioni di ingredienti o preparazioni con inclusioni o esclusioni.
RESTITUISCE: tutte le ricette con la lista degli ingredienti e le tecniche di preparazione usate.
FORMATO DELLA RISPOSTA: è una lista di ricette trovate:
RECIPE NAME: <nome ricetta>
	- INGREDIENTS: <lista ingredienti>
	- TECHNIQUES: <lista tecniche di preparazione>
---
`,
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildIngredientsPreparationsAgent() {
	const agent = new AgentFinder(
		"INGREDIENTS-PREPARATION-BY-RECIPE",
		{
			//descriptionPrompt: `Agente restituisce tutti gli ingredienti o tutte le tecniche di preparazione di una ricetta specificata.`,
			descriptionPrompt: `Agente che 
ACCETTA: dei nomi di ricette.
RESTITUISCE: per ogni ricetta restituisce tutti gli ingredienti e tutte le tecniche di preparazione.
FORMATO DELLA RISPOSTA: è una lista di ricette:
RECIPE NAME: <nome ricetta>
	- INGREDIENTS: <lista ingredienti>
	- TECHNIQUES: <lista tecniche di preparazione>
---`,
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildResturantsAgent() {
	const agent = new AgentFinder(
		"RESTURANTS",
		{
			descriptionPrompt: `Agente esperto di ristoranti.
ACCETTA: il nome di un ristorante.
RESTITUISCE: lo chef che ci lavora, la lista di ricette servite e le preparazioni.
FORMATO DELLA RISPOSTA: dettaglio del ristorante cercato:
# RESTAURANT NAME: <nome ristorante>
# CHEF: <nome chef>
# RECIPE NAME: <nome ricetta>
	- INGREDIENTS: <lista ingredienti>
	- TECHNIQUES: <lista tecniche di preparazione>
...
`,
			contextPrompt: `## PER CERCARE UN RISTORANTE:
- Cerca il nome del ristorante con il tool "search_chapter_with_words"
- Se trova qualcosa individua il riferimento al documento (#DOCUMENT)
- Usa il riferimento #DOCUMENT con il tool "search_document_with_ref" per ottenere TUTTO il documento che parla del ristorante.
`,
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			searchDocEnabled: true,
			maxCycles: 30,
			// tools: {
			// 	get_resturants_list,
            //     get_resturant_distances,
			// }
		}
	)
	await agent.build()
	return agent
}