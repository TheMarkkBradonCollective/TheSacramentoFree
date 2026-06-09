import serverless from 'serverless-http';
import { createPushApp } from '../server/app';

const app = createPushApp();

export default serverless(app);
