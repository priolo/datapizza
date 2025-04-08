import readline from 'readline';
import { buildLeadAgent } from "./agents/leader.js";



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

chat()