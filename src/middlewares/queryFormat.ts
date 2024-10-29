import type { NextFunction, Response, Request } from 'express';
import type { ContainerType, ModelType, ServerINameType } from '../types/util';

type FieldType = { name: string; required: boolean; type: Object };

export function getModelFields(model: ContainerType): Array<FieldType> {
	switch (model) {
		case 'Places':
			return [
				{ name: 'name', required: true, type: String },
				{ name: 'type', required: true, type: String },
				{ name: 'level', required: true, type: Number },
				{ name: 'img', required: false, type: String },
				{ name: 'ref', required: false, type: String },
			];
		case 'Buildings':
			return [
				{ name: 'name', required: true, type: String },
				{ name: 'inside', required: true, type: Boolean },
				{ name: 'lowestF', required: true, type: Number },
				{ name: 'highestF', required: true, type: Number },
			];
		case 'Locations':
			return [
				{ name: 'name', required: true, type: String },
				{ name: 'lat', required: true, type: String },
				{ name: 'lng', required: true, type: String },
				{ name: 'rad', required: true, type: String },
			];
		case 'Indications':
			return [
				{ name: 'nameA', required: true, type: String },
				{ name: 'nameB', required: true, type: String },
				{ name: 'forwardInfo', required: true, type: String },
				{ name: 'backwardInfo', required: true, type: String },
			];

		default:
			return [];
	}
}

export function getQueryFromFieldsObj(
	obj: Object,
	fields: string[],
	contains: boolean[]
) {
	let queryS = '';
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		const contain = contains[i];
		if (!obj.hasOwnProperty(field)) continue;

		if (contain) {
			queryS +=
				i == 0
					? `CONTAINS(r.${field}, @${field})`
					: ` AND CONTAINS(r.${field}, @${field})`;
		} else {
			queryS += i == 0 ? `r.${field} = @${field}` : ` AND r.${field} = @${field}`;
		}
	}
	return queryS;
}

export function getInterfaceFields(inter: ServerINameType) {
	switch (inter) {
		case 'ISearch':
			return ['name', 'type'];
		case 'IRef':
			return ['name', 'lowestF', 'highestF', 'lat', 'lng'];
		case 'IInfo':
			return ['name', 'type', 'level', 'ref'];
		case 'IIndication':
			return ['name', 'img', 'forwardInfo', 'backwardInfo', 'lat', 'lng', 'rad'];
		default:
			return [];
	}
}

export function getQuerySpecI(inter: ServerINameType) {
	const interFields = getInterfaceFields(inter);
	return (
		req: Request<any, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): void | Promise<void> => {
		const queryFields = Object.keys(req.query);
		const matchQueryFields = interFields.filter((field) =>
			queryFields.some((name) => name == field)
		);
		if (!matchQueryFields.length) {
			res.status(400).json({
				msg: 'The query object does not match the type: ' + inter,
			});
			return;
		}
		const queryObj = new Map<string, any>();
		for (const field of matchQueryFields) {
			queryObj.set(field, req.query[field]);
		}
		req.querySpec = {
			length: matchQueryFields.length,
			fields: Object.fromEntries(queryObj.entries()),
			query: '',
			parameters: [
				...matchQueryFields.map((field) => {
					return {
						name: `@${field}`,
						value: queryObj.get(field),
					};
				}),
			],
		};
		next();
	};
}

export function getQuerySpec(model: ContainerType) {
	const modelFields = getModelFields(model);
	return (
		req: Request<any, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): void | Promise<void> => {
		const queryFields = Object.keys(req.query);
		const matchQueryFields = modelFields.filter((field) =>
			queryFields.some((name) => name == field.name)
		);
		if (!matchQueryFields.length) {
			res.status(400).json({
				msg: 'The query object does not match the type: ' + model,
			});
			return;
		}
		const queryObj = new Map<string, any>();
		for (const field of matchQueryFields) {
			queryObj.set(field.name, req.query[field.name]);
		}
		req.querySpec = {
			length: matchQueryFields.length,
			fields: Object.fromEntries(queryObj.entries()),
			query: matchQueryFields
				.map((field, idx) =>
					idx == 0
						? `r.${field.name} = @${field.name}`
						: `AND ${field.name} = @${field.name}`
				)
				.join(' '),
			parameters: [
				...matchQueryFields.map((field) => {
					return {
						name: `@${field.name}`,
						value: queryObj.get(field.name),
					};
				}),
			],
		};
		next();
	};
}

export function getBodySpec(model: ContainerType) {
	const modelFields = getModelFields(model);
	return (
		req: Request<any, Record<string, any>>,
		res: Response<any, Record<string, any>>,
		next: NextFunction
	): void | Promise<void> => {
		if (!req.body['data']) {
			res.status(400).json({
				msg: "'data' field is needed on body",
			});
			return;
		}
		try {
			const data = req.body['data'] as Array<ModelType>;
			if (data.length == 0) {
				res.status(400).json({
					msg: "'data' must contain at least 1 item",
				});
				return;
			}
			const matchBodyFieldsVerified = objectsSameKeys(data, modelFields);
			if (matchBodyFieldsVerified.length == 0) {
				res.status(400).json({
					msg: 'The items in data field does not match the type: ' + model,
				});
				return;
			}
			const items = getObjectsFromKeys(data, matchBodyFieldsVerified);
			req.bodySpec = {
				items: items,
			};
			next();
		} catch {
			res.status(400).json({
				msg: 'data field in body needs to be an array',
			});
		}
	};
}

function objectsSameKeys(arr: Array<Object>, arrField: Array<FieldType>) {
	let mutableArray: Array<FieldType> = [];
	for (const obj of arr) {
		const objFields = Object.keys(obj);
		for (const field of arrField) {
			const includes = objFields.includes(field.name);
			if (field.required && !includes) {
				return [];
			} else if (includes) {
				mutableArray.push(field);
			}
		}
	}
	return mutableArray;
}
function getObjectsFromKeys(arr: Array<Object>, arrField: Array<FieldType>) {
	return arr.map((item) => {
		const map = new Map<string, any>();
		for (const field of arrField) {
			//@ts-ignore
			map.set(field.name, item[field.name]);
		}
		return Object.fromEntries(map.entries());
	});
}
