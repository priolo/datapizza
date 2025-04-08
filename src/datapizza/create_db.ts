import { normalizeString } from '../utils.js';
import { importHTMLToText, importPDFToText, storeTextInDb } from "../core/decomposer.js";
import { deleteVectorDB } from '../core/db.js';



const pdfPaths = [
	"Anima Cosmica",
	"Armonia Universale",
	"Cosmica Essenza",
	//"Datapizza",
	"Eco di Pandora",
	"Eredita Galattica",
	"Essenza dell Infinito",
	"Il Firmamento",
	"L Architetto dell Universo",
	"L Eco dei Sapori",
	"L Equilibrio Quantico",
	"L Essenza Cosmica",
	"L Essenza del Multiverso su Pandora",
	//"L Essenza delle Dune",
	"L Essenza di Asgard",
	"L Etere del Gusto",
	"L infinito in un Boccone",
	"L Oasi delle Dune Stellari",
	"L Universo in Cucina",
	"Le Dimensioni del Gusto",
	"Le Stelle che Ballano",
	"Le Stelle Danzanti",
	"Ristorante delle Dune Stellari",
	"Ristorante Quantico",
	"Sala del Valhalla",
	"Sapore del Dune",
	"Stelle Astrofisiche",
	"Stelle dell Infinito Celestiale",
	"Tutti a TARSvola",
	"Universo Gastronomico di Namecc",
]
async function importPDF(relativePath: string, tableName: string, normalize: boolean = false) {
	let text = await importPDFToText(relativePath)
	if (normalize) text = normalizeString(text)
	await storeTextInDb(text, tableName, relativePath)
}

async function importHTML(relativePath: string, tableName: string) {
	let text = await importHTMLToText(relativePath)
	await storeTextInDb(text, tableName, relativePath)
}

async function importMenu() {
	for (const pdfPath of pdfPaths) {
		await importPDF(`../../data/pizza/Menu/${pdfPath}.pdf`, "kb_pizza_menu")
		await new Promise(resolve => setTimeout(resolve, 10000)) // Delay to avoid rate limit
	}
	await importPDF("../../data/pizza/Menu/L Essenza delle Dune.pdf", "kb_pizza_menu", true)
	await importPDF("../../data/pizza/Menu/Datapizza.pdf", "kb_pizza_menu", true)
}

async function importManual() {
	await importPDF("../../data/pizza/Misc/Manuale di Cucina.pdf", "kb_pizza_manual", true)
}

async function importCode() {
	await importPDF("../../data/pizza/Codice Galattico/Codice Galattico.pdf", "kb_pizza_code")
}

async function importBlogs() {
	await importHTML("../../data/pizza/Blogpost/blog_etere_del_gusto.html", "kb_pizza_blog")
	await importHTML("../../data/pizza/Blogpost/blog_sapore_del_dune.html", "kb_pizza_blog")
}

async function importAll() {
	const res = await deleteVectorDB()
	if ( !res ) return
	await importMenu()
	await importManual()
	await importCode()
	await importBlogs()
}

importAll()





