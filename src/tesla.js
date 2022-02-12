const axios = require('axios').default;
const tjs = require('@gaphi/teslajs');

module.exports = function (RED) {

    const STATE_ASLEEP = 'asleep';
    let localUserCache = {};

    const isTokenExpired = (tokenObj) => tokenObj.created_at + tokenObj.expires_in < Math.round(new Date() / 1000);

    const isTokenValid = tokenObj => tokenObj && tokenObj.access_token && !isTokenExpired(tokenObj);

    const getNewTokenFromApi = async (email, refreshToken) => {
        console.log('Tesla API: doing api call to fetch new access token');
        try {
            const response = await axios.post('https://auth.tesla.com/oauth2/v3/token', {
                "grant_type": "refresh_token",
                "client_id": "ownerapi",
                "refresh_token": refreshToken,
                "scope": "openid email offline_access"
            });

            const tokenObj = {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                created_at: Math.round(new Date() / 1000)
            };
            if (isTokenValid(tokenObj)) {
                localUserCache[email] = tokenObj;
                return tokenObj;
            } else {
                throw Error('Tesla API: Get access token failed, the new token appears to be invalid from some reason.');
            }
        } catch (err) {
            throw Error('Tesla API: Get access token failed. err: '.err);
        }
    };

    const getAccessToken = async (email, refresh_token) => {
        if (!localUserCache.hasOwnProperty(email)) {
            console.debug('Tesla API: No token found. Getting new token now...');
            return getNewTokenFromApi(email, refresh_token).then(token => token.access_token);
        } else {
            if (isTokenValid(localUserCache[email])) {
                return Promise.resolve(localUserCache[email]).then(token => token.access_token);
            } else {
                console.debug('Tesla API: Token found but expired. Getting new token now...');
                return getNewTokenFromApi(email, refresh_token).then(token => token.access_token);
            }
        }
    };

    const wakeUp = async (authToken, vehicleID, retry = 0) => {
        let state;
        if (!retry) {
            const vehicleData = await tjs.vehicleAsync({authToken, vehicleID}, null);
            state = vehicleData.state;
        }
        if (retry > 0 || state === STATE_ASLEEP) {
            console.debug('Tesla API: trying to wakeup the car. retry: ' + retry);
            const response = await tjs.wakeUpAsync({authToken, vehicleID}, null);
            if (response.state === STATE_ASLEEP) {
                await new Promise((resolve => setTimeout(() => resolve(), 5000)));
                retry++;
                if (retry < 5) {
                    console.debug('Tesla API: Wakeup retry: ' + retry);
                    await wakeUp(authToken, vehicleID, retry);
                }
            }
        }
    }

    const doCommandAndAutoWake = async (command, authToken, vehicleID, autoWakeUp, commandArgs) => {
        const commandsNoWakeup = ['vehicle', 'wakeUp']; // these commands do not need the car to be awake
        if (autoWakeUp && !commandsNoWakeup.includes(command)) {
            await wakeUp(authToken, vehicleID);
        }

        switch (command) {
            // Low level access
            case 'get':
                return tjs.getAsync({authToken, vehicleID}, commandArgs?.service, commandArgs?.qs);
            case 'post':
                return tjs.postAsync({authToken, vehicleID}, commandArgs?.service, commandArgs?.qs, commandArgs?.body);
            case 'vehicleGet':
                return tjs.get_commandAsync({authToken, vehicleID}, commandArgs?.command, commandArgs?.qs);
            case 'vehiclePost':
                return tjs.post_commandAsync({authToken, vehicleID}, commandArgs?.command, commandArgs?.qs, commandArgs?.body);

            // High level commands
            case 'vehicle':
                return tjs.vehicleAsync({authToken, vehicleID}, commandArgs);
            case 'vehicleData':
                return tjs.vehicleDataAsync({
                    authToken,
                    vehicleID
                }, commandArgs);
            case 'chargeState':
                return tjs.chargeStateAsync({authToken, vehicleID}, commandArgs);
            case 'climateState':
                return tjs.climateStateAsync({authToken, vehicleID}, commandArgs);
            case 'vehicleConfig':
                return tjs.vehicleConfigAsync({authToken, vehicleID}, commandArgs);
            case 'vehicleState':
                return tjs.vehicleStateAsync({authToken, vehicleID}, commandArgs);
            case 'driveState':
                return tjs.driveStateAsync({authToken, vehicleID}, commandArgs);
            case 'guiSettings':
                return tjs.guiSettingsAsync({authToken, vehicleID}, commandArgs);
            case 'wakeUp':
                return tjs.wakeUpAsync({authToken, vehicleID}, commandArgs);
            case 'chargeStandard':
                return tjs.chargeStandardAsync({authToken, vehicleID}, commandArgs);
            case 'chargeMaxRange':
                return tjs.chargeMaxRangeAsync({authToken, vehicleID}, commandArgs);
            case 'doorLock':
                return tjs.doorLockAsync({authToken, vehicleID}, commandArgs);
            case 'doorUnlock':
                return tjs.doorUnlockAsync({authToken, vehicleID}, commandArgs);
            case 'climateStart':
                return tjs.climateStartAsync({authToken, vehicleID}, commandArgs);
            case 'climateStop':
                return tjs.climateStopAsync({authToken, vehicleID}, commandArgs);
            case 'flashLights':
                return tjs.flashLightsAsync({authToken, vehicleID}, commandArgs);
            case 'honkHorn':
                return tjs.honkHornAsync({authToken, vehicleID}, commandArgs);
            case 'maxDefrost':
                return tjs.maxDefrostAsync({authToken, vehicleID}, commandArgs);
            case 'mediaTogglePlayback':
                return tjs.mediaTogglePlaybackAsync({authToken, vehicleID}, commandArgs);
            case 'mediaPlayNext':
                return tjs.mediaPlayNextAsync({authToken, vehicleID}, commandArgs);
            case 'mediaPlayPrevious':
                return tjs.mediaPlayPreviousAsync({authToken, vehicleID}, commandArgs);
            case 'mediaPlayNextFavorite':
                return tjs.mediaPlayNextFavoriteAsync({authToken, vehicleID}, commandArgs);
            case 'mediaPlayPreviousFavorite':
                return tjs.mediaPlayPreviousFavoriteAsync({authToken, vehicleID}, commandArgs);
            case 'mediaVolumeUp':
                return tjs.mediaVolumeUpAsync({authToken, vehicleID}, commandArgs);
            case 'mediaVolumeDown':
                return tjs.mediaVolumeDownAsync({authToken, vehicleID}, commandArgs);
            case 'mobileEnabled':
                return tjs.mobileEnabledAsync({authToken, vehicleID}, commandArgs);
            case 'navigationRequest':
                return tjs.navigationRequestAsync({
                    authToken,
                    vehicleID
                }, commandArgs);
            case 'nearbyChargers':
                return tjs.nearbyChargersAsync({authToken, vehicleID}, commandArgs);
            case 'openChargePort':
                return tjs.openChargePortAsync({authToken, vehicleID}, commandArgs);
            case 'openFrunk':
                return tjs.openTrunkAsync({authToken, vehicleID}, { which: "frunk" });
            case 'openTrunk':
                return tjs.openTrunkAsync({authToken, vehicleID}, { which: "trunk" });
            case 'remoteStart':
                return tjs.remoteStartAsync({authToken, vehicleID}, commandArgs);
            case 'resetValetPin':
                return tjs.resetValetPinAsync({authToken, vehicleID}, commandArgs);
            case 'scheduleSoftwareUpdate':
                return tjs.scheduleSoftwareUpdateAsync({authToken, vehicleID}, commandArgs);
            case 'seatHeater':
                return tjs.seatHeaterAsync({authToken, vehicleID}, commandArgs);
            case 'setChargeLimit':
                return tjs.setChargeLimitAsync({authToken, vehicleID}, commandArgs);
            case 'setChargingAmps':
                return tjs.setChargingAmpsAsync({authToken, vehicleID}, commandArgs);
            case 'setScheduledCharging':
                return tjs.setScheduledChargingAsync({authToken, vehicleID}, commandArgs);
            case 'setScheduledDeparture':
                return tjs.setScheduledDepartureAsync({
                    authToken,
                    vehicleID
                }, commandArgs);
            case 'setSentryMode':
                return tjs.setSentryModeAsync({authToken, vehicleID}, commandArgs);
            case 'setTemps':
                return tjs.setTempsAsync({authToken, vehicleID}, commandArgs);
            case 'setValetMode':
                return tjs.setValetModeAsync({authToken, vehicleID}, commandArgs);
            case 'speedLimitActivate':
                return tjs.speedLimitActivateAsync({authToken, vehicleID}, commandArgs);
            case 'speedLimitDeactivate':
                return tjs.speedLimitDeactivateAsync({authToken, vehicleID}, commandArgs);
            case 'speedLimitClearPin':
                return tjs.speedLimitClearPinAsync({authToken, vehicleID}, commandArgs);
            case 'speedLimitSetLimit':
                return tjs.speedLimitSetLimitAsync({authToken, vehicleID}, commandArgs);
            case 'startCharge':
                return tjs.startChargeAsync({authToken, vehicleID}, commandArgs);
            case 'steeringHeater':
                return tjs.steeringHeaterAsync({authToken, vehicleID}, commandArgs);
            case 'stopCharge':
                return tjs.stopChargeAsync({authToken, vehicleID}, commandArgs);
            case 'sunRoofControl':
                return tjs.sunRoofControlAsync({authToken, vehicleID}, commandArgs);
            case 'sunRoofMove':
                return tjs.sunRoofMoveAsync({authToken, vehicleID}, commandArgs);
            case 'windowControl':
                return tjs.windowControlAsync({authToken, vehicleID}, commandArgs);
            case 'vinDecode':
                return tjs.vinDecode(await tjs.vehicleAsync({authToken, vehicleID}, commandArgs));
            case 'getModel':
                return tjs.getModel(await tjs.vehicleAsync({authToken, vehicleID}, commandArgs));
            case 'getPaintColor':
                return tjs.getPaintColor(await tjs.vehicleAsync({authToken, vehicleID}, commandArgs));

            default:
                throw Error(`Tesla API: Invalid command specified: ${command}`);
        }

    };

    function TeslaConfigNode(node) {
        RED.nodes.createNode(this, node);
        this.email = node.email;
        if (this.email && this.credentials.refresh_token) {
            getAccessToken(this.email, this.credentials.refresh_token)
                .then(() => console.debug('Tesla API: access token OK'))
                .catch(err => console.error('Tesla API: getting access token failed, context:', err));
        }
    }

    RED.nodes.registerType("tesla-config", TeslaConfigNode, {
        credentials: {
            refresh_token: {type: "password"}
        }
    });

    function TeslaApiNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.teslaConfig = RED.nodes.getNode(config.teslaConfig);
        if (this.teslaConfig) {
            node.status({fill: "blue", shape: "ring", text: "Idle"});
            node.on('input', async (msg, send, done) => {

                send = send ?? function () {
                    node.send.apply(node, arguments)
                };
                const vehicleID = msg.vehicleID ?? config.vehicleID;
                const command = msg.command ?? config.command;
                const autoWakeUp = msg.autoWakeUp ?? config.autoWakeUp ?? false;
                const email = config.email;

                const {refresh_token} = node.teslaConfig.credentials;
                const {commandArgs} = msg;

                try {
                    node.status({fill: "blue", shape: "dot", text: "Working"});
                    const authToken = await getAccessToken(email, refresh_token);
                    if (command === 'vehicles') {
                        msg.payload = await tjs.vehiclesAsync({authToken}, null);
                    } else {
                        msg.payload = await doCommandAndAutoWake(command, authToken, vehicleID, autoWakeUp, commandArgs);
                    }

                    send(msg);
                    node.status({fill: "green", shape: "ring", text: "Idle"});
                } catch (err) {
                    node.status({fill: "red", shape: "dot", text: String(err).substring(0, 25)});
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
            node.warn('Tesla API: No tesla config defined');
            node.status({fill: "red", shape: "ring", text: "Invalid config"});
        }

    }

    RED.nodes.registerType("tesla-api", TeslaApiNode);

    RED.httpAdmin.get("/getvehicles/:node_id", RED.auth.needsPermission("flows.write"), async function (req, res) {

        const node = RED.nodes.getNode(req.params.node_id);
        if (!node) {
            res.json([]);
            return;
        }

        const email = node.teslaConfig.email;
        const {refresh_token} = node.teslaConfig.credentials;

        if (email && refresh_token) {
            const authToken = await getAccessToken(email, refresh_token);
            const response = await tjs.vehiclesAsync({authToken}, null);
            if (response.length) {
                res.json(response.map(item => {
                    const vehicleId = item.id_s;
                    const vehicleName = item.display_name
                    return {id: vehicleId, name: vehicleName};
                }));
            } else {
                console.warn('Tesla API: Error getting vehicle list')
            }
        } else {
            res.json([]);
        }

    });
};
