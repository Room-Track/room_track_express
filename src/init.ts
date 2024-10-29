import { enable } from 'colors';
import {
	createContainers,
	createDatabase,
	dropDatabase,
	fillDatabase,
	getClient,
} from './database';
import { log } from './middlewares/logger';
import { tempData } from '../temp/tempData';

enable();

try {
	const client = getClient();

	await dropDatabase(client);
	await createDatabase(client);
	await createContainers(client);
	await fillDatabase(client, tempData, [
		'Places',
		'Locations',
		'Buildings',
		'Indications',
	]);
} catch (err) {
	log(['Error'.red], 0);
	throw err;
}
