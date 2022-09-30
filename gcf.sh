#!/bin/bash
set -e

# Only the compiled output is going to get deployed, Google cloud functions will
# never see any of the "source" or other supporting files.

cd cloudfn

# Any real application probably has a more elaborate deployment process. Here I
# simply hardcoded my example function name; the first thing to change would be
# to load this from a configuration file or similar source instead.

PROJ=polymorphmetadata

# This region seems to work well for me, all the others are presumably about the same.
REGION=us-central1

#FNAME=nfts
#gcloud beta functions deploy $FNAME --project $PROJ --entry-point=nfts --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars ETHEREUM_CHAIN_ID=4,NODE_ENV=production,DB_URL=mongodb+srv://universe-db-account:y7rYKn6Bw41PbB3E@universe-dev-cluster-at.lrbek.mongodb.net/dev-universe-datascraper?retryWrites=true&w=majority&ssl=true

#FNAME=nfts-goerli
#gcloud beta functions deploy $FNAME --project $PROJ --entry-point=nfts --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars ETHEREUM_CHAIN_ID=5,NODE_ENV=production,DB_URL=mongodb+srv://universe-db-account:y7rYKn6Bw41PbB3E@universe-dev-cluster-at.lrbek.mongodb.net/goerli-universe-datascraper?retryWrites=true&w=majority&ssl=true

# NAME=reservoir-nfts-goerli
# gcloud beta functions deploy $FNAME --project $PROJ --entry-point=reservoirNfts --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars ETHEREUM_CHAIN_ID=5,NODE_ENV=production,DB_URL=mongodb+srv://universe-db-account:y7rYKn6Bw41PbB3E@universe-dev-cluster-at.lrbek.mongodb.net/goerli-universe-datascraper?retryWrites=true&w=majority&ssl=true

#FNAME=nfts-prod-gen2
#gcloud beta functions deploy $FNAME --gen2 --project $PROJ --entry-point=nfts --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars ETHEREUM_CHAIN_ID=1,NODE_ENV=production,DB_URL=mongodb+srv://universe-prod-account:LEvRA2owmFi3791Ox6Xx@universe-prod-cluster-a.5brb2bu.mongodb.net/prod-universe-datascraper?retryWrites=true&w=majority

#FNAME=reservoir-nfts
#gcloud beta functions deploy $FNAME --project $PROJ --entry-point=reservoirNfts --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars ETHEREUM_CHAIN_ID=1,NODE_ENV=production,DB_URL=mongodb+srv://universe-prod-account:LEvRA2owmFi3791Ox6Xx@universe-prod-cluster-a.5brb2bu.mongodb.net/prod-universe-datascraper?retryWrites=true&w=majority,RESERVOIR_API_URL=https://api.reservoir.tools,RESERVOIR_API_KEY=demo-api-key

# Upon success, it will print the URL.
