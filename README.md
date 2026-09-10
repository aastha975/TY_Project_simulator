# NetZero PET - Factory Decarbonization Simulator

NetZero PET is an interactive decision-support simulator for small and medium PET
bottle manufacturers. It lets a user enter a factory baseline, test operational
and material changes, and compare estimated emissions, operating cost, capital
cost, and payback.

## What the application provides

- Company baseline onboarding for production, energy, transport, workforce, and
  fuel inputs.
- Scope 1, Scope 2, and selected Scope 3 emissions estimates.
- Interactive decarbonization levers for energy, materials, logistics, waste,
  and commuting.
- En-ROADS-inspired pathway visualization.
- Emissions source breakdown and reduction comparison charts.
- Operating savings, implementation cost, payback, and cumulative cash position.
- Manufacturing quality guardrails for risky combinations of settings.
- Scenario saving and comparison through the REST API.

## Technology

- Frontend: HTML, CSS, vanilla JavaScript, Chart.js
- Backend: Node.js and Express
- Persistence: PostgreSQL through `pg`, with an in-memory fallback for local
  demonstration
- Testing: Node.js test script

## Running locally

Requirements: Node.js 18 or newer. PostgreSQL is optional for a local
demonstration but required for persistent scenario storage.

```bash
npm install
npm test
npm start
```

Open `http://localhost:5000`.

To use PostgreSQL, copy `.env.example` to `.env`, create the configured
database, and run the SQL files in `database/`. Never commit `.env`.

## Important note

This is a planning and screening model, not a certified greenhouse-gas
inventory, engineering design, financial offer, or regulatory submission.
Emission factors, tariffs, prices, and capital costs should be reviewed and
replaced with site-specific and current data before making an investment
decision.

Detailed internal calculation notes, assumptions, architecture notes, and graph
interpretation guidance are kept in `docs-private/`. That folder is ignored by
Git and is not intended for a public repository.

## License

This project is open-source under the MIT License.
