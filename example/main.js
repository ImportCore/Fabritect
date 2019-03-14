let Fabritect = require("../index");
let fab = new Fabritect()
let app = fab.createGroup("APP")
let plugins = fab.createGroup("PLUGINS")
console.log(app)
app.loadFolder("_plugins")