import { Router, type Request } from 'express';
import { authenticate, authorization } from '../middlewares/authenticate';
import type { CosmosClient } from '@azure/cosmos';
import { createFamilyItem, deleteFamilyItem, query } from '../database';
import type { ModelType } from '../types/util';
import { getBodySpec, getQuerySpec } from '../middlewares/queryFormat';

const router = Router();
/* router.use(authenticate);
router.use(authorization); */

router.delete('/', getQuerySpec('Indications'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');

	const { resources } = await query(client, 'Indications', {
		query: `SELECT * FROM r WHERE ${req.querySpec?.query}`,
		parameters: req.querySpec?.parameters,
	});

	if (resources.length == 0) {
		res.status(200).json({
			success: false,
			msg: 'No items match',
		});
		return;
	}

	const doc = resources[0];

	const { statusCode } = await deleteFamilyItem(
		client,
		'Indications',
		doc.id,
		doc
	);

	if (200 > statusCode || statusCode >= 300) {
		res.status(500).json({
			success: false,
			msg: 'internal server error while deleting family item',
		});
		return;
	}
	res.status(200).json({
		success: true,
		item: doc,
	});
});

router.post('/', getBodySpec('Indications'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');

	if (!req.bodySpec) {
		res.status(400).json({
			msg: 'bad request',
		});
		return;
	}

	try {
		let results: Array<{ success: boolean; itemId: string; item: Object }> = [];
		for (const item of req.bodySpec.items as ModelType[]) {
			const result = await createFamilyItem(client, 'Indications', item);
			results.push({
				success: 200 <= result.statusCode && result.statusCode < 300,
				itemId: result.item.id,
				item: item,
			});
		}
		res.status(200).json({
			data: results,
		});
	} catch {
		res.status(500).json({
			msg: 'interal server error while creating family items',
		});
	}
});

router.get('/', getQuerySpec('Indications'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');

	const { resources } = await query(client, 'Indications', {
		query: `SELECT * FROM r WHERE ${req.querySpec?.query}`,
		parameters: req.querySpec?.parameters,
	});

	res.status(200).json({
		data: resources,
	});
});

router.get('/filter', async (req: Request, res) => {
	if (!req.query['nameA'] && !req.query['nameB']) {
		res.status(400).json({
			msg: 'name is required in query',
		});
		return;
	}

	const client: CosmosClient = req.app.get('client');

	const where =
		req.query['nameA'] && req.query['nameB']
			? 'r.nameA = @nameA AND r.nameB = @nameB OR r.nameB = @nameA AND r.nameA = @nameB'
			: req.query['nameA']
			? 'r.nameA = @nameA OR r.nameB = @nameA'
			: 'r.nameA = @nameB OR r.nameB = @nameB';

	const { resources } = await query(client, 'Indications', {
		query: 'SELECT * FROM r WHERE ' + where,
		parameters: [
			{
				name: '@nameA',
				value: `${req.query['nameA']}`,
			},
			{
				name: '@nameB',
				value: `${req.query['nameB']}`,
			},
		],
	});

	res.status(200).json({
		data: resources,
	});
});

export default router;
