import AgentFinder from "../../core/llm/AgentFinder.js"



export async function buildCodiceAgent() {
	const agent = new AgentFinder(
		"CODICE",
		{ 
			description: `Sei un agente che risponde a domande sul Codice Galattico come per esempio:
 licenze, definizioni, ingredienti, regolamenti, norme, leggi, abitudini, etc etc`,
			tableName: "kb_pizza_code",
			clearOnResponse: true,
			maxCycles: 30,
		},
	)
	await agent.build()
	return agent
}



