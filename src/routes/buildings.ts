import { Router, type Request } from 'express';
import { authenticate, authorization } from '../middlewares/authenticate';
import type { CosmosClient } from '@azure/cosmos';
import { createFamilyItem, deleteFamilyItem, query } from '../database';
import type { ModelType } from '../types/util';
import { getBodySpec, getQuerySpec } from '../middlewares/queryFormat';

const router = Router();
/* router.use(authenticate);
router.use(authorization); */

router.delete('/', getQuerySpec('Buildings'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');

	const { resources } = await query(client, 'Buildings', {
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
		'Buildings',
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

router.post('/', getBodySpec('Buildings'), async (req: Request, res) => {
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
			const result = await createFamilyItem(client, 'Buildings', item);
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

router.get('/', getQuerySpec('Buildings'), async (req: Request, res) => {
	const client: CosmosClient = req.app.get('client');

	const { resources } = await query(client, 'Buildings', {
		query: `SELECT * FROM r WHERE ${req.querySpec?.query}`,
		parameters: req.querySpec?.parameters,
	});

	res.status(200).json({
		data: resources,
	});
});

router.get('/filter', async (req: Request, res) => {
	if (!req.query['name']) {
		res.status(400).json({
			msg: 'name is required in query',
		});
		return;
	}

	const client: CosmosClient = req.app.get('client');

	const { resources } = await query(client, 'Buildings', {
		query: 'SELECT * FROM r WHERE CONTAINS(r.name, @name)',
		parameters: [
			{
				name: '@name',
				value: req.query['name'].toString(),
			},
		],
	});

	res.status(200).json({
		data: resources,
	});
});

export default router;
