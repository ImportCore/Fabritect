/**
 * Fabritect - The best plugin system :)
 * @author ImportProgram
 * @copyright 2018 ImportCore
 * @license MIT
 */

var glob = require("glob")
var EventEmitter = require('events').EventEmitter;
const startTime = process.hrtime()


class Fabritect extends EventEmitter {
    constructor(prefix = "Plugin") {
        this.p = prefix //Prefix for plugin control. May be changed depending on project specifications.
        this.g = {} //Groups Options
    }
    createGroup(group, options) {
        let instance = {
            addCompiler(callback) {
                this.g[group].c = callback
            },
            loadString(code, pack) {

            },
            /**
             * Load a module via its package file
             * @param {JSON} package 
             */
            loadPackage(pack) {

            },
            /**
            * Attempts to load a modules found in sub folders of the folder
            * @param {String} name 
            */
            loadFolder(folder) {
                console.log(`${folder}/*/package.json`)
                glob(`${folder}/*/package.json`, function (er, files) {
                    files.map(function (item) {
                        console.log(item)
                    })
                })
            },
            /**
             * Attempts to unload a module
             * @param {String} name 
             */
            unload(name) {

            }
        }
        if (this.g[group] == null) {
            this.g[group] = {} //Make the object for the group
            this.g[group].o = options //Set the options
            this.g[group].c = (code) => { return code } //Add the compiler callback

            let i = instance //Get the instance (local)

            this.g[group].i = i //Set the intstance
            return i //Return the instance
        }
        return null
    }
    addGlobalCompile() {

    }
    onLog() {

    }
}



module.exports = Fabritect
/**
 *
 */