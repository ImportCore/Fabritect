
/**
 * Fabritect - Modular Module Manager
 * @author ImportProgram
 * @copyright 2018 IC
 * @license MIT
 */


const fs = require("fs")
const EventEmitter = require("events").EventEmitter;
const treeify = require('treeify');
const startTime = process.hrtime()
const chalk = require('chalk');

let { splitAt, doesExist, getPackages, timeDiff } = require("./helper")

let formatConsumes = (consumes) => {
    let list = {}
    for (let item in consumes) {
        let [_group, _module] = item.split("@");
        let ver = consumes[item]
        if (list[_group] == null) {
            list[_group] = {}
        }
        list[_group][_module] = ver
    }
    return list
}


//Make Class
module.exports = class Fabritect extends EventEmitter {
    constructor(prefix = "Plugin") {
        super()
        this.l = [] //List of loaded async modules
        this.p = prefix //Prefix for modules
        this.g = {} //Group Object
        this.c = (g, n, code) => { return code }
    }
    _isGroup(group) {
        return g.hasOwnProperty(group)
    }
    /**
     * transform - Transform Code via installed compiler
     * @param {String} g [Group] name of group
     * @param {String} n [Name] name of module
     * @param {String} code [Code] code of module
     */
    _transform(g, n, code) {
        //Check if its a real group 
        if (this._isGroup(g)) {
            //Check that it has a compiler method
            if (g[group].hasOwnProperty("c")) {
                code = this.g[group].c(g, n, code)
            }
        }
        //Global Compiler
        code = this.c(g, n, code)
    }
    _transform(group, name, code) {
        return `//# sourceURL=${group.toUpperCase()}.${name.toUpperCase()}.\n${code}`
    }
    _validate(group, name, code) {
        return true
    }
    /**
     * 
     * @param {*} name 
     * @param {*} settings 
     */
    createGroup(g, options) {
        /**
         * isFolder - Checks if a thing is a folder, async
         * @param {String} folder 
         */
        let self = this
        let _loadFolder = async (folder) => {
            return new Promise(async (resolve) => {
                if (await doesExist(folder)) {
                    let files = await getPackages(folder)
                    files.map(async (item) => {
                        if (await doesExist(item)) {
                            fs.readFile(item, 'utf8', async (err, packageData) => {
                                let obj = JSON.parse(packageData)
                                let path = item.replace(/\\/g, "/");
                                let dir = splitAt(path.lastIndexOf("/"))(path)[0] + '/'
                                if (obj.hasOwnProperty("name") && obj.hasOwnProperty("main")) {
                                    let mainFile = dir + obj.main
                                    if (!doesExist(mainFile)) {
                                        console.log("No main file")
                                    }
                                    let name = obj.name
                                    if (self.g[g].m[name] == null) {
                                        self.g[g].m[name] = {}
                                        self.g[g].m[name].p = obj //Package
                                        self.g[g].m[name].d = dir //Set it to the plugin
                                        self.g[g].m[name].sI = {}
                                        self.g[g].m[name].sT = {}


                                        let hasFab = obj.hasOwnProperty("fabritect")
                                        let hasVer = obj.hasOwnProperty("version")
                                        let hasConsumes = hasFab ? obj.fabritect.hasOwnProperty("consumes") : false
                                        if (hasFab && hasConsumes && hasVer) {
                                            let ver = obj.version
                                            let con = formatConsumes(obj.fabritect.consumes)

                                            self.g[g].m[name].f = `${g}@${name}#${ver}`
                                            self.g[g].m[name].con = con
                                            self.g[g].m[name].c = null
                                            console.log(mainFile)
                                            fs.readFile(mainFile, 'utf8', (err, data) => {
                                                if (err) { console.log(err) 
                                                    self.g[g].m[name].c = ""
                                                }
                                                self.g[g].m[name].c = data
                                                console.log(data)
                                                let pass = true
                                                for (let module_ in self.g[g].m) {
                                                    pass = self.g[g].m[name].c == null ? false : pass; 
                                                }
                                                if (pass) {
                                                    resolve(true)
                                                }
                                            });
                                        } else {
                                            console.log(`Can not load ${group}@${name}`)
                                        }
                                    }
                                } else {
                                    console.log("has no name")
                                }
                            })
                        }
                    })
                } else {
                    console.log(`${folder} is not a valid folder...`);
                }
            }).catch(() => {

            })
        }
        let instance = {
            async loadFolder(folder) {
                return _loadFolder(folder)
            },
        }
        if (this.g[g] == null) {
            this.g[g] = {} //Make the object for the group
            this.g[g].o = options //Set the options
            this.g[g].m = {} //Modules in this group
            this.g[g].c = (g_, n_, code) => { return code } //Add the compiler callback
            let i = instance //Get the instance (local)

            this.g[g].i = i //Set the intstance
            return i //Return the instance
        }
        return null
    }
    /**
     * 
     * @param {String} g 
     * @param {String} n 
     * @param {String} code 
     */
    log(group, name, message) {
        let color = "green"
        if (this.g[group].o.hasOwnProperty("color")) {
            color = this.g[group].o.color
        }
        let out = chalk`{${color} [${group.toUpperCase()}]} [${name}] ${message}`
        console.log(out)
    }
    getServices(group, name) {
        if (this.isModule(group, name)) {
            let sections = ["GLOBAL"]
            let services = {}
            let consumes = this.g[group].m[name].con
            for (let _group in consumes) {
                services[_group] = {}
                for (let _module in consumes[_group]) {
                    services[_group][_module] = {}
                    for (let _section in sections) {
                        let local = { "_": {} }
                        let _ = this
                        console.log("Eeee")
                        console.log(JSON.stringify(this.g[_group].m[_module].s))
                        for (let service in this.g[_group].m[_module].s[sections[_section]]) {
                            console.log(chalk`{red Hi}`)
                            local[service] = function () {
                                var args = Array.prototype.slice.call(arguments);
                                args.unshift(name);
                                args.unshift(group);
                                let a = () => {
                                    throw "[Fabritect] Invalid Function Call"
                                }
                                if (_.g[_group].m[_module].s[_section][service].hasOwnProperty("load")) {
                                    a = _.g[_group].m[_module].s[_section][service].load.apply(this, args);
                                } else {
                                    a = _.g[_group].m[_module].s[_section][service].apply(this, args);
                                }
                                if (a) {
                                    return a
                                }
                            }
                        }
                        if (sections[_section] == "GLOBAL") {
                            services[_group][_module] = Object.assign(local, services[_group][_module])
                        } else {
                            if (services[_group][_module]._[_section] == null) {
                                services[_group][_module]._[_section] = {}
                            }
                            services[_group][_module]._[_section] = local
                        }
                    }
                }
            }
            return services
        }
    }
    async run(group, name, code) {
        return new Promise((resolve) => {
            console.log(`${group}:${name}`)
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
            //Runtime Environment (mounting and ending)

            //Runtime Environment for module
            let runtime = {
                /**
                 * onMount - Plugin Mounts Here
                 * - Used for getting other imports from other 
                 */
                onMount: (callback) => {
                    console.log("onMount")
                    let imports = _.getServices(group, name)
                    //Callback!

                    let register = (services) => {
                        _.g[group].m[name].s = services
                        console.log("resolve")
                        resolve(true)
                    }
                    callback(imports, register)
                    //TODO: Verify reigster correlation?

                },
                /**
                 * GetGroups - Return a array of groups that are loaded
                 */
                getGroup: () => {
                    //TODO
                },
                /**
                 * End - End of the module loading process. Injected automatically by code
                 */
                end() {
                    //resolve(true)
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
                console.log("RAN")
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
                //Compiled the code
                let compiled = this._transform(group, name, newCode)
                //Run the code. (make the environment)
                let launchCode = eval(compiled);
                //Make the log system
                let log = { log: (message) => { this.log(group, name, message) } }
                //Launch the code
                launchCode(customRequire,
                    log,
                    include,
                    runtime,
                    customInterval,
                    customTimeout)()
                console.log("Im donw")
                console.log(newCode)

            } else {
                console.log(`Invalid Syntax in: ${group}:${name}`)
            }
        }).catch((err) => {
            console.log(err)
        })
    }
    /**
     * AttemptToLoad - Loads the modules based on a loading scheme. 
     * - Loads modules in order based on consume levels
     * @param {Object} scheme 
     */
    async attemptToLoad(scheme) {
        let loadingLevel = {}
        let lastLevel = null

        /**
         * WaitForLevel - Waits for a level to complete
         * - Async Wait for all modules to load (via run). 
         * - End with a promise so it can load asynchronously
         * @param {Number} level 
         */
        let waitForLevel = (level) => {
            return new Promise(async (resolve) => {
                Promise.all(loadingLevel[level])
                    .then(() => {
                        resolve(true)
                    })
                    .catch((error) => {
                        console.log(chalk`{red} ${error}`)
                    });
            }).catch((err) => {
                console.log(err)
            })
        }
        //Loop through the scheme
        for (let _level in scheme) {
            for (let _group in scheme[_level]) {
                for (let _module in scheme[_level][_group]) {
                    let _g = _group
                    let _n = scheme[_level][_group][_module]
                    let code = this.g[_g].m[_n].c
                    if (loadingLevel[_level] == null) {
                        loadingLevel[_level] = []
                    }
                    loadingLevel[_level].push(this.run(_group, scheme[_level][_group][_module], code))
                }
            }
            //Now wait for the plugins to load (as they are async)
            await waitForLevel(_level)
        }
    }
    /**
     * buildLoadingScheme - Builds the loading scheme
     * - Creates an array (from 0) of modules to load in order (for attemptToLoad)
     * - Example:
     * [{"app": ["core", "math"]}, {"plugins": ["example", "extra"]}]
     *
     * @param {Object} levels 
     * @param {Level} highest 
     */
    buildLoadingScheme(levels, highest) {
        //Make the loading scheme.
        let loadingScheme = []
        let n = 0
        //First make a backwards for loop using the highest from the level tree
        for (let i = highest; i > 0; i--) {
            //Now loop all groups
            for (let _group in levels) {
                //And loop all modules
                for (let _module in levels[_group]) {
                    //Get the value of the module
                    let value = levels[_group][_module]
                    //Check if the value (level) is equal to the value of the first loop
                    if (value == i) {
                        //If so, first make the scheme, but from 0 [n] (opposite of i), 
                        //because we want to load the lowest first, then the highest last.
                        if (loadingScheme[n] == null) {
                            loadingScheme[n] = {}
                        }
                        //Now check if the group is in this load level
                        if (loadingScheme[n][_group] == null) {
                            loadingScheme[n][_group] = []
                        }
                        //Add the module to the level, just in a simple array, we don't need version as we already have it loaded.
                        loadingScheme[n][_group].push(_module)
                    }
                }
            }
            n++
        }
        return loadingScheme
    }
    /**
     * @return {Array} [tree, highest]
     * tree: Object of the tree with each level of each plugin
     * highest: The highest level of consumption. (first to be loaded)
     */
    createLevelTree() {
        //Consumable Levels
        let levels = {}
        //Highest Module (technically lowest, but first to be loaded)
        let highest = 1
        let goLower = (group, mod, level) => {
            //Bump the level, because if it gets called again (recursively)
            level++
            //Loop all groups and modules from CONSUMES (con)
            for (let _group in this.g[group].m[mod].con) {
                for (let _module in this.g[group].m[mod].con[_group]) {
                    //Check if its a real module       
                    if (this.isModule(_group, _module)) {
                        //Does levels have the group created?
                        if (!levels.hasOwnProperty(_group)) {
                            levels[_group] = {} //If not make it
                        }
                        //Keep a note of the highest level, useful for getting the loadingScheme
                        if (level > highest) {
                            highest = level
                        }
                        //Apply the level to the object
                        //Also this would be over written if found higher down the tree
                        levels[_group][_module] = level
                        goLower(_group, _module, level) //Check if this module has consumables.
                    }
                    //If not real ,don't add it to the array, it just won't be loaded. In reality something with break anyways.
                }
            }
        }
        //The start of finding the level tree. Loop all modules normally.
        for (let _group in this.g) {
            levels[_group] = {}
            for (let _module in this.g[_group].m) {
                levels[_group][_module] = 1 //Starts at level 1
                let obj = this.g[_group].m[_module]
                goLower(_group, _module, 1) //level 1
            }
        }
        return [levels, highest]
    }
    /**
     * isModule = Is a module?
     * @param {String} group Group
     * @param {String} mod Module
     */
    isModule(group, mod) {
        let isGroup = this.g.hasOwnProperty(group)
        let isModule = isGroup ? this.g[group].m.hasOwnProperty(mod) : false
        return isModule
    }
    /**
     * DisplayConsumeTree - Displays the consumable tree
     */
    displayConsumeTree() {
        let tree = {}
        let makeTree = (group, mod, name) => {
            let seen = []
            seen.push(name)
            let lowTree = {}
            for (let _group in this.g[group].m[mod].con) {
                let color = "green"
                if (this.g[_group].o.hasOwnProperty("color")) {
                    color = this.g[_group].o.color
                }
                for (let _module in this.g[group].m[mod].con[_group]) {
                    if (this.isModule(_group, _module)) {

                        let [_g, _n] = this.g[_group].m[_module].f.split("@")
                        let [_m, _v] = _n.split("#")
                        let nameColor = chalk`{${color} ${_g}}{gray @}{green ${_m}}{gray #}{white ${_v}}`
                        let name = this.g[_group].m[_module].f
                        lowTree[nameColor] = makeTree(_group, _module)
                    } else {
                        let _vers = this.g[group].m[mod].con[_group][_module]
                        let nameColor = chalk`{${color} ${_group}}{gray @}{red ${_module}}{gray #}{white ${_vers}}`
                        lowTree[nameColor] = {}
                    }
                }
            }
            return lowTree
        }
        for (let group in this.g) {
            let color = "green"
            if (this.g[group].o.hasOwnProperty("color")) {
                color = this.g[group].o.color
            }
            for (let mod in this.g[group].m) {

                let [_g, _n] = this.g[group].m[mod].f.split("@")
                let [_m, _v] = _n.split("#")
                let nameColor = chalk`{${color} ${_g}}{gray @}{green ${_m}}{gray #}{white ${_v}}`


                let name = this.g[group].m[mod].f
                let localTree = makeTree(group, mod, name)

                tree[nameColor] = localTree

            }
        }
        console.log(treeify.asTree(tree, true))
        return tree
    }
    /**
     * start - Starts the "code execution" of a plugin
     */
    start() {
        Promise.all(this.l)
            .then(() => {
                this.displayConsumeTree()
                let [levels, highest] = this.createLevelTree()
                let scheme = this.buildLoadingScheme(levels, highest)
                console.log(JSON.stringify(scheme))
                this.attemptToLoad(scheme)
            })
            .catch((error) => {
                console.log(error)
                console.log("Failed to start, no loadings...")
            });
    }
}
