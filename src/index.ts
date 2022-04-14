const { ApolloServer } = require('apollo-server');
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

// Populate Postgres utils
import { createUsers, createProjects, createAssignments } from '../src/utils';

// Plugins
// Dev usage only, make sure to remove it before deploying on prod
import { ApolloServerPluginInlineTrace } from "apollo-server-core";

// DBs
import db from './models-postgres';
import { connectDatascraperDB } from './models-mongo/index';

// APIs
import UserAPI from './datasources/user';
import ProjectsAPI from './datasources/project';
import PriceAPI from './datasources/price';
import TokensAPI from './datasources/token';
import CollectionsAPI from './datasources/collection';

// Models
import TokenModel from './models-mongo/token';
import CollectionModel from './models-mongo/collection';

// The data sources are getting passed to the resolvers into the context arg on each request
const dataSources = () => ({
    userAPI: new UserAPI({ store: db }),
    projectsAPI: new ProjectsAPI({ store: db }),
    priceAPI: new PriceAPI(),
    tokenAPI: new TokensAPI({ store: TokenModel }),
    collectionAPI: new CollectionsAPI({ store: CollectionModel }),
});

const context = async ({ req }: { req: any }) => {
  return null;
}

// Creation of Local Postgres Test DB
// createUsers();
// createProjects();
// createAssignments();
// getUsers();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,
  context,
  plugins: [ApolloServerPluginInlineTrace()],
});


db.sequelize.sync().then(() => {
  // The `listen` method launches a web server.
  connectDatascraperDB().then(() => {
    server.listen().then(({ url } : {url: String}) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  })
})