import TurndownService from 'turndown';



function fromHTMLToText(html: string): string {
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
}

export default fromHTMLToText;