import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildMenuAgent() {

	//const recipeAgent = await buildRecipeAgent()

	const agent = new AgentFinder(
		"MENU",
		{
			descriptionPrompt: `Agente che risponde a domande principalmente ricette, ingredienti, tecniche di preparazione, ristoranti, chef, skill.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una tecnica di preparazione
- Ogni ristorante ha una serie di ricette
- Ogni ristorante ha uno chef
- Ogni chef ha delle abilità e licenze
`,
			tableName: "kb_pizza_menu",
			tools: {
				"get_locations_list": get_resturants_list,
				"get_recipes_list": get_recipes_list,
			},
			//agents: [recipeAgent],
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildIngPreAgent() {
	const agent = new AgentFinder(
		"INGREDIENTE-PREPARAZIONE",
		{
			descriptionPrompt: `Agente che in base ad una tecnica di preparazione o un ingrediente recupera le ricette che li contengono.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione

## STRATEGIA
1. cerca i blocchi di testo con l'ingrediente o la tecnica di preparazione (preiligi la ricerca "search_single_word")
2. allarga il contesto cercando i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione
3. quindi cerca di capire qual'è il nome della ricetta che contiene l'ingrediente o la tecnica di preparazione
`,
			tableName: "kb_pizza_menu",
			tools: {
				"get_recipes_list": get_recipes_list,
			},
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}


export async function buildRecipeAgent() {
	const agent = new AgentFinder(
		"RICETTA",
		{
			descriptionPrompt: `Agente che data una ricetta sa dirti se contiene degli ingredienti o è realizzata con delle tecniche di preparazione.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione

## STRATEGIA
1. Cerca i blocchi di testo con il nome della ricetta (preiligi la ricerca "search_single_word")
2. Cerca di capire se hai abbastanza contesto per trovare le tue informazioni
3. Ce non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione
`,
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}