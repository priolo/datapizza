import Agent from "../../core/llm/Agent.js"
import AgentFinder from "../../core/llm/AgentFinder.js"
import { get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildMenuAgent() {

	const ingPreAgent = await buildIngPreByRecipes()
	const recipesAgent = await buildRecipesByIngPre()

	const agent = new Agent(
		"MENU",
		{
			//descriptionPrompt: `Agente che risponde a domande su: ricette, ingredienti, tecniche di preparazione, ristoranti, chef, skill.`,
			descriptionPrompt: `Agente che risponde a domande su: ricette, ingredienti, tecniche di preparazione, ristoranti, chef, skill.`,
			agents: [ingPreAgent, recipesAgent],
			clearOnResponse: false,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

export async function buildRecipesByIngPre() {
	const agent = new AgentFinder(
		"RECIPE-BY-INGREDIENTS-PREPARATION",
		{
			//descriptionPrompt: `Agente che restituisce tutte le ricette che contengono gli ingredienti o le tecniche di preparazione specificati.`,
			descriptionPrompt: `Agente che 
ACCETTA: i nomi degli ingredienti o delle tecniche di preparazione 
RESTITUISCE: tutte le ricette con la lista degli ingredienti e le tecniche di preparazione usati.
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


export async function buildIngPreByRecipes() {
	const agent = new AgentFinder(
		"INGREDIENTS-PREPARATION-BY-RECIPE",
		{
			//descriptionPrompt: `Agente restituisce tutti gli ingredienti o tutte le tecniche di preparazione di una ricetta specificata.`,
			descriptionPrompt: `Agente che 
ACCETTA: dei nomi di ricette 
RESTITUISCE: per ogni ricetta accettata tutti gli ingredienti e tutte le tecniche di preparazione.
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