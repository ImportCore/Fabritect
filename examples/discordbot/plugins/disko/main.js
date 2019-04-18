Plugin.onMount((imports, register) => {
    console.log("PING LOADED")

    //Grab command for the command API
    let command = imports.app.command
    //Grab fetch from the core
    let fetch = imports.app.core.getFetch()




    /**
     * Create a new command for ping
     * @reference /app/command for API
     */
    command.newCommand("ping", (message) => {
        message.reply("PONG")
    })
    command.newCommand("cat", (message) => {
        try {
            fetch('https://aws.random.cat/meow').then(res => {
                let embed = imports.app.core.makeImage(res.body.file)
                return message.channel.send({ embed });
            });
        } catch (err) {
            return message.channel.send(err.stack);
        }
    })
    //Still needed
    register({})
})