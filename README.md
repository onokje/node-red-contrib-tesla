# Node red contrib tesla

Node red nodes for controlling and communicating with Tesla devices, like the Model 3 and Model S electric cars. Based on the [TeslaJS](https://github.com/mseminatore/TeslaJS) library.

## How to install:
Run `npm add node-red-contrib-tesla --save` or just install it from the Node-red dashboard (manage palette).

## How to use:
This package only has one node (and one configuration node). You don't have to worry about auth tokens, it will be handled automatically. 
When you add the tesla api node to your flow, you must create a new configuration with your tesla account email and password. 
The vehicle ID is optional, but you can only use the list vehicles command if you leave it blank. Use that command to determine your vehicle id. 
It is the `id_s` property on the vehicle info response. Enter it in the configuration. Now you can execute all commands.

## Node: tesla api
This is the node that allows you to send commands to the Tesla api. You can select a command from the list, or set the  `msg.command` property to override it. 
Some commands require extra arguments. Set the `msg.commandArgs` property with an object of the required arguments. 
For example, when you use the `navigationRequest` command, you need 3 arguments: `subject`, `text`, and `locale`.

```
msg.commandArgs = {subject: "my subject value", text: "My text value", locale: "en"} 
```

Any output returned by the command will be set on the `msg.payload` property.

See example flow in ./src/examples for more details.

## Work in progress

This node should be fairly stable, but i haven't tested any devices other than the Model 3. 
In the future, i hope to be able to support all Tesla devices, including the Powerwall and solar installations. 

## FAQ
#### I am getting 404 responses
You have probably used the wrong vehicle Id. Use the vehicles command and use the `id_s` property from the response.

#### I am getting a 408 response
This means that your vehicle didn't respond quickly enough. It happens when your vehicle was just woken up. Just wait 3 seconds and try it again.
