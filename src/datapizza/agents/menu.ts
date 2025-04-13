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

export async function buildIngPreAgent() {
	const agent = new AgentFinder(
		"INGREDIENTI-PREPARAZIONI",
		{
			descriptionPrompt: `Agente che in base a tecniche di preparazione o ingredienti recupera le ricette che li contengono.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione
`,
// ## STRATEGIA
// 1. Cerca i blocchi di testo con gli ingredienti o la tecniche di preparazione (prediligi la ricerca "search_single_word").
// 2. Cerca di capire se hai abbastanza contesto per trovare il nome della ricetta.
// 3. Se non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione.
// `,
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
		"RICETTA",
		{
			descriptionPrompt: `Agente che data una ricetta o ricette sa dirti quali ingredienti contiene oppure con quali tecniche di preparazione è stata realizzata.`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha un nome
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una lista di tecniche di preparazione
`,
// ## STRATEGIA
// 1. Cerca i blocchi di testo con il nome della ricetta o ricette (prediligi la ricerca "search_single_word")
// 2. Cerca di capire se hai abbastanza contesto per trovare gli ingredienti o le tecniche di preparazione
// 3. Se non hai abbastanza contesto cerca i capitoli corrispondenti tramite #ID_CHAPTER che hai a disposizione
// `,
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}