module.exports = function (RED) {

    const crypto = require('crypto');
    const tjs = require('@gaphi/teslajs');

    var localUserCache = {};

    const isTokenExpired = (tokenObj) => tokenObj.created_at + tokenObj.expires_in < Math.round(new Date() / 1000);

    const isTokenValid = tokenObj => tokenObj && tokenObj.access_token && !isTokenExpired(tokenObj);

    const getCredHash = (email, password) => crypto.createHash('md5')
        .update(email + password).digest('base64');

    const getNewTokenFromApi = async (email, password) => {
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
        throw Error('Tesla API: Get access token failed');
    };

    const getToken = async (email, password) => {
        const credHash = getCredHash(email, password);
        if (!localUserCache.hasOwnProperty(credHash)) {
            console.debug('Tesla API: No token found. Getting new token now...');
            return getNewTokenFromApi(email, password).then(token => token.access_token);
        } else {
            if (isTokenValid(localUserCache[credHash])) {
                return Promise.resolve(localUserCache[credHash]).then(token => token.access_token);
            } else {
                console.debug('Tesla API: Token found but expired. Getting new token now...');
                return getNewTokenFromApi(email, password).then(token => token.access_token);
            }
        }
    };

    const wakeUp = async (authToken, vehicleID) => {
        const vehicleData = await tjs.vehicleAsync({authToken, vehicleID});
        if (vehicleData.state && vehicleData.state === "asleep") {
            const wakeupResult = await tjs.wakeUpAsync({authToken, vehicleID});
            await new Promise((resolve => setTimeout(() => resolve(), 1000)));
        }
    }

    const doCommandAndAutoWake = async (command, authToken, vehicleID, autoWakeUp, commandArgs) => {
        const commandsNoWakeup = ['vehicle', 'wakeUp'];
        if (autoWakeUp && !commandsNoWakeup.includes(command)) {
            await wakeUp(authToken, vehicleID);
        }

        switch (command) {
            case 'vehicle': return tjs.vehicleAsync({authToken, vehicleID});
            case 'vehicleData': return tjs.vehicleDataAsync({authToken, vehicleID});
            case 'chargeState': return tjs.chargeStateAsync({authToken, vehicleID});
            case 'climateState': return tjs.climateStateAsync({authToken, vehicleID});
            case 'vehicleConfig': return tjs.vehicleConfigAsync({authToken, vehicleID});
            case 'vehicleState': return tjs.vehicleStateAsync({authToken, vehicleID});
            case 'driveState': return tjs.driveStateAsync({authToken, vehicleID});
            case 'guiSettings': return tjs.guiSettingsAsync({authToken, vehicleID});
            case 'wakeUp': return tjs.wakeUpAsync({authToken, vehicleID});
            case 'chargeStandard': return tjs.chargeStandardAsync({authToken, vehicleID});
            case 'chargeMaxRange': return tjs.chargeMaxRangeAsync({authToken, vehicleID});
            case 'doorLock': return tjs.doorLockAsync({authToken, vehicleID});
            case 'doorUnlock': return tjs.doorUnlockAsync({authToken, vehicleID});
            case 'climateStart': return tjs.climateStartAsync({authToken, vehicleID});
            case 'climateStop': return tjs.climateStopAsync({authToken, vehicleID});
            case 'flashLights': return tjs.flashLightsAsync({authToken, vehicleID});
            case 'honkHorn': return tjs.honkHornAsync({authToken, vehicleID});
            case 'maxDefrost': return tjs.maxDefrostAsync({authToken, vehicleID}, commandArgs.onoff);
            case 'mediaTogglePlayback': return tjs.mediaTogglePlaybackAsync({authToken, vehicleID});
            case 'mediaPlayNext': return tjs.mediaPlayNextAsync({authToken, vehicleID});
            case 'mediaPlayPrevious': return tjs.mediaPlayPreviousAsync({authToken, vehicleID});
            case 'mediaPlayNextFavorite': return tjs.mediaPlayNextFavoriteAsync({authToken, vehicleID});
            case 'mediaPlayPreviousFavorite': return tjs.mediaPlayPreviousFavoriteAsync({authToken, vehicleID});
            case 'mediaVolumeUp': return tjs.mediaVolumeUpAsync({authToken, vehicleID});
            case 'mediaVolumeDown': return tjs.mediaVolumeDownAsync({authToken, vehicleID});
            case 'mobileEnabled': return tjs.mobileEnabledAsync({authToken, vehicleID});
            case 'navigationRequest': return tjs.navigationRequestAsync({authToken, vehicleID}, commandArgs.subject, commandArgs.text, commandArgs.locale);
            case 'nearbyChargers': return tjs.nearbyChargersAsync({authToken, vehicleID});
            case 'openChargePort': return tjs.openChargePortAsync({authToken, vehicleID});
            case 'openFrunk': return tjs.openTrunkAsync({authToken, vehicleID}, "frunk");
            case 'openTrunk': return tjs.openTrunkAsync({authToken, vehicleID}, "trunk");
            case 'remoteStart': return tjs.remoteStartAsync({authToken, vehicleID}, commandArgs.password);
            case 'resetValetPin': return tjs.resetValetPinAsync({authToken, vehicleID});
            case 'scheduleSoftwareUpdate': return tjs.scheduleSoftwareUpdateAsync({authToken, vehicleID}, commandArgs.offset);
            case 'seatHeater': return tjs.seatHeaterAsync({authToken, vehicleID}, commandArgs.heater, commandArgs.level);
            case 'setChargeLimit': return tjs.setChargeLimitAsync({authToken, vehicleID}, commandArgs.amt);
            case 'setChargingAmps': return tjs.setChargingAmpsAsync({authToken, vehicleID}, commandArgs.amps);
            case 'setScheduledCharging': return tjs.setScheduledChargingAsync({authToken, vehicleID}, commandArgs.enable, commandArgs.time);
            case 'setScheduledDeparture': return tjs.setScheduledDepartureAsync({authToken, vehicleID}, commandArgs.enable, commandArgs.departure_time, commandArgs.preconditioning_enabled, commandArgs.preconditioning_weekdays_only, commandArgs.off_peak_charging_enabled, commandArgs.off_peak_charging_weekdays_only, commandArgs.end_off_peak_time);
            case 'setSentryMode': return tjs.setSentryModeAsync({authToken, vehicleID}, commandArgs.onoff);
            case 'setTemps': return tjs.setTempsAsync({authToken, vehicleID}, commandArgs.driver, commandArgs.pass);
            case 'setValetMode': return tjs.setValetModeAsync({authToken, vehicleID}, commandArgs.onoff, commandArgs.pin);
            case 'speedLimitActivate': return tjs.speedLimitActivateAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitDeactivate': return tjs.speedLimitDeactivateAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitClearPin': return tjs.speedLimitClearPinAsync({authToken, vehicleID}, commandArgs.pin);
            case 'speedLimitSetLimit': return tjs.speedLimitSetLimitAsync({authToken, vehicleID}, commandArgs.limit);
            case 'startCharge': return tjs.startChargeAsync({authToken, vehicleID});
            case 'steeringHeater': return tjs.steeringHeaterAsync({authToken, vehicleID}, commandArgs.level);
            case 'stopCharge': return tjs.stopChargeAsync({authToken, vehicleID});
            case 'sunRoofControl': return tjs.sunRoofControlAsync({authToken, vehicleID}, commandArgs.state);
            case 'sunRoofMove': return tjs.sunRoofMoveAsync({authToken, vehicleID}, commandArgs.percent);
            case 'windowControl': return tjs.windowControlAsync({authToken, vehicleID}, commandArgs.command);
            case 'vinDecode': return tjs.vinDecode(await tjs.vehicleAsync({authToken, vehicleID}));
            case 'getModel': return tjs.getModel(await tjs.vehicleAsync({authToken, vehicleID}));
            case 'getPaintColor': return tjs.getPaintColor(await tjs.vehicleAsync({authToken, vehicleID}));

            default:
                throw Error(`Tesla API: Invalid command specified: ${command}`);
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
                .then(() => console.debug('Tesla API: Login success'))
                .catch(err => console.error('Tesla API: Login failed, context:', err));
        }
    }

    RED.nodes.registerType("tesla-config", TeslaConfigNode, {
        credentials: {
            email: {type: "text"},
            password: {type: "password"},
            manualToken: {type: "password"}
        }
    });

    function TeslaApiNode(config) {
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

                // TODO: Remove manual token when auth flow is fixed in TeslaJs
                const {email, password, manualToken} = node.teslaConfig.credentials;
                const { commandArgs } = msg;
                if (command === 'remoteStart') {
                    commandArgs.password = password;
                }

                try {
                    const authToken = manualToken ? manualToken : await getToken(email, password);
                    if (command === 'vehicles') {
                        msg.payload = await tjs.vehiclesAsync({authToken});
                    } else {
                        msg.payload = await doCommandAndAutoWake(command, authToken, vehicleID, true, commandArgs);
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
            node.warn('Tesla API: No tesla config defined');
        }

    }

    RED.nodes.registerType("tesla-api", TeslaApiNode);
};
