# CarTogether backend prototype

A local, API-first prototype for organizing buyers interested in the same car, collecting itemized dealer offers, comparing like-for-like quotes, and reconciling a quote with a buyer-entered invoice.

## Run with Docker

Requires Docker Desktop with Docker Compose. The API and PostgreSQL both run in containers; Node.js does not need to be installed on Windows.

1. Start Docker Desktop and wait until its engine is running.
2. From this folder, copy `.env.example` to `.env`.
3. Build and start the API and database:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

The API is available at `http://127.0.0.1:3000`, and `http://127.0.0.1:3000/api/health` reports API and database readiness. PostgreSQL data persists in the Docker volume `car_together_postgres`. To inspect service output, run `docker compose logs -f web`. To stop the services without deleting database data, run `docker compose down`.

The API binds to 127.0.0.1. It has no sign-in or production access control, so keep it on your own machine and use synthetic data while learning. Do not expose it to the internet or submit real personal or financial documents.

## First API flow

1. Create a buyer group with `POST /api/groups`.
2. Join using `POST /api/groups/{groupId}/members`.
3. Add dealer offers with `POST /api/groups/{groupId}/offers`.
4. Compare eligible offers using `GET /api/groups/{groupId}/compare`.
5. After purchase, create a private quote-to-invoice record using `POST /api/passports`. Save the returned access key: it is shown once.
6. Reopen it with `GET /api/passports/{passportId}` and the `x-passport-key` header.

## Example requests

Create a group:

```powershell
$body = @{
  name = "Pune Nexon Creative+ group"
  city = "Pune"
  vehicle = @{
    make = "Tata"; model = "Nexon"; variant = "Creative+"
    modelYear = 2026; fuel = "petrol"; transmission = "automatic"
  }
  memberLimit = 30
} | ConvertTo-Json -Depth 5
$group = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:3000/api/groups" -ContentType "application/json" -Body $body
$group.group.id
```

Add a dealer offer. Replace `$groupId` with the ID returned above. Amounts use integer paise: ₹10,000 is `1000000`.

```powershell
$groupId = "paste-group-id-here"
$offer = @{
  dealerName = "Example Motors"
  dealerCity = "Pune"
  registrationCity = "Pune"
  vehicle = @{
    make = "Tata"; model = "Nexon"; variant = "Creative+"
    modelYear = 2026; fuel = "petrol"; transmission = "automatic"
  }
  validUntil = "2026-11-15"
  lines = @(
    @{ category = "ex_showroom"; label = "Ex-showroom"; amountPaise = 105000000; kind = "charge"; mandatory = $true },
    @{ category = "registration"; label = "Registration and road tax"; amountPaise = 12500000; kind = "charge"; mandatory = $true },
    @{ category = "insurance"; label = "Insurance"; amountPaise = 6500000; kind = "charge"; mandatory = $true },
    @{ category = "accessories"; label = "Accessory package"; amountPaise = 1000000; kind = "charge"; mandatory = $false },
    @{ category = "other"; label = "Dealer discount"; amountPaise = 2500000; kind = "discount"; mandatory = $false }
  )
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:3000/api/groups/$groupId/offers" -ContentType "application/json" -Body $offer
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/groups/$groupId/compare"
```

Create a passport with `POST /api/passports` and its required `offerId`, `invoiceDate`, and `invoiceLines`. The returned access key is a bearer secret: anyone who has it can read that passport.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check database and optional AI configuration |
| GET, POST | `/api/groups` | List or create groups; filter with `?city=Pune` |
| GET | `/api/groups/{groupId}` | Read one group |
| GET, POST | `/api/groups/{groupId}/members` | List aliases or join a group |
| GET, POST | `/api/groups/{groupId}/offers` | List or add itemized dealer offers |
| GET | `/api/groups/{groupId}/compare` | Deterministically total and rank comparable offers |
| POST | `/api/passports` | Create a private quote-to-invoice reconciliation |
| GET | `/api/passports/{passportId}` | Read it with `x-passport-key` |
| POST | `/api/assist/extract-offer` | Turn pasted quote text into an unsaved AI draft |

## How comparison works

- Prices are stored as integer paise. The server adds charges and subtracts discounts.
- An offer can be ranked only when make, model, variant, year, fuel, transmission, and registration city match the group; its quote is current; and ex-showroom, registration, and insurance lines are present.
- The ranking total includes every submitted line. The server cannot know whether a quote omitted a fee, so it shows the listed total with that limitation.
- AI extraction only drafts fields from pasted text. It never saves the draft or contacts a dealer. A person must check it against the quote and then submit a corrected offer.
- The Deal Passport records manually entered invoice lines. Records are self-reported, and opt-in prices are not published or used in benchmarks yet.

## Optional AI extraction

Create a key through Vercel AI Gateway and choose a currently available model ID in its model library. Put both values in `.env`:

```dotenv
AI_GATEWAY_API_KEY=your-key
CAR_AGENT_MODEL=provider/model-id
```

Recreate the API container so it receives the settings: `docker compose up -d --force-recreate web`. Post `{"text":"...pasted quote text..."}` to `/api/assist/extract-offer`. The text goes to the configured AI provider. Avoid pasting personal details. Without credentials, the endpoint responds with `503 ai_not_configured`.

## Current limits

This implementation is for local learning and flow validation. It does not yet include accounts, roles, dealer contact, document upload/OCR, document verification, moderation, a verified benchmark pipeline, or production access controls. Before multi-user deployment, add authentication, authorization, rate limits, backups, and privacy controls.
