import {
	CosmosClient,
	PartitionKeyKind,
	type SqlQuerySpec,
} from '@azure/cosmos';
import { log } from './middlewares/logger';
import databaseConfig from '../cosmosDB.json';
import type { ContainerType, ModelType, TempDataType } from './types/util';

export function getClient(): CosmosClient {
	return new CosmosClient({
		endpoint: databaseConfig.endpoint,
		key: databaseConfig.authKey,
		userAgentSuffix: 'room-track-api',
	});
}

export async function createDatabase(client: CosmosClient) {
	const { database } = await client.databases.createIfNotExists({
		id: databaseConfig.databaseId,
	});
	log(['Database'.green], 0);
	log([`Database Id:${database.id}`], 1);
}

export async function createContainers(client: CosmosClient) {
	log(['Conatiner'.green], 0);
	for (const c of databaseConfig.containers) {
		const { container } = await client
			.database(databaseConfig.databaseId)
			.containers.createIfNotExists({
				id: c.id,
				partitionKey: {
					kind: PartitionKeyKind.Hash,
					paths: c.paths,
				},
			});
		log([`Container Id:${container.id}`], 1);
	}
}

export async function createFamilyItem(
	client: CosmosClient,
	containerId: ContainerType,
	fItem: ModelType
) {
	const result = await client
		.database(databaseConfig.databaseId)
		.container(containerId)
		.items.upsert(fItem);
	return result;
}

export async function deleteFamilyItem(
	client: CosmosClient,
	containerId: ContainerType,
	itemId: string,
	itemBody: Object
) {
	const result = await client
		.database(databaseConfig.databaseId)
		.container(containerId)
		.item(itemId)
		.delete(itemBody);
	return result;
}

export async function query(
	client: CosmosClient,
	containerId: ContainerType,
	querySpec: SqlQuerySpec
) {
	const result = await client
		.database(databaseConfig.databaseId)
		.container(containerId)
		.items.query(querySpec)
		.fetchAll();
	return result;
}

export async function dropDatabase(client: CosmosClient) {
	log(['Database'.green], 0);
	const { database } = await client
		.database(databaseConfig.databaseId)
		.delete();
	log([`Delted Id:${database.id}`], 1);
}

export async function fillDatabase(
	client: CosmosClient,
	data: TempDataType,
	containers: ContainerType[]
) {
	log(['Database'.green], 0);
	for (const container of containers) {
		log([container.blue], 1);
		if (!data[container] || !data[container].length) {
			log(['No items'.red], 2);
			continue;
		}
		log(
			'all ' +
				' '.bgWhite.repeat(data[container].length) +
				` | ${data[container].length}`,
			2
		);
		console.write('    '.repeat(2) + 'res ');
		let completeds = 0;
		for (const doc of data[container]) {
			const { statusCode } = await createFamilyItem(client, container, doc);
			console.write(
				200 <= statusCode && statusCode < 300 ? ' '.bgGreen : ' '.bgRed
			);
			completeds += 200 <= statusCode && statusCode < 300 ? 1 : 0;
		}
		console.write(` | ${completeds}` + '\n');
	}
}
