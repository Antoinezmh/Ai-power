import { MockMethod } from 'vite-plugin-mock';
import projectMock from './project.mock';

export default [...projectMock] as MockMethod[];