const app = require('express')();
const mongo = require('@intugine-technologies/mongodb');
const body_parser = require('body-parser');
const logger = require('pino')().child({ source: 'ITRANGLE_SERVER_API' });
app.use(body_parser.json());
let db = null;
const config = require('../config');

app.post('/itriangle/data', (req, res) => {
	db.create('status', req.body.data)
		.then((r) => {
			res.sendStatus(200);
		})
		.catch((e) => {
			logger.error({method: 'POST', event: '/itriangle/data', err: e});
			res.sendStatus(500);
		});
});

app.post('/itriangle/invalid_data', (req, res) => {
	db.create('invalid_status', req.body.data)
		.then((r) => {
			res.sendStatus(200);
		})
		.catch((e) => {
			logger.error({method: 'POST', event: '/itriangle/invalid_data', err: e});
			res.sendStatus(500);
		});
});

app.get('/itriangle/invalid_data', (req, res) => {
	const limit = req.query.limit === 'all' ? 'all' : parseInt(req.query.limit || 10);
	db.read('invalid_status', {}, limit)
		.then((r) => {
			res.json(r);
		})
		.catch((e) => {
			logger.error({method: 'GET', event: '/itriangle/invalid_data', err: e});
			res.sendStatus(500);
		});
});

app.get('/itriangle/device/:ref',(req, res) => {
	db.read('devices', {ref: req.params.ref})
		.then((r) => {
			res.json(r[0]);
		})
		.catch((e) => {
			logger.error({method: 'GET', event: '/itriangle/device/:ref', err: e});
			res.sendStatus(500);
		});
});

app.get('/itriangle/', (req, res) => {
	const limit = req.query.limit === 'all' ? 'all' : parseInt(req.query.limit || 10);
	db.read('status', {}, limit)
		.then((r) => {
			res.json(r);
		})
		.catch((e) => {
			logger.error({method: 'GET', event: '/itriangle/', err: e});
			res.sendStatus(500);
		});
});

mongo(config.DB_URI, config.DB_NAME)
	.then((DB) => {
		db = DB;
		app.listen(config.ITRANGLE_API_PORT, () => {
			logger.error({event: 'ITRANGLE_SERVER_API STARTED', PORT: config.ITRANGLE_API_PORT});
		});
	})
	.catch((e) => {
		logger.error({event: 'ERROR CONNECTING TO DB', err: e});
	});