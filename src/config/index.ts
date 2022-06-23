require('dotenv').config();

export default {
  db_url: process.env.DB_URL,
  node_env: process.env.NODE_ENV,
  chain_id: process.env.ETHEREUM_CHAIN_ID,
};
