/**
 * Fabritect - The best plugin system :)
 * @author ImportProgram
 * @copyright 2018 IC
 * @license MIT
 */

const glob = require("glob")
const fs = require("fs")
const EventEmitter = require("events").EventEmitter;
const startTime = process.hrtime()

const splitAt = index => x => [x.slice(0, index), x.slice(index)]

class Fabritect extends EventEmitter {
    constructor(prefix = "Plugin") {
        super()
        this.p = prefix //Prefix for plugin control. May be changed depending on project specifications.
        this.g = {} //Groups Options
        this.c = (g, n, code) => { return code } //Global Compiler
        this.log = (group, plugin, message) => { console.log(`[${group}][${plugin}] ${message}`) } //Global Log Handler
        this.s = false //Has anything Started to load
    }
    _waiting(group, name) {
        let isGroup = (group) => {
            if (this.g[group] != null)
                return true
            return false
        }
        for (let _group in this.g) {
            for (let _name in this.g[_group].m) {
                //If hasn't mounted and is waiting
                console.log("\t--------------")
                console.log(_group)
                console.log(_name)
                console.log(this.g[_group].m[_name].m)
                console.log("\t--------------")
                if (this.g[_group].m[_name].m == false && _name != name) {
                    let consumes = this.g[_group].m[_name].c
                    for (let c_group in consumes) {
                        if (isGroup(c_group)) {
                            let canLoad = false






                            for (let c_name in consumes[c_group]) {
                                if (c_name != _name) {
                                    if (this.g[c_group].m[c_name] == undefined) {
                                        canLoad = false
                                        break;
                                    }
                                    if (this.g[c_group].m[c_name].m == true) {
                                        canLoad = true
                                        console.log(`${_group}:${_name}  -  ${c_group}:${c_name} CAN LOAD`)
                                    } else {
                                        console.log(`${_group}:${_name}  -  ${c_group}:${c_name} CANT LOAD`)
                                        canLoad = false
                                        break
                                    }
                                }
                            }
                            console.log("CAN LOAD?")
                            console.log(canLoad)
                            console.log(this.g[_group].m[_name].m)
                            if (canLoad && this.g[_group].m[_name].m == false) {
                                console.log("STILL LOADED")
                                this._load(_group, _name)
                            }
                        } else {
                            console.log("Invalid Consumable")
                        }
                    }
                }
            }
        }
    }
    /**
     * Check if the module can load successfully. 
     * @param {String} group 
     * @param {String} name 
     */
    _check(group, name) {
        let consumes = this.g[group].m[name].c
        //If no consumes, load it now
        if (Object.keys(consumes).length == 0) {
            console.log("LOADING DIRECTLY")
            this._load(group, name)
        } else {
            //Else make it wait for other to finish loading
            this.g[group].m[name].w = true
        }
    }
    /**
     * Loads the content form the package file
     * @param {File} group 
     * @param {*} name 
     */
    _load(group, name) {
        let main = this.g[group].m[name].d + this.g[group].m[name].p.main
        fs.readFile(main, 'utf8', (err, data) => {
            if (err) { console.log(err) }
            this._run(group, name, data)
        });
    }
    /**
     * Validate code that contains any "bad content" (before transforming)
     * @param {String} group 
     * @param {String} name 
     * @param {String} code 
     */
    _validate(group, name, code) {
        //Find list of strings, in a string
        let findAny = (string, list) => {
            for (let item in list) {
                if (string.indexOf(list[item]) !== -1) {
                    return true
                }
            }
            return false
        }
        //Check if we have the list of unwanted accesses in the code
        let found = findAny(code, ["constructor.constructor", ".constructor", "eval", "proto", "__proto__"])
        if (found) { //If found, return false
            return false
        }
        //If nothing is found, continue
        return true
    }
    /**
     * Transform - YESH
     * @param {String} group 
     * @param {String} name 
     * @param {String} code 
     */
    _transform(group, name, code) {
        code = this.g[group].c(group, name, code) //Transform Compile Group
        code = this.c(group, name, code) //Transform Compile Global
        return code //Return it
    }
    /**
     * Yes!
     * @param {String} group 
     * @param {String} name 
     */
    _getGlobalServices(group, name) {
        let isGroup = (group) => {
            if (this.g[group] != null)
                return true
            return false
        }
        //Gets all sections (for the group) which it can return to the module
        let getServiceSections = () => {
            if (this.g[group].o != null) {
                if (this.g[group].o.serviceSections != null) {
                    let sections = ["GLOBAL"]
                    sections = sections.concat(this.g[group].o.serviceSections)
                    return sections
                }
            }
            return ["GLOBAL"]
        }
        //Check if the section in the services can be returned to the imported object
        let isAllowedSection = (section) => {
            //Get the list of services and loop through them, check if equal
            let servicesSections = getServiceSections()
            for (let _section in servicesSections) {
                if (servicesSections[_section] == section) {
                    return true
                }
            }
            return false
        }
        //Grab the consumables
        let _consumes = this.g[group].m[name].c
        //Loop through all groups in the consume object 
        //Example: {app: {core: "1.0.0"}, plugin: {example: "1.0.0"}}
        let imports = {}
        let _returnable = (section = "GLOBAL") => {
            if (imports[section] != null) {
                return imports[section]
            }
            //Default to Global imports
            return imports["GLOBAL"]
        }
        for (let c_group in _consumes) {
            if (isGroup(c_group)) {
                for (let c_name in _consumes[c_group]) {
                    //Check if this module is real
                    if (this.g[c_group].m[c_name] != null) {
                        //Check if the module has ACTUALLY register services
                        if (this.g[c_group].m[c_name].r) {
                            for (let section in this.g[c_group].m[c_name].s) {
                                //Now check if we can make that section
                                if (isAllowedSection(section)) {
                                    //Now make the imports based on each section (so GLOBAL, etc)
                                    imports[section] = {}
                                    //Check if that group has been created for the SECTION
                                    if (imports[section][c_group] == null) {
                                        imports[section][c_group] = {}
                                    }
                                    //Make a local object to store all callbacks for the functions
                                    let local = {}
                                    let _ = this
                                    for (let service in this.g[c_group].m[c_name].s[section]) {
                                        local[service] = function () {
                                            var args = Array.prototype.slice.call(arguments);
                                            args.unshift(name);
                                            args.unshift(group);
                                            let a = _.g[c_group].m[c_name].s[section][service].load.apply(this, args);
                                            if (a) {
                                                return a
                                            }
                                        }
                                    }
                                    imports[section][c_group][c_name] = local
                                }
                            }
                        } else {
                            console.log(`${c_group}:${c_name} hasn't registered anything, no imports`)
                        }
                    }
                }
            }
        }
        return _returnable
    }
    /**
     * Runtime Procedure (validates, transforms, mounts, registers, ends) 
     * @param {String} group 
     * @param {String} name 
     * @param {String} code 
     */
    async _run(group, name, code) {
        let groupOptions = this.g[group].o

        //Custom Console to pass onto a MODULE
        let customRequire = (module) => { console.log(`REQURING of '${module}' is not allowed`) }
        if (groupOptions.require) {
            customRequire = require
        }

        /**
         * customInterval - A normal interval that supports unloading
         * @param {Function} callback
         */
        let customInterval = (callback, time) => {
            let interval = setInterval(() => {
                callback()
            }, time)
            this.g[group].m[name].sI.push(interval)
        }
        /**
         * customTimeout - A normal timeout that supports unloading
         * @param {Function} callback 
         */
        let customTimeout = (callback, time) => {
            let timeout = setTimeout(() => {
                callback()
            }, time)
            this.g[group].m[name].sT.push(timeout)
        }

        let _ = this
        //Register the services here.
        let register = (services) => {
            _.g[group].m[name].r = true
            _.g[group].m[name].s = services
        }

        //Runtime Environment (mounting and ending)
        let runtime = {
            onMount: (callback) => {
                if (callback) {
                    let imports = _._getGlobalServices(group, name)
                    callback(imports, register)
                    this.g[group].m[name].m = true
                    console.log("----- ON MOUNT ---")
                    console.log(group)
                    console.log(name)
                    console.log(this.g[group].m[name].m)
                    console.log("------ END MOUNT -------")
                    if (_.g[group].m[name].r == false) {
                        _.log(group, name, `NO SERVICES OFFERED`)
                    }
                    _._waiting(group, name)
                    //Now check on modules waiting for this to load
                }

            },
            getGroup: () => {
                //TODO
            },
            end() {
                if (_.g[group].m[name].e == null) {
                    _.g[group].m[name].e = ((process.hrtime(startTime)[0] * 1000) + (process.hrtime(startTime)[1] / 1000000)).toFixed(3)
                }
            }
        }
        //Global prefix
        let id = this.p
        //Code Structure
        let newCode = `module.exports = function(require, console, include, ${id}, setInterval, setTimeout) { 
            var indexedDB = null;
            var location = null;
            var navigator = null;
            var onerror = null;
            var onmessage = null;
            var performance = null;
            var self = null;
            var webkitIndexedDB = null;
            var postMessage = null;
            var close = null;
            var openDatabase = null;
            var openDatabaseSync = null;
            var webkitRequestFileSystem = null;
            var webkitRequestFileSystemSync = null;
            var webkitResolveLocalFileSystemSyncURL = null;
            var webkitResolveLocalFileSystemURL = null;
            var addEventListener = null;
            var dispatchEvent = null;
            var removeEventListener = null;
            var dump = null;
            var onoffline = null;
            var ononline = null;
            var importScripts = null;
            var application = null;
            let process = null;
            let exports = null;
            let __dirname = null;
            //let eval = null
            return () => {
                ${code}
                ${id}.end();
            } 
        }`;
        let include = null
        //validate the code (constructor.constructor)
        //transform the code (both global and based on each)
        let safe = this._validate(group, name, code)
        if (safe) {
            let compiled = this._transform(group, name, newCode)
            let launchCode = eval(compiled);
            //let launchCode = () => {}
            //Run the code
            let log = { log: (message) => { this.log(group, name, message) } }
            launchCode(customRequire,
                log,
                include,
                runtime,
                customInterval,
                customTimeout)()

        } else {
            console.log(`Invalid Syntax in: ${group}:${name}`)
        }
    }
    _end() {

    }
    _registered() {
        //When the plugins registers the services
        for (let group in this.g) {
            for (let name in this.g[group]) {
                if (this.g[group].m[name].w) {

                }
            }
        }
    }
    /////////////////////////////////////////////////////////////////////////
    /**
     * createGroup - Create a Group to define an environment for the plugins
     * @param {String} group 
     * @param {Object} options 
     */
    createGroup(group, options) {
        let self = this
        let instance = {
            addCompiler(callback) {
                //Check if we have a callback
                if (callback === Function) {
                    this.g[group].c = callback
                }
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
                fs.access(folder, fs.F_OK, (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    glob(`${folder}/*/package.json`, function (er, files) {
                        files.map(function (item) {
                            fs.readFile(item, 'utf8', function (err, data) {
                                try {
                                    let obj = JSON.parse(data);
                                    if (obj.name != undefined && obj.fabritect.consumes != undefined) {
                                        let name = obj.name
                                        if (self.g[group].m[name] == null) {
                                            self.g[group].m[name] = {} //make object for that plugin on that group
                                            self.g[group].m[name].p = obj //Save the package (for later)
                                            self.g[group].m[name].f = true //Loaded from a file
                                            self.g[group].m[name].sT = [] //Timemouts
                                            self.g[group].m[name].sI = [] //Intervals
                                            self.g[group].m[name].i = [] //Includables
                                            self.g[group].m[name].e = null  //End time
                                            self.g[group].m[name].m = false //Mounted?
                                            self.g[group].m[name].r = false //Register?
                                            self.g[group].m[name].s = {} //Services

                                            //Get directory of the plugin
                                            let path = item.replace(/\\/g, "/");
                                            let dir = splitAt(path.lastIndexOf("/"))(path)[0] + '/'
                                            self.g[group].m[name].d = dir //Set it to the plugin


                                            //Check for consumables
                                            let consume = {}
                                            for (let item in obj.fabritect.consumes) {
                                                let [_group, _plugin] = item.split("@");
                                                let ver = obj.fabritect.consumes[item]
                                                if (consume[_group] == null) {
                                                    consume[_group] = {}
                                                }
                                                consume[_group][_plugin] = ver
                                            }
                                            self.g[group].m[name].c = consume
                                            self._check(group, obj.name)
                                        } else {
                                            self.log(group, `${name}??`, "A module with this name has already loaded for this group.")
                                        }
                                    }
                                } catch (e) {
                                    console.log(e)
                                    self.log(group, "?", `Failed to load package: ${item}`)
                                }
                            });
                        })
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
            this.g[group].m = {} //Modules in this group
            this.g[group].c = (g, n, code) => { return code } //Add the compiler callback
            let i = instance //Get the instance (local)

            this.g[group].i = i //Set the intstance
            return i //Return the instance
        }
        return null
    }
    addGlobalCompile(callback) {
        if (callback === Function) {
            this.c = callback
        }
    }
    onLog(callback) {
        if (callback === Function) {
            this.f = callback
        }
    }
}
module.exports = Fabritect
