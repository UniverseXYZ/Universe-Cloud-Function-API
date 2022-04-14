import db from './models-postgres';
import { users } from './seeders/users';
import { projects } from './seeders/projects';
import { assignments } from './seeders/assignments';

export const createUsers = () => {
	users.map(user => db.User.create(user));
}

export const createProjects = () => {
	projects.map(project => db.Project.create(project));
}

export const createAssignments = () => {
	assignments.map(assignment => db.ProjectAssignment.create(assignment));
}
