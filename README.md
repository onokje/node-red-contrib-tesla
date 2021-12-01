# Node red contrib tesla

Node red nodes for controlling and communicating with Tesla devices, like the Model 3 and Model S electric cars. Based on the [TeslaJS](https://github.com/mseminatore/TeslaJS) library.

## How to install:
Run `npm install @gaphi/node-red-contrib-tesla --save` or just install it from the Node-red dashboard (manage palette).

## 2.0 updates:
I made a lot of changes in this update:
- new auth flow (email and refresh token). The teslaJS library is no longer used to fetch the token, but it is still used for all other commands. Therefor, the newer commands (like setting the charging amps) are not supported just yet. Just be patient a bit longer, i will add them in time.
- Autowakeup is now a setting (it was always enabled, now you can choose). It's also overwritable by setting `msg.autoWakeUp`.
- Auto-retrying the wakeup command 5 times with 4 second intervals. In my case this was always enough to get any command to work. No more complex try-catch-delay nodes needed!
- auto fetching the vehicle list
- Node statusses

## How to use:
First of all, you need a third party solution to generate a Tesla API refresh token, for example:
-  Android: [Tesla Tokens](https://play.google.com/store/apps/details?id=net.leveugle.teslatokens)
-  iOS: [Auth App for Tesla](https://apps.apple.com/us/app/auth-app-for-tesla/id1552058613)
-  TeslaFi: [Tesla v3 API Tokens](https://support.teslafi.com/en/communities/1/topics/16979-tesla-v3-api-tokens)

This package only has one node (and one configuration node).  
When you add the tesla api node to your flow, you must create a new configuration with your tesla account email and refresh token. Access tokens will be generated automatically by the node whenever needed.

## Node: tesla api
This is the node that allows you to send commands to the Tesla api.
Create a tesla account configuration (see above), and then deploy the node first. Then open (edit) it again. Now the vehicle list should be populated automatically.
The vehicle id can also be set by setting the `msg.vehicleID` property. Make sure to use the `id_s` property from the Tesla API response.
You can select a command from the list, or set the  `msg.command` property to override it. 
Some commands require extra arguments. Set the `msg.commandArgs` property with an object of the required arguments. 
For example, when you use the `navigationRequest` command, you need 3 arguments: `subject`, `text`, and `locale`.

```
msg.commandArgs = {subject: "my subject value", text: "My text value", locale: "en"} 
```

Select 'Wakeup car automatically', but you can also override this by setting then `msg.autoWakeUp` property.
Any output returned by the command will be set on the `msg.payload` property.

See example flow in ./src/examples for more details.

## Work in progress

This node should be fairly stable, but i haven't tested any devices other than the Model 3. 
In the future, i hope to be able to support all Tesla devices, including the Powerwall and solar installations. 

## FAQ
#### I am getting 404 responses
You have probably used the wrong vehicle Id. Use the vehicles command and use the `id_s` property from the response.

#### I am getting a 408 response
This means that your vehicle is not awake, or not able to respond for another reason. Selecting autoWakeup is the easiest solution. When selected, the node will try waking up the car first. It will automatically retry 5 times. Sometimes this may not be enough. The vehicle may have bad reception or no connection at all. Just try again later.

#### How do i login, enter the captcha or my MFA token? 
Since Tesla updated it's authentication flow, it is no longer possible to login automatically. You need to use a third party solution to obtain a refresh token. This token is valid for a long time, and the api node will automatically fetch a new access token whenever necessary.
A few third party options to generate a Tesla refresh token:
-  Android: [Tesla Tokens](https://play.google.com/store/apps/details?id=net.leveugle.teslatokens)
-  iOS: [Auth App for Tesla](https://apps.apple.com/us/app/auth-app-for-tesla/id1552058613)
-  TeslaFi: [Tesla v3 API Tokens](https://support.teslafi.com/en/communities/1/topics/16979-tesla-v3-api-tokens)