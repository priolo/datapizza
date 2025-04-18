
export type NodeDoc = {
	uuid?: string;
	parent?: string;
	ref?: string;

	text: string;
	type?: DOC_TYPE;
	vector: number[];
}

export enum DOC_TYPE {
	INDEX = "index",
	CHAPTER = "chapter",
	PARAGRAPH = "paragraph",
}
