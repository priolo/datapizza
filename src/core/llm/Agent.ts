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
	/** Descrive l'agent nel tool */
	descriptionPrompt?: string
	contextPrompt?: string


	tools?: ToolSet
	agents?: Agent[]
	/** distruggi history quando ha risposto */
	clearOnResponse?: boolean
	/** non chiedere al parent */
	noAskForInformation?: boolean
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
				description: `Ask agent ${agent.name} for info.\n${agent.options.descriptionPrompt ?? ""}\n${agent.options.contextPrompt ?? ""}`,
				parameters: z.object({
					question: z.string().describe("The question to ask the agent"),
					reason: z.string().describe("Specify the main reason for the question so that the agent can find optimized solutions.").optional(),
				}),
				execute: async ({ question, reason }) => {
					colorPrint([this.name, ColorType.Blue], " : chat_with : ",
						[agent.name, ColorType.Blue], " : ",
						[question, ColorType.Green], " : ", [reason, ColorType.Green]
					)
					const prompt = reason?.length > 0 ? "My goal is:\n" + reason + "\nAnswer this question:\n" + question : question
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

		if (this.history.length == 0) {
			prompt = this.getContextPrompt() + "\n\nPlease solve the following problem using reasoning and the available tools:\n" + prompt
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

		colorPrint([this.name, ColorType.Blue], " : ", ["failure", ColorType.Red])
		if (this.options.clearOnResponse) this.kill()
		return {
			text: "I can't answer because the question is too complex.",
			type: RESPONSE_TYPE.FAILURE
		}
	}

	/** elimina la history */
	kill() {
		this.history = []
		colorPrint([this.name, ColorType.Blue], " : ", ["killed", ColorType.Red])
		this.options.agents.forEach(agent => agent.kill())
	}

	protected getOptions(): AgentOptions {
		return {
			descriptionPrompt: "",
			contextPrompt: "",
			tools: {},
			agents: [],
			clearOnResponse: false,
			maxCycles: 30,
		}
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


	// PROMPTS

	//#region SYSTEM PROMPT

	/** System instructions for ReAct agent  */
	protected getReactSystemPrompt(): string {
		const process = `# You are a ReAct agent that solves problems by thinking step by step.

## MAIN STRATEGY:
- Keep the focus on the main problem and the tools at your disposal
- Break the main problem into smaller problems (steps)
- Create a list of steps to follow to solve the main problem call the tool "update_strategy"
- The steps are designed to minimize the tools used.

${this.getRulesPrompt()}

Always be explicit in your reasoning. Break down complex problems into steps.
`;
		return process
	}


	protected getRulesPrompt(): string {
		const rules = []

		rules.push(`THOUGHT: Analyze the step problem and think about how to solve it.`)

		if (!this.options.noAskForInformation) {
			rules.push(`REQUEST INFORMATION: If you can't get information from the tools or you have doubts or think you can optimize your search, call the "ask_for_information" tool to ask for more information.`)
		}

		if ( this.options.agents?.length > 0 ) {
			rules.push(`ACTION: First use "chat_with_<agent_name>" if the agent can help you otherwise choose another available tool.`)
		} else {
			rules.push(`ACTION: Choose one of the available tools to solve the problem.`)
		}

		const strategyTools = this.getToolsStrategyPrompt()
		if (strategyTools.length > 0) {
			rules.push(`TOOLS USAGE: Preferably use this strategy to call the tools:\n${strategyTools}`)
		}

		rules.push(`OBSERVATION: Get the result of the tool and use it to process the answer`)

		// update strategy
		// 		rules.push(`Update the strategy:
		// If you have completed the step examined, move on to the next one.
		// If you have not succeeded, try updating the strategy list by returning to the previous steps and trying again. call the tool "update_strategy"`)

		rules.push(`LOOP: Repeat rules 1-${rules.length} until you can provide a final answer`)

		rules.push(`FINAL ANSWER: When ready, use the "final_answer" tool to provide your solution.`)

		const rulesPrompt = rules.map((r, i) => `${i + 1}. ${r}`).join("\n")

		return `### SO FOLLOW THESE RULES:\n${rulesPrompt}`
 
	}

	protected getToolsStrategyPrompt(): string {
		return ""
	}

	//#endregion SYSTEM PROMPT

	protected getContextPrompt(): string {
		return this.options.contextPrompt ?? ""
	}

}

export default Agent
