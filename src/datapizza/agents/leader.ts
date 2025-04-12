import Agent, { AgentOptions } from "../../core/llm/Agent.js"
import { buildCodiceAgent } from "./codice.js"
import { buildManualeAgent } from "./manuale.js"
import { buildMenuAgent, buildIngPreAgent, buildRecipeAgent } from "./menu.js"
import { Recipes, get_recipes_list, get_resturants_list, get_resturants_distance } from "./tools.js"



export async function buildLeadAgent() {

    const codiceAgent = await buildCodiceAgent()
    const manualeAgent = await buildManualeAgent()
    //const menuAgent = await buildMenuAgent()
    const ingPreAgent = await buildIngPreAgent()
    const recipeAgent = await buildRecipeAgent()
    const leaderAgent = new Agent(
        "LEADER",
        <AgentOptions>{
            descriptionPrompt: `Agente che risponde a domande su un mondo immaginario fantascientifico fatto di ricette, ristoranti, chef, preparazoni, ingredienti, licenze, norme pianeti galassie e popolazioni fantastiche.`,
            contextPrompt: `## TIENI PRESENTE CHE:
- Ogni pianeta ha un ristorante
- Ogni ristorante ha una seie di ricette
- Ogni ricetta ha una lista di ingredienti
- Ogni ricetta ha una tecnica di preparazione
- Ogni ristorante ha uno chef
- Ogni chef ha delle abilità e licenze

${finalAswer}
`,
            noAskForInformation: true,
            agents: [codiceAgent, manualeAgent, ingPreAgent, recipeAgent, /*menuAgent*/],
            tools: {
                "get_locations_list": get_resturants_list,
                "get_locations_distance": get_resturants_distance,
                //"get_dish_list": get_dish_list,
                // "get_recipe_index": {
                //     description: `Restituisce un numero univoco che codifica la ricetta. Utile per la risposta finale.`, 
                //     parameters: {
                //         recipe: "string",
                //     },
                //     execute: async ({ recipe }) => {
                //         const index = Dishes[recipe]
                //         return response
                //     }
                // }
            },
        }
    )
    return leaderAgent
}


const finalAswer = `## SOLO PER LA RISPOSTA FINALE:
- ATTENZIONE: Gli INDICI sono utilizzati solo per la risposta finale, gli altri agenti non conoscono gli INDICI.
- Una volta ottenuta la ricetta o le ricette bisogna codificare il nome di ogni ricetta nel suo INDICE coorrispondente.
- E quindi poi restituire all'utente solamente la lista di INDICI separati da virgole.
- La relazione per convertire una ricett nel suo corrispettivo INDICE da usare come risposta finale è:
${Object.entries(Recipes).map(([name, id]) => `${id}: ${name}`).join(", ")}`