import AgentFinder from "../../core/llm/AgentFinder.js"



export async function buildMenuAgent() {
	const agent = new AgentFinder(
		"MENU",
		{
			description: "Sei un agente che risponde a domande sui: menu, i piatti e gli ingredienti, i ristoranti e i loro chef e tecniche di preparazione.",
			tableName: "kb_pizza_menu",
			clearOnResponse: true,
			maxCycles: 30,
		}
	)
	await agent.build()
	return agent
}

