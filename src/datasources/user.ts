import { DataSource } from 'apollo-datasource';
import { DataSourceConfig, user } from '../types';

class UserAPI extends DataSource {
    store: any;
    context: any;
    constructor({ store } : {store: any}) {
        super();
        this.store = store;
    }

    initialize(config: DataSourceConfig) {
        this.context = config.context;
    };

    getUsers = async () : Promise<user[]>=> {
        const usersData = await this.store.User.findAll({
            include: {
                model: this.store.Project,
                through: {
                    attributes: []
                }
            }
        });

        const users = usersData.map((user: user) => {
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                projects: user.Projects
            }
        })
        return users
    }
}

export default UserAPI;