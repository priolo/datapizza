import { google } from '@ai-sdk/google';
import { mistral } from "@ai-sdk/mistral"
import { CoreMessage, generateText, tool, ToolSet } from "ai";
import dotenv from 'dotenv';
import { z } from "zod";
import { colorPrint, ColorType } from '../../utils.js';
dotenv.config();



//const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

//type FunctionsSets = { [key: string]: (args: any) => Promise<string> }

export enum RESPONSE_TYPE {
	SUCCESS,
	FAILURE,
	REQUEST,
}

export interface Response {
	text: string
	type: RESPONSE_TYPE
}

export interface AgentOptions {
	/** per descrivere l'AGENT nel tool */
	//description?: string

	/** in aggiunta al system prompt ReAct */
	//systemPrompt?: string
	howAreYouPrompt?: string
	contextPrompt?: string


	tools?: ToolSet
	agents?: Agent[]
	/** distruggi history quando ha risposto */
	clearOnResponse?: boolean
	/** non chiedere al parent */
	noAskForInformation?: boolean
	/** non creare la strategia */
	noStrategy?: boolean
	/** numero massimo di cicli di reasoning */
	maxCycles?: number
}


/**
 * Co-ReAct agent that can solve problems by thinking step by step.
 * The agent can use a set of tools and functions to reason and solve tasks.
 * The agent can also interact with other agents to solve complex problems.
 * Can ask info from the parent agent 
 */
class Agent {
	constructor(
		public name: string,
		options: AgentOptions,
	) {
		const defaultOptions = this.getOptions() ?? {}
		this.options = {
			...defaultOptions,
			...options,
			tools: { ...defaultOptions.tools ?? {}, ...options.tools ?? {} },
			agents: [...defaultOptions.agents ?? [], ...options.agents ?? []],
		}

		this.model = google('gemini-2.0-flash')
		//this.model = mistral('mistral-large-latest')
		this.subagentTools = this.createSubAgentsTools(options.agents)
	}

	public parent: Agent | null = null
	private model = null
	private history: CoreMessage[] = []
	private subagentTools: ToolSet = {}
	protected options: AgentOptions = {}

	private createSubAgentsTools(agents: Agent[]) {
		if (!agents) return {}
		const structs = agents.reduce<ToolSet>((acc, agent) => {

			agent.parent = this

			acc[`chat_with_${agent.name}`] = tool({
				description: `AGENT NAME: ${agent.name}.\nDESCRIPTION: ${agent.options.howAreYouPrompt ?? ""}\n${agent.options.contextPrompt ?? ""}`,
				parameters: z.object({
					prompt: z.string().describe("The question to ask the agent"),
				}),
				execute: async ({ prompt }) => {
					colorPrint([this.name, ColorType.Blue], " : chat_with : ", [agent.name, ColorType.Blue], " : ", [prompt, ColorType.Green])
					const response = await agent.ask(prompt)
					if (response.type == RESPONSE_TYPE.REQUEST) {
						return `${agent.name} asks: ${response.text}`
					} else if (response.type == RESPONSE_TYPE.FAILURE) {
						return `${agent.name} failed to answer: ${response.text}`
					}
					return `${agent.name} result: ${response.text}`
				},
			})

			return acc
		}, {})
		return structs
	}

	async build() { }

	async ask(prompt: string): Promise<Response> {
		const systemTools = this.getSystemTools()
		const tools = { ...this.options.tools, ...this.subagentTools, ...systemTools }
		const systemPrompt = this.getReactSystemPrompt()

		// inserisco un prompt di initializzazione per l'AGENT
		if (this.history.length == 0) {
			this.history = [{
				role: "user",
				content: `${this.getContext()}

Please solve the following problem using reasoning and the available tools:`
			}]
		}
		this.history.push({ role: "user", content: `${prompt}` })

		// LOOP
		for (let i = 0; i < this.options.maxCycles; i++) {

			// THINK
			const r = await generateText({
				model: this.model,
				temperature: 0,
				system: systemPrompt,
				messages: this.history,
				//toolChoice: !this.parent? "auto": "required",
				//toolChoice: this.history.length > 2 && !!this.parent ? "auto" : "required",
				toolChoice: "required",
				tools,
				maxSteps: 1,
			})

			this.history.push(...r.response.messages)

			const lastMessage = r.response.messages[r.response.messages.length - 1]

			if (lastMessage.role == "tool") {
				const content = lastMessage.content[0]
				const functionName = content.toolName
				const result = content.result as string

				// FINAL RESPONSE
				if (content.toolName == "final_answer") {
					colorPrint([this.name, ColorType.Blue], " : final answer: ", [result, ColorType.Green])
					this.options.agents.forEach(agent => agent.kill())
					if (this.options.clearOnResponse) this.kill()
					return <Response>{
						text: result,
						type: RESPONSE_TYPE.SUCCESS
					}
				}

				// COLLECT INFORMATION
				if (content.toolName == "ask_for_information") {
					colorPrint([this.name, ColorType.Blue], " : ask info: ", [result, ColorType.Green])
					return <Response>{
						text: result,
						type: RESPONSE_TYPE.REQUEST
					}
				}

				// ANOTHER TOOL
				if (functionName != "update_strategy" && !functionName.startsWith("chat_with_")) {
					const funArgs = this.history[this.history.length - 2]?.content[1]?.["args"]
					colorPrint([this.name, ColorType.Blue], " : function : ", [functionName, ColorType.Yellow], " : ", [JSON.stringify(funArgs), ColorType.Green])
					console.log(result)
				}

				// CONTINUE RAESONING
			} else {
				colorPrint([this.name, ColorType.Blue], " : reasoning : ", [JSON.stringify(lastMessage.content), ColorType.Magenta])
			}

			await new Promise(resolve => setTimeout(resolve, 5000)) // wait 1 second
		}

		colorPrint(this.name, ColorType.Blue, " : ", ["failure", ColorType.Red])
		if (this.options.clearOnResponse) this.kill()
		return {
			text: "Couldn't reach a conclusion after maximum iterations.",
			type: RESPONSE_TYPE.FAILURE
		}
	}

