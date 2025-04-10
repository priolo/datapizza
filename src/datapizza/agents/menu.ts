import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_dish_list, get_location_list, get_locations_distance } from "./tools.js"



export async function buildMenuAgent() {
	const agent = new AgentFinder(
		"MENU",
		{
			howAreYouPrompt: `Sei un agente che risponde a domande su: ristoranti, chef, ricette, ingredienti, skill, tecniche di preparazione.`,
			contextPrompt: `Tieni presente che:
- Ogni pianeta ha un ristorante
- Ogni ristornate ha una descrizione
- Ogni ristorante ha uno chef
- Ogni chef ha delle abilità e licenze
- Ogni ristorante ha un menu
- Ogni menu ha una serie di ricette
- Ogni ricetta ha una descrizione
- Ogni ricetta ha una tecnica di preparazione
- Ogni ricetta ha una lista di ingredienti
	`,
			tableName: "kb_pizza_menu",
			tools: {
				"get_locations_list": get_location_list,
				"get_dish_list": get_dish_list,
			},
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

