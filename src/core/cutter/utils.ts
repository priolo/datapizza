export function breakWords(text: string, words: string[]): string[] {

	const indexesFind: number[] = []

	for (let i = 0; i < words.length; i++) {
		const word = words[i]
		const start = indexesFind.length > 0 ? indexesFind[indexesFind.length - 1] + 1 : 0
		let index = findIndex(text, word, start)
		if (index != -1) {
			indexesFind.push(index)
			continue
		}

		index = findIndexReverse(text, word, start)
		if (index == -1) continue

		indexesFind.pop()
		indexesFind.push(index)
		const tmp = words[i - 1]
		words[i - 1] = words[i]
		words[i] = tmp
		i--
	}

	indexesFind.sort((a, b) => a - b)
	let count = indexesFind[0] ?? 0
	const pieces: string[] = []
	for (let i = 1; i < indexesFind.length; i++) {
		const index = indexesFind[i]
		const chunk = text.slice(count, index)
		count = index
		pieces.push(chunk)
	}
	pieces.push(text.slice(count))

	// const pieces = words.reduce((acc, word) => {
	// 	let index = findIndex(text.toLowerCase(), word)
	// 	if (index == -1 || index == 0) return acc
	// 	acc.push(text.slice(0, index))

	// 	text = text.slice(index)
	// 	return acc
	// }, [])

	// pieces.push(text)
	return pieces
}

function findIndex(text: string, searchString: string, start: number): number {
	if (start == 6430) debugger
	const search = searchString.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
	text = text.toLowerCase()
	let searchIndex = 0
	let firstIndex = -1

	for (let i = start; i < text.length; i++) {
		const char = text[i]
		if (!isAlphanumeric(char)) continue
		if (char == search[searchIndex]) {
			if (searchIndex == 0) firstIndex = i
			searchIndex++
		} else {
			searchIndex = 0
			if (char == search[searchIndex]) {
				if (searchIndex == 0) firstIndex = i
				searchIndex++
			}
		}
		if (searchIndex == search.length) {
			return firstIndex
		}
	}
	return -1
}

function findIndexReverse(text: string, searchString: string, start: number): number {
	const search = searchString.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
	text = text.toLowerCase()
	const length = search.length
	let searchIndex = length
	let firstIndex = -1

	for (let i = start; i > 0; i--) {
		const char = text[i]
		if (!isAlphanumeric(char)) continue
		if (char == search[searchIndex - 1]) {
			if (searchIndex == length) firstIndex = i
			searchIndex--
		} else {
			searchIndex = length
			if (char == search[searchIndex]) {
				if (searchIndex == length) firstIndex = i
				searchIndex--
			}
		}
		if (searchIndex == 0) {
			return i
		}
	}
	return -1
}

function isAlphanumeric(char: string) {
	return /^[A-Za-z0-9]$/.test(char);
}



