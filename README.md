# OBA agenda – Vercel Edge Request optimalisatie v3

Deze variant vereist geen aanpassing van de signage-player of van bestaande locatie-URL's.

## Kernwijziging

Alle vestigingsdata wordt tijdens de GitHub-sync in `index.html` en `portrait.html` ingebed. De browser hoeft daardoor geen afzonderlijk `/data/<vestiging>.json` verzoek meer te doen.

Bestaande URL's blijven werken:

- `/?where=Centrale%20OBA`
- `/portrait.html?where=Centrale%20OBA`

De queryparameter `where` selecteert uitsluitend lokaal de juiste vestiging uit de ingebedde data.

## Effect

- Eén Vercel-request per volledige player-reload in plaats van twee.
- Geen apart favicon-request.
- Geen service-workerrequest.
- Browsercache van twee uur op de HTML, voor zover de player die respecteert.
- Geen nieuwe deployment wanneer de agenda inhoudelijk niet is gewijzigd.

## Scripts

- `npm run render`: bouwt HTML uit de bestaande JSON-bestanden.
- `npm run sync`: haalt OBA-data op, schrijft alleen inhoudelijke wijzigingen en rendert daarna de HTML.
- `npm run build`: rendert de HTML zonder externe API-call.

De JSON-bestanden blijven aanwezig voor diagnose, maar de schermpagina's vragen ze niet meer op.
