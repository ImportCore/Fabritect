Plugin.onMount((imports, register) => {
    let client = imports.app.core._.APP.getClient()

    register({
        GLOBAL: {
            /**
             * newCommand - Adds a command to the command object
             */
            createChannel: async (info, id, name, callback) => {
                try {
                    let guild = client.guilds.get(id)
                    await guild.createChannel(name);
                    callback(true)
                } catch(e) {
                    callback(e)
                }
            }

        }
    })
})