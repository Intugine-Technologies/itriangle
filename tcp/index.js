const server = require('net').createServer();
const parser = require('./parser');
const axios = require('axios');
const terminals_connected = [];
const logger = require('pino')().child({ source: 'ITRANGLE_TCP_SERVER' });
const config = require('../config');
const mqtt_publisher = require('../mqtt_publisher');
const API_BASE = `http://localhost:${config.ITRANGLE_API_PORT}/itriangle`;
server.on('connection', (socket) => {
    const client = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info({ event: 'connection', client });
    socket.on('data', (raw_data) => {
        const data = raw_data.toString();
        logger.info({ event: 'data', raw_data, data, client });
        let parsed = parser(data);
        let used = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
        // if (parsed && parsed.length > 0) {
            // data_middleware(parsed);
        // } else send_invalid_data_to_api(data);
    });
    socket.on('error', (err) => {
        logger.error({ event: 'error', err, client });
    });
    socket.on('close', () => {
        logger.info({ event: 'close', client });
    });
    socket.on('end', () => {
        logger.info({ event: 'end', client });
    });
});

server.on('error', (err) => {
    logger.error({ event: 'Server error', err });
});
server.on('close', (err) => {
    logger.log({ event: 'Server close', err });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ event: 'Unhandled Rejection at:', err: reason.stack.toString() || reason });
});

const data_middleware = (data) => {
    let client = null;
    if (data[0].ref) {
        get_device(data[0].ref)
            .then((r) => {
                client = r && r.data ? r.data.client : null;
                data = data.map(i => Object.assign({}, i, { device: (r && r.data ? r.data.id : 'NA') }));
                send_data_to_api(data, client);
            })
            .catch((e) => {
                console.error(e);
            });
    }
    return;
};
const get_device = (ref) => axios({ url: `${API_BASE}/device/${ref}` });
const send_data_to_api = (data, client) => {
    if (client) mqtt_publisher.publish(client, JSON.stringify(data));
    axios({
            url: `${API_BASE}/data`,
            method: 'POST',
            data: { data }
        })
        .then((r) => {
            logger.info({ event: 'Sent to API', imei: data[0].imei });
        })
        .catch((e) => {
            logger.error({ event: 'Error Sending to API', data, err: e.response.data });
        });
    return;
};
const send_invalid_data_to_api = (data) => {
    axios({
            url: `${API_BASE}/invalid_data`,
            method: 'POST',
            data: { data }
        })
        .then((r) => {
            logger.info({ event: 'Invalid Data Sent to API', imei: data[0].imei });
        })
        .catch((e) => {
            logger.error({ event: 'Invalid Data Error Sending to API', data, err: e.response.data });
        });
    return;
};
server.listen(config.ITRANGLE_TCP_PORT, () => {
    logger.error({ event: 'ITRANGLE_TCP_SERVER', PORT: config.ITRANGLE_TCP_PORT });
});