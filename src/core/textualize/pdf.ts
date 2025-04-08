import * as pdfjs from 'pdfjs-dist';



async function fromPDFToText(pdfPath: string): Promise<string> {
    let pdf:pdfjs.PDFDocumentProxy
    try {
        pdf = await pdfjs.getDocument(pdfPath).promise;
    } catch (e) {
        console.error(e);
        return '';
    }
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items
            .map(item => 'str' in item ? item.str : '')
            .join(' ');
    }
    return text;
}
  
export default fromPDFToText;
