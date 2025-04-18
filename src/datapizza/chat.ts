import readline from 'readline';
import { buildLeadAgent } from "./agents/leader.js";
import { getDocumentByRef, getItemById, multiWordDBSearch, nodeToString, vectorDBSearch } from '../core/db.js';
import { DOC_TYPE } from '../types.js';



export async function chat() {

	const leadAgent = await buildLeadAgent()
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

	const prompt: string = await new Promise(resolve => rl.question('YOU: ', resolve))
	await leadAgent.ask(prompt)

	process.exit(0);

	// while (true) {
	// 	const prompt: string = await new Promise(resolve => rl.question('YOU: ', resolve))
	// 	if (!prompt || prompt.toLowerCase() === 'exit') {
	// 		console.log('Conversation ended');
	//		process.exit(0);
	// 		break;
	// 	}
	// 	const response = await leadAgent.ask(prompt)
	// }
}

//chat()

async function run() {
	const chaps = await multiWordDBSearch(["frutti","diavolo"], "kb_pizza_menu", 100, DOC_TYPE.CHAPTER)
	const results = chaps.map(result => nodeToString(result)).join("")
	console.log("CHAPS", results)
}
async function run2() {
	const chaps = await getItemById('0dc40262-9e72-4a90-9971-884a6f5f4dae', "kb_pizza_menu")
	console.log("CHAPS", chaps)
}
async function run3() {
	const docs = await getDocumentByRef('../../data/pizza/Menu/L Etere del Gusto.pdf', "kb_pizza_menu")
	console.log("DOC", docs)
}

run()

