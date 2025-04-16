import AgentFinder from "../../core/llm/AgentFinder.js"



export async function buildManualeAgent() {
	const agent = new AgentFinder(
		"MANUALE",
		{
			descriptionPrompt: `Agente che 
ACCETTA: il nome di una tecnica di preparazione
RESTITUISCE: Come funziona, Vantaggi e Svantaggi`,
			contextPrompt: `## Il Manuale di Cucina contiene informazioni su:
1) Abilità e licenze.
Una serie di abilità e licenze che ogni chef può avere.
Ogni abilità ha:
- Un livello di abilità
- Una descrizione per ogni livello di cosa permette di fare
2) Ordini. 
Ogni ordine limita le ricette che possono usare in base a dele regole. 
Per esempio l'ordine della galassia di andromeda non permette di usare il latte e i suoi derivati.
3) Tecniche di preparazione. 
Ognuna di queste ha:
- Una descrizione di come funziona
- Descrizione dei vantaggi
- Descrizione degli svantaggi
4) Tecniche di cottura.
Ognuna di queste ha:
- Una descrizione di come funziona
- Descrizione dei vantaggi
- Descrizione degli svantaggi
5) Tecniche Avanzate
Ognuna di queste ha:
- Una descrizione di come funziona
- Descrizione dei vantaggi
- Descrizione degli svantaggi
`,
			tableName: "kb_pizza_manual",
			clearOnResponse: true,
			maxCycles: 30,
		},
	)
	await agent.build()
	return agent
}
