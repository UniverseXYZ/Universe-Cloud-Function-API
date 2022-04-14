import { DataSource } from 'apollo-datasource';
import { DataSourceConfig } from '../types';
import DataLoader from 'dataloader';
import { groupBy, map, uniq, mapObjIndexed } from 'ramda';

export default class CollectionsAPI extends DataSource {
    store: any;
    context: any;
    constructor({ store } : {store: any}) {
        super();
        this.store = store;
    }

    initialize(config: DataSourceConfig) {
        this.context = config.context;
    };

    private collectionsLoader = new DataLoader(async (addresses: any) => {
        // console.log(addresses);

        const collectionsData =
            await this.store
            .find({ contractAddress: { $in: addresses } })

        const collectionsByAddress = groupBy((c: any) => c.contractAddress , collectionsData);

        // We have to map the results to the exact imput order of addresses
        const mapResult = addresses.map((key: string) => {
            return collectionsByAddress[key][0];
        });

        return mapResult
    });

    async getCollection(id: string) {
      return this.collectionsLoader.load(id);
    }
}