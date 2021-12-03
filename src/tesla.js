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
            const vehicleData = await tjs.vehicleAsync({authToken, vehicleID});
            state = vehicleData.state;
        }
        if (retry > 0 || state === STATE_ASLEEP) {
            console.debug('Tesla API: trying to wakeup the car. retry: ' + retry);
            const response = await tjs.wakeUpAsync({authToken, vehicleID});
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
            case 'vehicle':
                return tjs.vehicleAsync({authToken, vehicleID});
            case 'vehicleData':
                return tjs.vehicleDataAsync({authToken, vehicleID});
            case 'chargeState':
                return tjs.chargeStateAsync({authToken, vehicleID});
            case 'climateState':
                return tjs.climateStateAsync({authToken, vehicleID});
            case 'vehicleConfig':
                return tjs.vehicleConfigAsync({authToken, vehicleID});
            case 'vehicleState':
                return tjs.vehicleStateAsync({authToken, vehicleID});
            case 'driveState':
                return tjs.driveStateAsync({authToken, vehicleID});
            case 'guiSettings':
                return tjs.guiSettingsAsync({authToken, vehicleID});
            case 'wakeUp':
                return tjs.wakeUpAsync({authToken, vehicleID});
            case 'chargeStandard':
                return tjs.chargeStandardAsync({authToken, vehicleID});
            case 'chargeMaxRange':
                return tjs.chargeMaxRangeAsync({authToken, vehicleID});
            case 'doorLock':
                return tjs.doorLockAsync({authToken, vehicleID});
            case 'doorUnlock':
                return tjs.doorUnlockAsync({authToken, vehicleID});
            case 'climateStart':
                return tjs.climateStartAsync({authToken, vehicleID});
            case 'climateStop':
                return tjs.climateStopAsync({authToken, vehicleID});
            case 'flashLights':
                return tjs.flashLightsAsync({authToken, vehicleID});
            case 'honkHorn':
                return tjs.honkHornAsync({authToken, vehicleID});
            case 'maxDefrost':
                return tjs.maxDefrostAsync({authToken, vehicleID});
            case 'mediaTogglePlayback':
                return tjs.mediaTogglePlaybackAsync({authToken, vehicleID});
            case 'mediaPlayNext':
                return tjs.mediaPlayNextAsync({authToken, vehicleID});
            case 'mediaPlayPrevious':
                return tjs.mediaPlayPreviousAsync({authToken, vehicleID});
            case 'mediaPlayNextFavorite':
                return tjs.mediaPlayNextFavoriteAsync({authToken, vehicleID});
            case 'mediaPlayPreviousFavorite':
                return tjs.mediaPlayPreviousFavoriteAsync({authToken, vehicleID});
            case 'mediaVolumeUp':
                return tjs.mediaVolumeUpAsync({authToken, vehicleID});
            case 'mediaVolumeDown':
                return tjs.mediaVolumeDownAsync({authToken, vehicleID});
            case 'mobileEnabled':
                return tjs.mobileEnabledAsync({authToken, vehicleID});
            case 'navigationRequest':
                return tjs.navigationRequestAsync({
                    authToken,
                    vehicleID
                }, commandArgs.subject, commandArgs.text, commandArgs.locale);
            case 'nearbyChargers':
                return tjs.nearbyChargersAsync({authToken, vehicleID});
            case 'openChargePort':
                return tjs.openChargePortAsync({authToken, vehicleID});
            case 'openFrunk':
                return tjs.openTrunkAsync({authToken, vehicleID}, "frunk");
            case 'openTrunk':
                return tjs.openTrunkAsync({authToken, vehicleID}, "trunk");
            case 'remoteStart':
                return tjs.remoteStartAsync({authToken, vehicleID});
            case 'resetValetPin':
                return tjs.resetValetPinAsync({authToken, vehicleID});
            case 'scheduleSoftwareUpdate':
                return tjs.scheduleSoftwareUpdateAsync({authToken, vehicleID}, commandArgs.offset);
            case 'seatHeater':
                return tjs.seatHeaterAsync({authToken, vehicleID}, commandArgs.heater, commandArgs.level);
            case 'setChargeLimit':
                return tjs.setChargeLimitAsync({authToken, vehicleID}, commandArgs.amt);
            case 'setChargingAmps':
                return tjs.setChargingAmpsAsync({authToken, vehicleID}, commandArgs.amps);
            case 'setScheduledCharging':
                return tjs.setScheduledChargingAsync({authToken, vehicleID}, commandArgs.enable, commandArgs.time);
            case 'setScheduledDeparture':
                return tjs.setScheduledDepartureAsync({
                    authToken,
                    vehicleID
                }, commandArgs.enable, commandArgs.departure_time, commandArgs.preconditioning_enabled, commandArgs.preconditioning_weekdays_only, commandArgs.off_peak_charging_enabled, commandArgs.off_peak_charging_weekdays_only, commandArgs.end_off_peak_time);
            case 'setSentryMode':
                return tjs.setSentryModeAsync({authToken, vehicleID}, commandArgs.onoff);
            case 'setTemps':
                return tjs.setTempsAsync({authToken, vehicleID}, commandArgs.driver, commandArgs.pass);
            case 'setValetMode':
                return tjs.setValetModeAsync({authToken, vehicleID}, commandArgs.onoff, commandArgs.pin);
            case 'speedLimitActivate':
                return tjs.speedLimitActivateAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitDeactivate':
                return tjs.speedLimitDeactivateAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitClearPin':
                return tjs.speedLimitClearPinAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitSetLimit':
                return tjs.speedLimitSetLimitAsync({authToken, vehicleID}, commandArgs.limit);
            case 'startCharge':
                return tjs.startChargeAsync({authToken, vehicleID});
            case 'steeringHeater':
                return tjs.steeringHeaterAsync({authToken, vehicleID}, commandArgs.level);
            case 'stopCharge':
                return tjs.stopChargeAsync({authToken, vehicleID});
            case 'sunRoofControl':
                return tjs.sunRoofControlAsync({authToken, vehicleID}, commandArgs.state);
            case 'sunRoofMove':
                return tjs.sunRoofMoveAsync({authToken, vehicleID}, commandArgs.percent);
            case 'windowControl':
                return tjs.windowControlAsync({authToken, vehicleID}, commandArgs.command, commandArgs.lat, commandArgs.lon);
            case 'vinDecode':
                return tjs.vinDecode(await tjs.vehicleAsync({authToken, vehicleID}));
            case 'getModel':
                return tjs.getModel(await tjs.vehicleAsync({authToken, vehicleID}));
            case 'getPaintColor':
                return tjs.getPaintColor(await tjs.vehicleAsync({authToken, vehicleID}));

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
                        msg.payload = await tjs.vehiclesAsync({authToken});
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
            const response = await tjs.vehiclesAsync({authToken});
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