	/** elimina la history */
	kill() {
		this.history = []
		colorPrint(this.name, ColorType.Blue, " : ", ["killed", ColorType.Red])
		this.options.agents.forEach(agent => agent.kill())
	}

	protected getOptions(): AgentOptions {
		return {
			howAreYouPrompt: "",
			contextPrompt: "",
			tools: {},
			agents: [],
			clearOnResponse: false,
			maxCycles: 30,
		}
	}


	/** System instructions for ReAct agent  */
	protected getReactSystemPrompt(): string {
		const process = `# You are a ReAct agent that solves problems by thinking step by step.
## Strategy:
- Keep the focus on the main problem and the tools at your disposal
- Break the main problem into smaller problems (steps)
- The steps are designed to minimize the text used.
- Create a list of steps to follow to solve the main problem call the tool "update_strategy"
- Each step is independent from the following ones
- Each step could be dependent on the previous ones
${this.getRules()}
${this.getStrategyTools()}
${this.getExamples()}
Always be explicit in your reasoning. Break down complex problems into steps.
`;
		return process
	}

	protected getRules(): string {
		const rules = []

		rules.push(`Thought: Analyze the step problem and think about how to solve it.`)

		rules.push(`Action: Choose an action from the available tools or call another agent using the tool "chat_with_<agent_name>"`)

		// pre osservation
		if (!this.options.noAskForInformation) rules.push(`Request information: If you really can't get information from others tools call "ask_for_information" tools to ask for more information.`)

		// observation
		rules.push(`Observation: Get the result of the tool and use it to process the answer`)

		// update strategy
		rules.push(`Update the strategy:
If you have completed the step examined, move on to the next one.
If you have not succeeded, try updating the strategy list by returning to the previous steps and trying again. call the tool "update_strategy"`)

		// post osservation
		rules.push(`Repeat rules 1-${rules.length} until you can provide a final answer`)

		// conclusion
		rules.push(`When ready, use the "final_answer" tool to provide your solution.`)

		return `## Follow this rules:
${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}
`
	}

	protected getExamples(): string {
		return ""
	}

	protected getStrategyTools(): string {
		return ""
	}

	protected getContext(): string {
		return this.options.contextPrompt ?? ""
	}

	protected getSystemTools(): ToolSet {

		const tools = {
			final_answer: tool({
				description: "Provide the final answer to the problem",
				parameters: z.object({
					answer: z.string().describe("The complete, final answer to the problem"),
				}),
				execute: async ({ answer }) => {
					return answer
				}
			}),

			ask_for_information: tool({
				description: `You can use this procedure if you don't have enough information from the user.
For example: 
User: "give me the temperature where I am now". You: "where are you now?", User: "I am in Paris"
`,
				parameters: z.object({
					request: z.string().describe("The question to ask to get useful information.")
				}),
				execute: async ({ request }) => {
					return request
				}
			}),

			update_strategy: tool({
				description: "Set up a strategy consisting of a list of steps to follow to solve the main problem",
				parameters: z.object({
					strategy: z.string().describe("the strategy divided into a list of steps"),
				}),
				execute: async ({ strategy }) => {
					colorPrint([this.name, ColorType.Blue], " : update strategy", ["\n" + strategy, ColorType.Magenta])
					return strategy
				}
			}),
		}
		if (!!this.options.noAskForInformation) delete tools.ask_for_information
		return tools
	}
}

export default Agent


