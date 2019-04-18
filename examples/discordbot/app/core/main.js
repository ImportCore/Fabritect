console.log("LOADED CORE")
Plugin.onMount((imports, register) => {

    //Load discord.js
    const Discord = require('discord.js');
    const client = new Discord.Client();

    //Also get a request lib ready for use
    const { get } = require('snekfetch');

    //Client ready
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
    });
    //Login the client with an bot token (probably should be a .env file but whatever)
    client.login("token")
    //Register services
    register({
        //Global
        GLOBAL: {
            //Returns the function for fetching values
            getFetch: () => {
                return get
            },
            //Shows an image via a discord rich embed
            makeImage: (info, url) => {
                console.log(url)
                const embed = new Discord.RichEmbed()
                .setImage(url)
                return embed
            }
        },
        //App Section (only for APP modukes)
        APP: {
            //Can get client
            getClient: () => {
                return client
            }
        }
    })
})