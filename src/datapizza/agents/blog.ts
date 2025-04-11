import AgentFinder from "../../core/llm/AgentFinder.js"



export async function buildBlogAgent() {
	const agent = new AgentFinder(
		"BLOG",
		{ 
			descriptionPrompt: "Sei un agente che risponde a domande sui blog che offrono pareri, considerazioni, critiche su ristoranti",
			tableName: "kb_pizza_blog",
			clearOnResponse: true,
			maxCycles: 30,
		},
	)
	await agent.build()
	return agent
}
