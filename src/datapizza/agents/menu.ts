import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildMenuAgent() {
	const agent = new AgentFinder(
		"MENU",
		{
			howAreYouPrompt: `Sei un agente che risponde a domande principalmente ricette, ingredienti, tecniche di preparazione, ristoranti, chef, skill.`,
			contextPrompt: `## Tieni presente che:
- Ogni ricetta ha una lista di ingredienti
- Se hai un ingrediente e vuoi il nome della sua ricetta devi cercare il contesto superiore (capitolo)
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
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

