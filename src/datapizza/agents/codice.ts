import AgentFinder from "../../core/llm/AgentFinder.js"



export async function buildCodiceAgent() {
	const agent = new AgentFinder(
		"CODICE",
		{ 
			description: `Sei un agente che risponde a domande sul Codice Galattico.
sono regole per la sucurezza alimentare che riguardano:
- Ordini
- Sostanze regolamentate
- Licenze e Tecniche di Preparazione 
- Sansioni e Pene
`,
			tableName: "kb_pizza_code",
			clearOnResponse: true,
			maxCycles: 30,
		},
	)
	await agent.build()
	return agent
}



