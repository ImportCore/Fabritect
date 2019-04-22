
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

let { splitAt, doesExist, getPackages, timeDiff, formatConsumes } = require("./helper")



//Make Class
module.exports = class Fabritect extends EventEmitter {
    constructor(prefix = "Plugin") {
        super()
        this.loadWaiting = [] //List of loaded async modules
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
        /**
         * loadFileAsync - Loads the package file async and the code file async and adds all information to group object
         * @param {String} item 
         */
        let loadFileAsync = (item) => {
            return new Promise((resolve, reject) => {
                //Read the package file
                fs.readFile(item, 'utf8', async (err, packageData) => {
                    //Parse the package file
                    //TODO: Maybe verify this or try catch? idk
                    let obj = JSON.parse(packageData)

                    //Get the path and directory
                    let path = item.replace(/\\/g, "/");
                    let dir = splitAt(path.lastIndexOf("/"))(path)[0] + '/'
                    //Check if the package file has a name and main runtime
                    if (obj.hasOwnProperty("name") && obj.hasOwnProperty("main")) {
                        let mainFile = dir + obj.main //If so get the path and file
                        if (!await doesExist(mainFile)) { //A
                            console.log(chalk`{green [Fabritect]} No main file found!`)
                        }
                        //Get the name of the object
                        let name = obj.name
                        //If name hasn't already been used in the group, make it!
                        if (self.g[g].m[name] == null) {
                            self.g[g].m[name] = {}
                            self.g[g].m[name].p = obj //Package
                            self.g[g].m[name].d = dir //Set it to the plugin
                            self.g[g].m[name].sI = {}
                            self.g[g].m[name].sT = {}

                            //Now check if it has all version and consumes in the file.
                            let hasFab = obj.hasOwnProperty("fabritect")
                            let hasVer = obj.hasOwnProperty("version")
                            let hasConsumes = hasFab ? obj.fabritect.hasOwnProperty("consumes") : false
                            if (hasFab && hasConsumes && hasVer) {
                                let ver = obj.version
                                //Make consumes more object usable
                                let con = formatConsumes(obj.fabritect.consumes)

                                //Set a name (used by tree display)
                                self.g[g].m[name].f = `${g}@${name}#${ver}`
                                self.g[g].m[name].con = con //All of the consumables
                                self.g[g].m[name].c = null //The code
                                //Now lets read the file!
                                fs.readFile(mainFile, 'utf8', (err, data) => {
                                    if (err) {
                                        console.log(err)
                                        self.g[g].m[name].c = ""
                                    }
                                    //Set the file to ram
                                    self.g[g].m[name].c = data
                                    //Resolve the entire loading process
                                    resolve(true)
                                });
                            } else {
                                reject(chalk`{green [Fabritect]} {red Module invalid package! (version, fabritect, consumes) (${item})}`)
                            }
                        } else {
                            reject(chalk`{green [Fabritect]}{red Name already in use! (${item})}`)
                        }
                    } else {
                        reject(chalk`{green [Fabritect]} {red Module has no name defined in package! (${item})}`)
                    }
                })
            }).catch((error) => {
                console.log(error)
                process.exit(1);
            })
        }
        //Wrapper for loading the files async, just making sure that it really exists.
        let _loadFile = async (item) => {
            if (await doesExist(item)) {
                return loadFileAsync(item)
            }
            return false
        }

        let _loadFolder = async (folder) => {
            return new Promise(async (resolve) => {
                if (await doesExist(folder)) {
                    let files = await getPackages(folder)
                    Promise.all(files.map(_loadFile)).then(() => {
                        resolve(true)
                    }).catch((error) => {
                        console.log(error)
                        process.exit(1);
                    })
                } else {
                    console.log(`${folder} is not a valid folder...`);
                }
            }).catch((error) => {
                console.log(error)
                process.exit(1);
            })

        }
        let instance = {
            loadFolder(folder) {
                self.loadWaiting.push(_loadFolder(folder))
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
    /**
     * getServices - Get the list of services that are offered to this module
     * TODO: Add a proxy for invalid imports, throw an error?
     * @param {String} group 
     * @param {String} name 
     */
    getServices(group, name) {
        //Check if its a real module
        if (this.isModule(group, name)) {
            //TODO: Make this more than just global sections
            let sections = ["GLOBAL"]
            if (this.g[group].o.hasOwnProperty("sections")) {
                for (let _section in this.g[group].o.sections) {
                    sections.push(this.g[group].o.sections[_section])
                }
            }
            //List of all services that will be returned
            let services = {}
            //All of the consumables that this module uses
            let consumes = this.g[group].m[name].con
            //Loop it
            for (let _group in consumes) {
                //At the object to the object as an object (is that confusing?)
                services[_group] = {}
                //Loop the modules in each group
                for (let _module in consumes[_group]) {
                    //Also create that object
                    services[_group][_module] = {}
                    //Loop all of the sections from each group
                    //TODO: Like said before, still needs to be worked on
                    for (let _section in sections) {
                        //Make a local services for this section for only the consumed module
                        let local = {}
                        //Reference of this class 
                        //TODO: Change to "self"
                        let _ = this
                        //Loop all servics in the "register" object
                
                        if (this.g[_group].m[_module].s.hasOwnProperty(sections[_section])) {
                            for (let service in this.g[_group].m[_module].s[sections[_section]]) {
                                //Create a local function which will be referenced
                                local[service] = function () {
                                    //Grab all arguments from the object
                                    var args = Array.prototype.slice.call(arguments);
                                    //Create some info for this module when it calls another module
                                    //TODO: Add more infomaton
                                    let info = {
                                        name,
                                        group
                                    }
                                    //Add it to the arguments
                                    args.unshift(info);
                                    //Defined returnable (the function that gets called on)
                                    let returnable = () => {
                                        //THis should never be called, but if so throw an error
                                        throw "[Fabritect] Invalid Function Call"
                                    }
                                    //First lets check if this function uses the "load/unload" system.
                                    if (_.g[_group].m[_module].s[sections[_section]][service].hasOwnProperty("load")) {
                                        //If so, apply the arguments to this
                                        returnable = _.g[_group].m[_module].s[sections[_section]][service].load.apply(this, args);
                                    } else {
                                        //If not, just run this function directly
                                        returnable = _.g[_group].m[_module].s[sections[_section]][service].apply(this, args);
                                    }
                                    //If returnable is real?
                                    if (returnable) {
                                        //Return returnable
                                        return returnable
                                    }
                                }
                            }
                            //Now apply the SERVICES to the entire module
                            if (sections[_section] == "GLOBAL") {
                                services[_group][_module] = { ...local, ...services[_group][_module] }
                            } else {
                                if (services[_group][_module]["_"] == null) {
                                    services[_group][_module]._ = {}
                                }
                                if (!services[_group][_module]._.hasOwnProperty(sections[_section])) {
                                    services[_group][_module]._[sections[_section]] = {}
                                }
                                services[_group][_module]._[sections[_section]] = local
                            }
                        }
                    }
                }
            }
            //Return all of the services allowed
            return services
        }
    }
    /**
     * run - Runs code asynchronously
     * @param {String} group 
     * @param {String} name 
     * @param {String} code 
     */
    async run(group, name, code) {
        return new Promise((resolve) => {
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

            let self = this
            //Runtime Environment (mounting and ending)

            //Runtime Environment for module
            let runtime = {
                /**
                 * onMount - Plugin Mounts Here
                 * - Used for getting other imports from other 
                 */
                onMount: (callback) => {

                    let imports = self.getServices(group, name)

                    let register = (services) => {
                        self.g[group].m[name].s = services
                        //Resolve here rather then end (below) because of 
                        //Now all will resolve it directly in the main function of a module
                        resolve(true)
                    }
                    callback(imports, register)
                },
                /**
                 * GetGroups - Return a array of groups that are loaded
                 */
                getGroup: () => {
                    //TODO: get the groups
                },
                /**
                 * End - End of the module loading process. Injected automatically by code
                 */
                end() {
                    //End of the function gives time...
                    if (self.g[group].m[name].e == null) {
                        self.g[group].m[name].e = timeDiff(startTime)
                    }
                }
            }
            //Global prefix
            let id = this.p
            //Code Structure
            let newCode = `module.exports = function(require, console, include, ${id}, setInterval, setTimeout) { var __dirname = null;var __filename = null;var global = null;var process = null;var exports = null;var TextDecoder = null;var TextEncoder = null;var WebAssembly = null;var URL = null;var URLSearchParams = null;
                return () => {
                    ${code}
                    ${id}.end();} 
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
                let log = { log: (message) => { this.log(group, name, message) }, logX: (message) => {console.log(message)} }
                //Launch the code
                launchCode(customRequire,
                    log,
                    include,
                    runtime,
                    customInterval,
                    customTimeout)()


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
        console.log(timeDiff(startTime))
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
                        let temp = level
                        //Keep a note of the highest level, useful for getting the loadingScheme
                        if (level > highest) {
                            highest = level
                        }
                        if (levels[_group][_module] != null) {
                            if (levels[_group][_module] > level) {
                                temp = levels[_group][_module]
                            }
                        }
                        //Apply the level to the object
                        //Also this would be over written if found higher down the tree
                        levels[_group][_module] = temp
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
                let level = 1
                if (levels[_group][_module] == null)
                    levels[_group][_module] = 1 //Starts at level 1
                else(levels[_group][_module] > 1)
                    level = levels[_group][_module]
                let obj = this.g[_group].m[_module]
                goLower(_group, _module, level) //level 1
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
        //Wait for all files to load...
        Promise.all(this.loadWaiting)
            .then(() => {
                //Shows the tree of consume
                this.displayConsumeTree()
                //Now create the levels
                let [levels, highest] = this.createLevelTree()
          
                //Creates a schematic from the levels
                let scheme = this.buildLoadingScheme(levels, highest)
       
                //Loads the schematic and run code!
                this.attemptToLoad(scheme)
            })
            .catch((error) => {
                console.log(error)
                console.log("Failed to start, no loadings...")
            });
        console.log(timeDiff(startTime))
    }
}



