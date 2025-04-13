import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildMenuAgent() {

	//const recipeAgent = await buildRecipeAgent()

	const agent = new AgentFinder(
		"MENU",
		{
			descriptionPrompt: `Agente che risponde a domande generiche principalmente su: ricette, ingredienti, tecniche di preparazione, ristoranti, chef, skill.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una tecnica di preparazione
- Ogni ristorante ha una serie di ricette
- Ogni ristorante ha uno chef
- Ogni chef ha delle abilità e licenze

## STRATEGIA
1. Cerca i blocchi di testo le informazioni a tua disposizione (prediligi la ricerca "search_single_word")
2. Cerca di capire se hai abbastanza contesto per trovare le tue informazioni
3. Se non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione
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

export async function buildRecipeByIngredient() {
	const agent = new AgentFinder(
		"RECIPE-BY-INGREDIENTS-PREPARATION",
		{
			//descriptionPrompt: `Agente che in base a tecniche di preparazione o ingredienti recupera le ricette che li contengono.`,
			descriptionPrompt: `Agente che restituisce tutte le ricette che contengono gli ingredienti o le tecniche di preparazione specificati.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione

## STRATEGIA
1. Cerca i blocchi di testo con gli ingredienti o la tecniche di preparazione (prediligi la ricerca "search_single_word").
2. Cerca di capire se hai abbastanza contesto per trovare i nomi delle ricette.
3. Se non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione.
`,

			tableName: "kb_pizza_menu",
			// tools: {
			// 	"get_recipes_list": get_recipes_list,
			// },
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}


export async function buildRecipeAgent() {
	const agent = new AgentFinder(
		"INGREDIENTS-PREPARATION-BY-RECIPE",
		{
			//descriptionPrompt: `Agente che data una ricetta o ricette sa dirti quali ingredienti contiene oppure con quali tecniche di preparazione è stata realizzata.`,
			descriptionPrompt: `Agente restituisce tutte le tecniche di preparazione o tutti gli ingredienti di una o piu' ricette.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione

## STRATEGIA
1. Cerca i blocchi di testo con i nomi delle ricette (prediligi la ricerca "search_single_word").
2. Cerca di capire se hai abbastanza contesto per trovare i nomi degli ingredienti o tecniche di preparazione.
3. Se non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione.

`,

			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}