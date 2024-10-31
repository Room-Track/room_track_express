import type { CosmosClient, SqlParameter } from '@azure/cosmos';
import { query } from '../database';
import { toIInfo, toIRef, toISearch } from './format';
import { getQueryFromFieldsObj } from '../middlewares/queryFormat';
import type { IRef } from '../types/interfaces';

export async function getISearchArr(
	client: CosmosClient,
	fields: Object,
	parameters?: SqlParameter[]
) {
	const { resources } = await query(client, 'Places', {
		query:
			'SELECT * FROM r WHERE ' +
			getQueryFromFieldsObj(fields, ['name', 'type'], [true, false]),
		parameters: parameters,
	});
	return resources.map((doc) => toISearch(doc));
}

export async function getISearchArrLevelRef(
	client: CosmosClient,
	fields: Object,
	parameters?: SqlParameter[]
) {
	if (parameters) {
		const idx = parameters.findIndex((el) => el.name == '@level');
		if (idx != -1) {
			const element = parameters.at(idx);
			parameters.at(idx)!.value = Number(element?.value);
		}
	}
	const { resources } = await query(client, 'Places', {
		query:
			'SELECT * FROM r WHERE ' +
			getQueryFromFieldsObj(fields, ['level', 'ref'], [false, false]),
		parameters: parameters,
	});
	return resources.map((doc) => toISearch(doc));
}

export async function getISearchArrType(
	client: CosmosClient,
	fields: Object,
	parameters?: SqlParameter[]
) {
	const { resources } = await query(client, 'Places', {
		query:
			'SELECT * FROM r WHERE ' +
			getQueryFromFieldsObj(fields, ['type'], [false]),
		parameters: parameters,
	});
	return resources.map((doc) => toISearch(doc));
}

export async function getIRef(
	client: CosmosClient,
	name: string,
	fields: Object,
	parameters?: SqlParameter[]
): Promise<IRef | undefined> {
	const { resources: resultBuildings } = await query(client, 'Buildings', {
		query:
			'SELECT * FROM r WHERE ' +
			getQueryFromFieldsObj(
				fields,
				['name', 'lowestF', 'highestF', 'inside'],
				[false, false, false]
			),
		parameters: parameters,
	});
	const { resources: resultLocations } = await query(client, 'Locations', {
		query: 'SELECT * FROM r WHERE r.name = @name',
		parameters: [
			{
				name: '@name',
				value: name,
			},
		],
	});
	if (resultBuildings.length == 0 || resultLocations.length == 0) {
		return undefined;
	}
	return toIRef(resultLocations[0], resultBuildings[0]);
}

export async function getIInfo(
	client: CosmosClient,
	name: string,
	fields: Object,
	parameters?: SqlParameter[]
) {
	const { resources: resultPlaces } = await query(client, 'Places', {
		query:
			'SELECT * FROM r WHERE ' +
			getQueryFromFieldsObj(fields, ['name', 'type'], [false, false, false]),
		parameters: parameters,
	});
	let modFields = Object(fields);
	modFields['name'] = resultPlaces[0].ref;
	let modParams = Object(parameters);
	const idx = parameters!.findIndex((el) => el.name == '@name');
	modParams[idx]['value'] = resultPlaces[0].ref;
	const ref = await getIRef(client, resultPlaces[0].ref, modFields, modParams);
	return toIInfo(resultPlaces[0], ref);
}

export async function getIIndication(
	client: CosmosClient,
	name: string,
	fields: Object,
	parameters?: SqlParameter[]
) {}
