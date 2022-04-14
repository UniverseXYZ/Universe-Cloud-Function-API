import { DataSource } from 'apollo-datasource';
import { DataSourceConfig } from '../types';

export default class TokensAPI extends DataSource {
    store: any;
    context: any;
    constructor({ store } : {store: any}) {
        super();
        this.store = store;
    }

    initialize(config: DataSourceConfig) {
        this.context = config.context;
    };


    async getToken(id: any) {
        const tokens =
            await this.store.find({ contractAddress: id })
            .limit(10);

      return tokens;

    }
}