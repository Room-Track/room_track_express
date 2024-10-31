import { Router, type Request } from 'express';
import { authenticate, authorization } from '../middlewares/authenticate';
import type { CosmosClient } from '@azure/cosmos';
import { createFamilyItem, deleteFamilyItem, query } from '../database';
import type { ModelType } from '../types/util';
import {
	getBodySpec,
	getQueryFromFieldsObj,
	getQuerySpec,
	getQuerySpecI,
} from '../middlewares/queryFormat';
import { toIRef, toISearch } from '../lib/format';
import {
	getIInfo,
	getIRef,
	getISearchArr,
	getISearchArrLevelRef,
	getISearchArrType,
} from '../lib/get';
import type { ISearch } from '../types/interfaces';

const router = Router();
// router.use(authenticate);

router.get('/search', getQuerySpecI('ISearch'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');
	try {
		let resData: ISearch[] = [];
		if (req.querySpec?.fields.hasOwnProperty('name')) {
			resData = await getISearchArr(
				client,
				req.querySpec!.fields,
				req.querySpec!.parameters
			);
		} else if (req.querySpec?.fields.hasOwnProperty('ref')) {
			resData = await getISearchArrLevelRef(
				client,
				req.querySpec!.fields,
				req.querySpec!.parameters
			);
		} else {
			resData = await getISearchArrType(
				client,
				req.querySpec!.fields,
				req.querySpec!.parameters
			);
		}

		res.status(200).json({
			data: resData,
		});
	} catch {
		res.status(500).json({
			msg: 'internal server error while fetching data',
		});
	}
});

router.get('/ref', getQuerySpecI('IRef'), async (req: Request, res) => {
	if (!req.query['name']) {
		res.status(400).json({
			msg: 'name field is required on query',
		});
		return;
	}
	const client: CosmosClient = req.app.get('client');
	try {
		const resData = await getIRef(
			client,
			req.query['name'].toString(),
			req.querySpec!.fields,
			req.querySpec!.parameters
		);
		res.status(200).json({
			data: resData,
		});
	} catch {
		res.status(500).json({
			msg: 'internal server error while fetching data',
		});
	}
});

router.get('/info', getQuerySpecI('IInfo'), async (req: Request, res) => {
	if (!req.query['name']) {
		res.status(400).json({
			msg: 'name field is required on query',
		});
		return;
	}
	const client: CosmosClient = req.app.get('client');
	try {
		const resData = await getIInfo(
			client,
			req.query['name'].toString(),
			req.querySpec!.fields,
			req.querySpec!.parameters
		);
		res.status(200).json({
			data: resData,
		});
	} catch {
		res.status(500).json({
			msg: 'internal server error while fetching data',
		});
	}
});

router.get('/indication', async (req: Request, res) => {
	if (!req.query['name']) {
		res.status(400).json({
			msg: 'name field is required on query',
		});
		return;
	}

	res.status(200).json({
		data: [],
	});
});

export default router;
