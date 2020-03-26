module.exports = function (RED) {

    const crypto = require('crypto');
    const tjs = require('teslajs');

    var localUserCache = {};

    const isTokenExpired = (tokenObj) => tokenObj.created_at + tokenObj.expires_in < Math.round(new Date() / 1000);

    const isTokenValid = tokenObj => tokenObj && tokenObj.access_token && !isTokenExpired(tokenObj);

    const getCredHash = (email, password) => crypto.createHash('md5')
        .update(email + password).digest('base64');

    const getNewToken = async (email, password) => {
        const credHash = getCredHash(email, password);
        const token = await tjs.loginAsync(email, password)
            .then(res => {
                if (!res.body.access_token) {
                    throw Error(res.body || res);
                }
                return res.body;
            })
            .catch(console.error);
        if (isTokenValid(token)) {
            localUserCache[credHash] = token;
            return token;
        }
        throw Error('Get access token failed');
    };

    const getToken = async (email, password) => {
        const credHash = getCredHash(email, password);
        if (!localUserCache.hasOwnProperty(credHash)) {
            console.log('geen token gevonden, ga nu call doen');
            return getNewToken(email, password).then(token => token.access_token);
        } else {
            if (isTokenValid(localUserCache[credHash])) {
                console.log('geldig token gevonden. ik gebruik deze.');
                return Promise.resolve(localUserCache[credHash]).then(token => token.access_token);
            } else {
                console.log('token gevonden maar niet meer geldig. ga nu call doen..');
                return getNewToken(email, password).then(token => token.access_token);
            }
        }
    };

    const doCommandAndAutoWake = async (command, authToken, vehicleID, autoWakeUp) => {
        if (autoWakeUp) {
            const vehicleData = await tjs.vehicleAsync({authToken, vehicleID});
            if (vehicleData.state === "asleep") {
                const wakeupResult = await tjs.wakeUpAsync({authToken, vehicleID});
            }
        }
        switch (command) {
            case 'vehicleData': return tjs.vehicleDataAsync({authToken, vehicleID});
            case 'chargeState': return tjs.chargeStateAsync({authToken, vehicleID});
            case 'climateState': return tjs.climateStateAsync({authToken, vehicleID});
            case 'vehicleConfig': return tjs.vehicleConfigAsync({authToken, vehicleID});
            case 'vehicleState': return tjs.vehicleStateAsync({authToken, vehicleID});
            case 'driveState': return tjs.driveStateAsync({authToken, vehicleID});
            default:
                throw Error(`Invalid command specified: ${command}`);
        }

    };

    function TeslaConfigNode(node) {
        RED.nodes.createNode(this, node);
        this.vehicleID = node.vehicleID;
        if (this.credentials.email &&
            this.credentials.password) {

            this.oauth = {
                email: this.credentials.email,
                password: this.credentials.password
            };
            getToken(this.credentials.email, this.credentials.password)
                .then(() => console.log('Tesla login success'))
                .catch(err => console.error('Tesla login failed context:', err));
        }
    }

    RED.nodes.registerType("tesla-config", TeslaConfigNode, {
        credentials: {
            email: {type: "text"},
            password: {type: "password"}
        }
    });

    function GetDataNode(config) {
        RED.nodes.createNode(this, config);

        this.teslaConfig = RED.nodes.getNode(config.teslaConfig);
        if (this.teslaConfig) {
            const node = this;
            node.on('input', async (msg, send, done) => {

                send = send || function () {
                    node.send.apply(node, arguments)
                };
                const {vehicleID} = node.teslaConfig;
                const command = msg.command || config.command;
                const {email, password} = node.teslaConfig.credentials;

                try {
                    const authToken = await getToken(email, password);
                    if (command === 'vehicles') {
                        msg.payload = await tjs.vehiclesAsync({authToken});
                    } else if (command === 'vehicles') {
                        msg.payload = await tjs.vehicleAsync({authToken, vehicleID});
                    } else {
                        msg.payload = await doCommandAndAutoWake(command, authToken, vehicleID, true);
                    }

                    send(msg);
                } catch (err) {
                    if (done) {
                        // Node-RED 1.0 compatible
                        done(err);
                    } else {
                        // Node-RED 0.x compatible
                        node.error(err, msg);
                    }
                }
            });
        } else {
            node.warn('No tesla config defined');
        }

    }

    RED.nodes.registerType("tesla-get-data", GetDataNode);
};