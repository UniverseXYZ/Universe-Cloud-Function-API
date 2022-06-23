import { Request, Response } from 'express';
import { countNfts, fetchNfts } from './services/nfts/nft.service';
import config from './config';
import { getDBClient } from './database';
import { ERROR_MESSAGES, HTTP_STATUS_CODES } from './errors';
import {
  CloudActions,
  validateCountParameters,
  validateNftParameters,
  validateRequiredParameters,
} from './validations';

/** This is the entry point of the Cloud Function.
 * The name of the function shouldn't change because it also changes
 * the endpoint of the deployed Cloud Function
 */
export async function nfts(req: Request, res: Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Content-Type', 'application/json');

  try {
    validateRequiredParameters(req.query);

    switch (req.query.action) {
      case CloudActions.QUERY:
        validateNftParameters(req.query);
        break;
      case CloudActions.COUNT:
        validateCountParameters(req.query);
        break;
    }

    console.time('service-execution-time');
    console.time('db-connection-time');
    const client = await getDBClient();
    console.timeEnd('db-connection-time');
    console.log(req.query);

    let result = null;
    switch (req.query.action) {
      case CloudActions.QUERY:
        result = await fetchNfts(req.query);
        break;
      case CloudActions.COUNT:
        result = await countNfts(req.query);
        break;
    }

    res.status(200).send(result);

    console.timeEnd('service-execution-time');

    if (config.node_env === 'production') {
      client.disconnect();
      console.log('Disconnected from DB');
    }
  } catch (err) {
    console.log(err);
    if (err.statusCode) {
      res.status(err.statusCode).send({
        statusCode: err.statusCode,
        message: err.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
      });
    } else {
      res.status(HTTP_STATUS_CODES.UNEXPECTED_ERROR).send({
        statusCode: HTTP_STATUS_CODES.UNEXPECTED_ERROR,
        message: ERROR_MESSAGES.UNEXPECTED_ERROR,
      });
    }
  }
}

/**  In order to allow for an easier development and debugging experience
we spin up an express server with a single endpoint
mimicking the behaviour of the cloud function endpoint
*/
if (config.node_env !== 'production') {
  const express = require('express');
  const app = express();
  const port = 3000;

  app.get('/nfts', (req, res) => {
    nfts(req, res);
  });

  app.listen(port, () => {
    console.log(`Local function is listening on port ${port}`);
  });
}
