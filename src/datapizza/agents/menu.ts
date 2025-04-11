import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildMenuAgent() {

	const recipeAgent = await buildRecipeAgent()

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
			agents: [recipeAgent],
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildRecipeAgent() {
	const agent = new AgentFinder(
		"RECIPE",
		{
			descriptionPrompt: `Agente che recupera ricette in base agli ingredienti`,
			contextPrompt: `## CONTESTO
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una tecnica di preparazione
- Ogni ristorante ha una serie di ricette

## STRATEGIA
1. cerca gli ingredienti nel documento
2. allarga il contesto cercando il capitolo
3. cerca di capire qual'e' il nome della ricetta

Sii preciso e non dare informazioni aggiuntive
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