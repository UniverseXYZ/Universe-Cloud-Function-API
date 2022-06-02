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

FNAME=queryNfts
gcloud beta functions deploy $FNAME --project $PROJ --trigger-http  --runtime nodejs16 --allow-unauthenticated --update-env-vars NODE_ENV=production,DB_URL=mongodb+srv://universe-db-account:y7rYKn6Bw41PbB3E@universe-dev-cluster-at.lrbek.mongodb.net/dev-universe-datascraper?retryWrites=true&w=majority

# Upon success, it will print the URL.
