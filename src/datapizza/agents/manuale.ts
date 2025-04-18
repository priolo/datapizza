import AgentFinder from "../../core/llm/AgentFinder.js"





export async function buildManualeAbilitaLicenzeAgent() {
	const agent = new AgentFinder(
		"MANUALE-ABILITA-LICENZE",
		{
			descriptionPrompt: `Agente che 
ACCETTA: domande su: abilità, licenze, ordini, tecniche di preparazione, tecniche di cottura e tecniche avanzate
RESTITUISCE: il dettaglio dell'entità richiesta secodno questo schema:
1. ABILITÀ E LICENZE: Una serie di abilità e licenze che ogni chef può avere. Ogni abilità ha:
- Un livello di abilità
- Una descrizione per ogni livello di cosa permette di fare
2. ORDINI. Ogni ordine limita le ricette che possono usare in base a dele regole. Per esempio l'ordine della galassia di andromeda non permette di usare il latte e i suoi derivati.
3. TECNICHE DI PREPARAZIONE. Ognuna di queste ha:
- Una descrizione di come funziona
- Descrizione dei vantaggi
- Descrizione degli svantaggi
4. TECNICHE DI COTTURA. Ognuna di queste ha:
- Una descrizione di come funziona
- Descrizione dei vantaggi
- Descrizione degli svantaggi
5. TECNICHE AVANZATE. Ognuna di queste ha:
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


