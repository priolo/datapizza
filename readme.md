Salve!  
Sono molto in ritardo per l'hackaton   
ma la vostra iniziativa è cosi' interessante  
che ho deciso di applicarmi (nei ritagli di tempo)

La mia proposta mi piace molto :) è assolutamente generica  
e vorrei davvero un vostro parere

## TECNOLOGIA UTILIZZATA
Ho usato [Vercel SDK AI](https://sdk.vercel.ai/)  
Soprattutto perche' sono piu' confidente con Typescript che con Python

## COME FAR PARTIRE LA BARACCA

Inserire in `.env` le KEY necessarie  
Ho usato: 
- GOOGLE (gemini-2.0-flash)  
per gli "agents" e la decomposizione dei "document"
- MISTRAL (mistral-embed)  
per l'embedding dato che non sono riuscito a trovare un model (aggratis) multilanguage della Google

Naturalmente si può usare qualsiasi model consentito da Vercel SDK AI  
Quindi:  
`npm install`

### CHAT
Per far partire una sessione di chat:   
`npm run chat`

### DATA INIT
Se volete resettare il DB e ricrearlo:  
`npm run create_db`


## DECOMPOSIZIONE DEI DATI

### STRATEGY
La RAG che ho utilizzato adotta questa strategia:  
- accetta più fonti dati "document" (pdf, txt, html ...) e, fondamentalmente, li rende stringhe (una cosa molto basic)
- divide ogni "document" in macroaree "chapter" semanticamente consistenti
- divide ogni "chapter" in "block" di testo di circa 300 lettere
- crea un "index" per ogni "document" con una lista di titoli per "block"

Ogni elemento ha un riferimento a se stesso e all'elemento da cui è stato generato  
In questa maniera ho una struttura ad albero  
"index" -> "chapter" -> "block"
> La tecnica usata è assolutamente agnostica.  
> Non ho inserito nessun specializzazione per il compito Hackapizza

### TECNICA
La decomposizione avviente tramite un LLM in "one shot"  
Quindi gli si passo l'intero "document" e lui sputa fuori tutto il necessario  
[code](src\core\cutter\llm.ts)  
Spezzetto il "document" secondo le indicazioni dell' LLM  
e memorizzo in `lancedb` con:  
[storeTextInDb](src\core\decomposer.ts)  
**TRICK**  
Per non far generare tutto il documento "spezzato" (cosa che probabilmente darebbe errore)  
ho chiesto all'LLM di dividere in "chapeter" restituendo degli "indici".  
Però (come sapete) un LLM non sa contare i caratteri  
quindi la divisione in "capther" avviene tramite le prime 5 parole del "chapeter" stesso  
Questo permette di dividere un "document" molto lungo con un numero di tokens in uscita abbastanza ridotto.  
Intanto che c'e' gli faccio fare anche un "title" che poi lo uso per riassumere il "document"

## IMMAGAZINAMENTO NEL DB
Semplicemente ho: 
- eseguito l'embedding degli "index", "chapter" e "block"  
- creato ID e PARENT_ID in maniera da avere un albero  
- e li ho memorizzati in [lancedb](https://lancedb.com/)  

## CHAT
La chat avviene ad un "agent leader" che orchestra altri "agents"  
Anche questa è una soluzione generica.
La chat si conclude con la risposta dell "agent leader"

### AGENTS
**Ho definito un "agent collaborative"**  
[Agent Collab](src\core\llm\Agent.ts)  
Questo ha:
- prompt system con delle "rule" 
- loop "reasoner"
- l'agent puo' usare un tool
- l'agent puo' chiedere ad un suo sotto-agent:
questo è di fatto un "tools". Viene creato il sub-agent per rispondere ad una domanda e poi distrutto
- l'agent puo' chiedere info all'super-agent 
nel caso dell'agent-leader, che non ha un super-agent, chiede all'utente
nel caso di un sub-agent chiedono all'agent che li ha generati

Questa struttura è interessante perche' si puo' creare un albero di "agents"  
Per esempi se si volesse complicare la cosa:  
Potrei aggiungere un "agent cuoco" che genera nuove ricette  
Questo potrebbe avere a sua volta un "agent ricerca web"  
che è un agent generico per la ricerca online.


**Ho esteso "agent collaboative"**  
[Agent Finder](src\core\llm\AgentFinder.ts)  
specializzato nella ricerca su un vector db tramite la tecnica RAG di prima.

In pratica è dotato di tools che gli permettono di fare diversi tipi di "query"  
Può recuperare semanticamente o cercare una parola precisa nei "block"  
Se trova informazioni interessanti, puo' caricare tutto il "chapter" al quale quel "block" fa riferimento per avere un contesto piu' ampio.  
Oppure tutto "index" per conoscere il contesto di tutto il "document"  
In questa maniera la ricerca avviene velocemente su piu' punti del "document"
e, se necessario, l'agent ha la possibilità di allargare il contesto.  

In fine ho specializzato ad Hackapizza solo le istanze degli ["agent"](src\datapizza\agents\leader.ts)  
Questa è l'unica specializzazione al vostro problema.

## CONCLUSIONI
Spero vediate il mio lavoro e soprattutto vorrei delle feroci critiche!!  
Dato che non sono un "esperto del settore" ma sono molto interessato a diventarlo (ho un sacco di idee al riguardo).  
In realta' negli anni mi sono specializzato nel frontend ! :D

Vi seguo su Youtube e mi sembrate davvero una sana iniziativa nel desolante panorama italiano.  
CIAO!

ivano.