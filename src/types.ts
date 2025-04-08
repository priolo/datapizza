
export type NodeDoc = {
	uuid?: string;
	parent?: string;
	

	text: string;
	ref?: string;
	type?: DOC_TYPE;

	vector: number[];
	//_distance?: number;
}

export enum DOC_TYPE {
	INDEX = "index",
	CHAPTER = "chapter",
	PARAGRAPH = "paragraph",
}
