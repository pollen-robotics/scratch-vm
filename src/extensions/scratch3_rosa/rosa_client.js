const log = require('../../util/log');
const MathUtil = require('../../util/math-util');

const WebSocket = require('isomorphic-ws');
const _ = require('lodash');

const createRosaClient = () => {
    const defaultHost = 'rosa.local';
    const defaultPort = 1234;
    const sendMaxRate = 50;

    const url = `ws://${defaultHost}:${defaultPort}`;
    const ws = new WebSocket(url);

    const send = data => {
        if (ws.readyState !== WebSocket.OPEN) {
            log.warn(`Try to send ${data} on a not ready ws (${ws.readyState}).`);
            return;
        }

        const msg = JSON.stringify(data);
        const date = Date.now();

        log.info(`${date}: Sending ${msg}`);
        ws.send(msg);
    };

    let cmd = {};
    const updateCommand = newCmd => {
        _.merge(cmd, newCmd);
    };

    const sender = () => {
        if (Object.entries(cmd).length !== 0) {
            send(cmd);
            cmd = {};
        }
    };
    // TODO: should we instead altern sending/receiving
    // so the robot can schedule the communication.
    const sendId = setInterval(sender, 1000 / sendMaxRate);

    const client = {
        stopAll: () => {
            updateCommand({wheels: {a: 0, b: 0}});
        },
        getDistance: sensor => {
            log.info(`Get ${sensor} distance.`);
            return 42.0;
        },
        setSpeed: (wheel, speed) => {
            speed = MathUtil.clamp(speed, -1, 1);
            log.info(`Set ${wheel} wheel speed to ${speed}`);

            if (wheel === 'left') {
                updateCommand({wheels: {b: -speed}});

            } else if (wheel === 'right') {
                updateCommand({wheels: {a: speed}});

            } else if (wheel === 'all') {
                updateCommand({wheels: {a: speed, b: -speed}});
            }
        },
        isGround: sensor => {
            log.info(`Is ${sensor} ground?`);
            return true;
        },
        getColor: sensor => {
            log.info(`Get ${sensor} color`);
            return 'lol';
        },
        buzz: () => {
            log.info('Buzzzzzzz');
        },
        getBlackLineCenter: () => {
            log.info(`Get black line center.`);
            return -0.25;
        }
    };

    ws.onopen = () => {
        log.info(`Connected!`);

        if (typeof client.onconnect === typeof Function) {
            client.onconnect();
        }

        const defaultPinConfiguration = {
            AIN1: 18,
            AIN2: 17,
            PWMA: 4,
            BIN1: 24,
            BIN2: 27,
            PWMB: 22,
            STBY: 23
        };
        send({setup: defaultPinConfiguration});
    };

    ws.onmessage = data => {
        log.info(`Got ${data}`);
    };

    ws.onclose = () => {
        log.info('Ws connection closed.');

        clearInterval(sendId);

        if (typeof client.ondisconnect === typeof Function) {
            client.ondisconnect();
        }
    };

    ws.onerror = e => {
        log.error(`Ws error: ${e}`);

        if (typeof client.ondisconnect === typeof Function) {
            client.ondisconnect();
        }
    };

    return client;
};

module.exports = createRosaClient;
