Plugin.onMount((imports, register) => {
    //List of commands for each plugin
    let commands = {}
    
    //Get the client via the custom services, using the APP section
    let client = imports.app.core._.APP.getClient()

    //Create the message handler
    client.on("message", (message) => {

        //Check if a prefix is found on the message
        if (message.content.startsWith("!")) {
            //Remove the prefix and split at space
            let cmd = message.content.substring(1).split(" ")
            //Now check if the first part of the string (0 index in array aka the plugin name) is found in the commands object
            if (commands.hasOwnProperty(cmd[0])) {
                //If so, also check if the command is found
                if (commands[cmd[0]].hasOwnProperty(cmd[1])) {
                    //If so run the callback from the command.
                    commands[cmd[0]][cmd[1]](message)
                }
            }
        }
    })
    register({
        GLOBAL: {
            /**
             * newCommand - Adds a command to the command object
             */
            newCommand: (info, command, callback) => {
                //Get the name of the plugin
                let name = info.name
                //Check if this plugin has already made an object
                if (commands[name] == null) {
                    commands[name] = {} //If not create it
                }
                //Check if this plugin has already made this command
                if (commands[name][command] == null) {
                    commands[name][command] = callback //If not make it
                } else {
                    //If they did, give a warning (which could be useful?)
                    console.log("Already created")
                }
            }

        }
    })
})