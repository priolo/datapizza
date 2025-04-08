import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
import { ChapterStruct } from "./types.js";
import { generateObject, generateText } from 'ai';
import { z } from 'zod'; // Added Zod import
dotenv.config();

const blockDef = "block of text"
const blockDef2 = "blocks of text"
const openingDef = "opening words"
const documentDef = "document"
const wordsNumDef = "5"



export async function textCutterChapter(text: string): Promise<ChapterStruct[]> {

	const systemPrompt = `
Split the ${documentDef} into list of smaller ${blockDef2}.
These individual ${blockDef2} follow the following rules:
- The meaning of the single ${blockDef} refers to a single specific topic. For example, a single character, place, concept, or event.
- The length of the ${blockDef} MUST be less than 400 words
- The ${blockDef} has more than 100 words.
- A single ${blockDef} is understandable even on its own
- A single ${blockDef} does not overlap with other ${blockDef2}
- Without cuts in the middle of sentences

The list of smaller ${blockDef2} sorted by their position in the ${documentDef}.
- The list is in the same order as the position of the ${blockDef2} relative to the entire ${documentDef}.

The ${documentDef} is:
${text}
`
	const model = google('gemini-2.0-flash')
	const r = await generateObject({
		model,
		temperature: 0,
		system: systemPrompt,
		output: "array",
		schema: blockSchema,
		prompt: systemPrompt,
	})
	return r.object as ChapterStruct[]
}

const blockSchema = z.object({
	opening_words: z.string().describe(`
It is a string containing the first ${wordsNumDef} initial ${openingDef} of the single ${blockDef}.
- The ${wordsNumDef} words must be exactly the same sequence of words.
- The words must be AT LEAST ${wordsNumDef}.
For example in this ${blockDef}:
"The Territorial Force was a part-time volunteer component of the British Army, created in 1908 to augment British land forces without resorting to conscription."
The correct answer is:
"The Territorial Force was a"
`),
	title: z.string().optional().describe(`A short description of the ${blockDef}.`)
})
