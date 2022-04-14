import { DataSource } from 'apollo-datasource';
import DataLoader from 'dataloader';
import { DataSourceConfig, user } from '../types';
import { groupBy, map, uniq, mapObjIndexed } from 'ramda';

class ProjectAPI extends DataSource {
    store: any;
    context: any;
    constructor({ store } : {store: any}) {
        super();
        this.store = store;
    }

    initialize(config: DataSourceConfig) {
        this.context = config.context;
    };

    private projectLoader = new DataLoader(async (ids: any) => {
        // console.log(ids);
      // Find the assignments for those userIds
      const assignmentsData = await this.store.ProjectAssignment.findAll({
        where: {
           UserId: ids
        }
    });

    // Take the project Ids
    const projectIds = uniq(assignmentsData.map((a: any) => a.ProjectId));

    // Take the projects info based on the project ids
    const projectsData = await this.store.Project.findAll({
        where: {
            id: projectIds
        }
    });

    // Group the projects by project id
    const projectsById = groupBy((project: any) => project.id , projectsData);

    const assignmentsByUserId = groupBy((assignment: any) => assignment.UserId , assignmentsData);

    const projectsByUser = mapObjIndexed((num, key, object: any) => {
        const assignments = object[key];
        const projects = assignments.map((element: any) => {
            return projectsById[element.ProjectId][0];
        });
        return projects;
    }, assignmentsByUserId);

    return map(userId => projectsByUser[userId] , ids);
    });

    async getProject(id: any) {
      return this.projectLoader.load(id);
    }
}

export default ProjectAPI;
