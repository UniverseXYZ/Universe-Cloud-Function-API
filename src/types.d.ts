import UserAPI from "./datasources/user";
import ProjectsAPI from "./datasources/project";
import PriceAPI from "./datasources/price";
import TokenAPI from "./datasources/token";
import CollectionAPI from "./datasources/collection";

// Apollo Types
export interface DataSourceConfig<TContext = any> {
    context: TContext;
    cache: KeyValueCache;
}

// Project Types
export interface project {
    id: number;
    title: string;
    status: string;
}

export interface projectAssignment {
    projectId: number;
    userId: string;
    user: user;
    project: project;
}

export interface user {
    id: string;
    name: string;
    email: string;
    Projects: project[]
}

export interface Iprice {
    coin: string;
    value: string;
}

export interface IDataSources {
    userAPI: UserAPI;
    projectsAPI: ProjectsAPI;
    priceAPI: PriceAPI;
    tokenAPI: TokenAPI;
    collectionAPI: CollectionAPI;
}
