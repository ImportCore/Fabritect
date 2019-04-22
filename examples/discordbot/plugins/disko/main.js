Plugin.onMount((imports, register) => {
    console.log("PING LOADED")

    //Grab command for the command API
    let command = imports.app.command
    //Grab fetch from the core
    let fetch = imports.app.core.getFetch()
    let { createChannel } = imports.app.guild



    /**
     * Create a new command for ping
     * @reference /app/command for API
     */
    command.newCommand("ping", (message) => {
        message.reply("PONG")
    })
    command.newCommand("cheese", (message) => {
        message.channel.send("I SMEELLLL CHEESE :cheese:")
    })
    command.newCommand("channel", (message, cmd, guild) => {
        console.log(cmd[2])
        createChannel(guild, cmd[2], (out) => {
            if (out == true) {
                message.channel.send("CREATE CHANNEL")
            } else {
                message.channel.send(out.stack)
            }
        })
    })
    command.newCommand("cat", (message, guild) => {
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