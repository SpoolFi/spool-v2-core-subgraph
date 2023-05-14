# Spool V2 Core Subgraph

## Run local

- clone
- `npm install`
- delete `./data` folder (*if present and hardhat node was reset*)
- `docker-compose up -d`
- `npm run local:build`
- `npm run local:create`
  - only if fresh subgraph (deleted data folder)
- `npm run local:deploy`

## Query Local

- go to: https://graphiql-online.com/
  - input http://127.0.0.1:8000/subgraphs/name/spool/core-v2
