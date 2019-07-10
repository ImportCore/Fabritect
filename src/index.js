
/**
 * Fabritect - Modular Module Manager
 * @author ImportProgram
 * @copyright 2018 IC
 * @license MIT
 */

require('console-stamp')(console,
    {
        label: false,
        metadata: function () {
            return ('[' + (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2) + 'mb]');
        },
        colors: {
            stamp: 'yellow',
            metadata: 'green'
        }
    }
);
const vm = require('vm');
const fs = require('fs')
const EventEmitter = require('events').EventEmitter;
const treeify = require('treeify');
const chalk = require('chalk');
const util = require('util');
const path = require('path')
var parseError = require('parse-error');
const startTime = process.hrtime()
const { codeFrameColumns } = require("@babel/code-frame")
let { splitAt, doesExist, getPackages, getPackage, timeDiff, formatConsumes } = require("./helper")
let validator = require("./validator")

//Make Class
module.exports = class Fabritect extends EventEmitter {
    constructor(prefix = "Plugin") {
        super()
        this.groupWaiting = {}
        this.prefix = prefix //Prefix for modules
        this.group = {} //Group Object
        this.compile = (g, n, code) => { return code }
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
        code = `//# sourceURL=${g.toUpperCase()}|${n.toUpperCase()}\n${code}`
        //Check if its a real group 
        /*
        if (this._isGroup(g)) {
            //Check that it has a compiler method
            if (this.group[g].hasOwnProperty("compile")) {
                code = this.group[g].c(g, n, code)
            }
        }
        //Global Compiler
        code = this.c(g, n, code)
        */
        return code;
    }
    /**
     * Validate - Validates code
     * @param group 
     * @param name 
     * @param code 
     */
    _validate(group, name, code) {
        return validator(code)
    }
    /**
     * createGroup - Creates a group
     * @param {*} name 
     * @param {*} settings 
     */
    createGroup(group, options) {
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
                    let _path = item.replace(/\\/g, "/");
                    let dir = splitAt(_path.lastIndexOf("/"))(_path)[0] + '/'
                    //Check if the package file has a name and main runtime
                    if (obj.hasOwnProperty("name") && obj.hasOwnProperty("main")) {
                        let mainFile = dir + obj.main //If so get the path and file
                        if (!await doesExist(mainFile)) { //A
                            console.log(chalk`{green [Fabritect]} No main file found!`)
                        }
                        //Get the name of the object
                        let name = obj.name
                        //If name hasn't already been used in the group, make it!
                        if (self.group[group].module[name] == null) {
                            self.group[group].module[name] = {}
                            self.group[group].module[name].p = obj //Package
                            self.group[group].module[name].directory = dir //Set it to the plugin
                            self.group[group].module[name].file = path.resolve(mainFile) //Set it to the plugin
                            self.group[group].module[name].sI = []
                            self.group[group].module[name].sT = []

                            //Now check if it has all version and consumes in the file.
                            let hasFab = obj.hasOwnProperty("fabritect")
                            let hasVer = obj.hasOwnProperty("version")
                            let hasConsumes = hasFab ? obj.fabritect.hasOwnProperty("consumes") : false
                            if (hasFab && hasConsumes && hasVer) {
                                let ver = obj.version
                                //Make consumes more object usable
                                let con = formatConsumes(obj.fabritect.consumes)

                                //Set a name (used by tree display)
                                self.group[group].module[name].f = `${group}@${name}#${ver}`
                                self.group[group].module[name].con = con //All of the consumables
                                self.group[group].module[name].c = null //The code
                                //Now lets read the file!
                                fs.readFile(mainFile, 'utf8', (err, data) => {
                                    if (err) {
                                        console.log(err)
                                        self.group[group].module[name].c = ""
                                    }
                                    //Set the file to ram
                                    self.group[group].module[name].c = data
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
        /**
         * loadPackage - Loads a single module within a specific directory
         * - Module is added is awaited from loadFile
         * 
         * BEFORE START
         * 
         * @param {String} directory 
         */
        let _loadPackage = async (directory) => {
            return new Promise(async (resolve) => {
                if (await doesExist(directory)) {
                    let _package = await getPackage(directory)
                    console.log(`PACKAGE: ${_package}`)
                    await _loadFile(_package[0])
                    resolve(true)
                } else {
                    console.log(`${directory} is not a valid pacakge...`);
                }
            }).catch((error) => {
                console.log(error)
                process.exit(1);
            })
        }
        //Instance of "createFolder", or what is returned
        let instance = {
            loadFolder(directory) {
                //TODO: Check if waiting for load isn't occuring (start has been called).
                //if so, check if needed modules are installed (TODO: Check versions)
                self.groupWaiting[group] = _loadFolder(directory)
            },
            loadModule(directory) {
                self.groupWaiting[group] = _loadPackage(directory)
            },
            isGroup: true,
            getName() {
                return group
            }
        }
        if (this.group[group] == null) {
            this.group[group] = {} //Make the object for the group
            this.group[group].options = options //Set the options
            this.group[group].module = {} //Modules in this group
            this.group[group].directory = path.join(__dirname, "../../../").replace(/\\/g, "\\\\"); //Modules in this group
            this.group[group].compile = (g_, n_, code) => { return code } //Add the compiler callback
            let i = instance //Get the instance (local)

            this.group[group].i = i //Set the intstance
            return i //Return the instance
        }
        return null
    }
    /**
     * log - A custom log
     * @param {String} g 
     * @param {String} n 
     * @param {String} code 
     */
    log(group, name, message) {
        let color = "green"
        if (this.group[group].options.hasOwnProperty("color")) {
            color = this.group[group].options.color
        }
        if (typeof message === "object") {
            message = util.inspect(message, false, null, true)
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
        if (this.isModule(group, name)) {
            let services = {
                GLOBAL: {},
                GROUP: {},
            }
            let consumes = this.group[group].module[name].con
            for (let _group in consumes) {
                services.GLOBAL[_group] = {}
                for (let _module in consumes[_group]) {
                    if (this.group[_group].module[_module].globalServices) {
                        services.GLOBAL[_group][_module] = this.group[_group].module[_module].globalServices
                    }
                    if (this.group[_group].module[_module].groupServices && _group == group) {
                        services.GROUP[_module] = this.group[_group].module[_module].groupServices
                    }
                }
            }
            let handler = {
                get: function (target, key) {
                    if (typeof target[key] === 'function') {
                        return function () {
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
                                throw "Error"
                            }
                            returnable = target[key].apply(this, args)
                            //If returnable is real?
                            if (returnable) {
                                //Return returnable
                                return returnable
                            }
                        }
                    } if (target[key] != undefined) {
                        return new Proxy(target[key], handler)
                    } else {
                        return target[key]
                    }
                },
                set: function () {
                    console.log("You cannot override services.")
                }
            }
            var trappedServices = new Proxy(services, handler)
            return trappedServices
        }
        return null
    }
    /**
     * run - Runs code asynchronously
     * @param {String} group 
     * @param {String} name 
     * @param {String} code 
     */
    async run(group, name, code) {
        let self = this
        let logError = (_code, err) => {
            let json = parseError(err)
            let lineStart = json.line
            let lineCol = json.row
            let filename = json.filename
            if (filename != undefined) {
                if (filename.includes("|")) {
                    lineStart = lineStart - 1
                }
            }
            if (json.filename == "main.js") {
                console.log("??")
            }

            const location = { start: { line: lineStart, column: lineCol } };
            const result = codeFrameColumns(_code, location, { highlightCode: true, forceColor: true });

            self.log(group, name, chalk`\n{red {bold × ${self.group[group].module[name].file}: ${json.message} (${lineStart}:${lineCol})}} \n${result}`)

        }
        return new Promise((resolve) => {
            let opts = {}
            let groupOptions = this.group[group].options

            //Custom Require (deny module access if so)
            opts.require = (module) => { console.log(`REQURING of '${module}' is not allowed`) }
            if (groupOptions.require) {
                opts.require = require
            }
            if (groupOptions.process) {
                opts.process = process
            }
            /**
             * customInterval - A normal interval that supports unloading
             * @param {Function} callback
             */
            let customInterval = (callback, time) => {
                let interval = setInterval(() => {
                    callback()
                }, time)
                this.group[group].module[name].sI.push(interval)
            }
            /**
             * customTimeout - A normal timeout that supports unloading
             * @param {Function} callback 
             */
            let customTimeout = (callback, time) => {
                let timeout = setTimeout(() => {
                    callback()
                }, time)
                this.group[group].module[name].sT.push(timeout)
            }
            //Runtime Environment (mounting and ending)
            let runtime = {
                /**
                 * onMount - Plugin Mounts Here
                 * - Used for getting other imports from other 
                 */
                onMount: (callback) => {
                    let imports = self.getServices(group, name)

                    let register = (_global = {}, _group = {}) => {
                        self.group[group].module[name].globalServices = _global
                        self.group[group].module[name].groupServices = _group
                        //Resolve here rather then end (below) because of 
                        //Now all will resolve it directly in the main function of a module
                        resolve(true)
                    }
                    let isAsync = (func) => {
                        const string = func.toString().trim();
                        return !!(
                            string.match(/^async /) ||
                            string.match(/return _ref[^\.]*\.apply/)
                        );
                    }
                    if (isAsync(callback)) {
                        callback(imports, register).catch((err) => {
                            logError(code, err)
                        })
                    } else {
                        callback(imports, register)
                    }

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
                    if (self.group[group].module[name].e == null) {
                        self.group[group].module[name].e = timeDiff(startTime)
                    }
                }
            }
            if (groupOptions.allowFabritect) {
                runtime.fabritect = self
            }
            //Global prefix
            let prefix = this.prefix
            //Code Structure
            let newCode = `${code}; ${prefix}.end()`;
            let include = null
            //Validate Code
            let safe = this._validate(group, name, code)
            if (safe) {
                //Custom Logger Function
                let log = { log: (message) => { this.log(group, name, message) } }

                //VM Options
                opts.console = log
                opts.setInterval = customInterval
                opts.setTimeout = customTimeout
                opts.__root = self.group[group].directory
                opts.__name = name
                opts.__group = group
                opts[prefix] = runtime

                //Compile Code, via code transformation (if needed)
                let compiled = this._transform(group, name, newCode)

                //Run the code. (make the environment)
                try {
                    //Make the log system
                    //Launch the code
                    let launchCode = vm.runInNewContext(compiled, opts);
                } catch (err) {
                    logError(code, err)
                }
            } else {
                console.log(`Invalid Syntax in: ${group}:${name}`)
            }
        }).catch((err) => {
            logError(code, err)
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
                if (parseInt(level) + 1 == scheme.length) {
                    resolve(true)
                }
                Promise.all(loadingLevel[level])
                    .then(() => {
                        resolve(true)
                    })
                    .catch((error) => {
                        //TODO: Used Custom Error Handler
                        console.log(chalk`{red ${error}}`)
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
                    let code = this.group[_g].module[_n].c
                    if (loadingLevel[_level] == null) {
                        loadingLevel[_level] = []
                    }
                    loadingLevel[_level].push(this.run(_group, scheme[_level][_group][_module], code).catch((err) => {
                        console.log(chalk`{red {bold Error when running module: ${_group}:${_module}}}`)
                    }))
                }
            }
            //Now wait for the plugins to load (as they are async)
            await waitForLevel(_level)

        }
        return true
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
    createLevelTree(args) {
        //Consumable Levels
        let levels = {}
        //Highest Module (technically lowest, but first to be loaded)
        let highest = 1
        let goLower = (group, mod, level) => {
            //Bump the level, because if it gets called again (recursively)
            level++
            //Loop all groups and modules from CONSUMES (con)
            for (let _group in this.group[group].module[mod].con) {
                for (let _module in this.group[group].module[mod].con[_group]) {
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
        for (let group in args) {

            let _group = args[group].getName()
            if (this.group[_group] != null) {
                levels[_group] = {}
                for (let _module in this.group[_group].module) {
                    let level = 1
                    if (levels[_group][_module] == null)
                        levels[_group][_module] = 1 //Starts at level 1
                    else (levels[_group][_module] > 1)
                    level = levels[_group][_module]
                    let obj = this.group[_group].module[_module]
                    goLower(_group, _module, level) //level 1
                }
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
        let isGroup = this.group.hasOwnProperty(group)
        let isModule = isGroup ? this.group[group].module.hasOwnProperty(mod) : false
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
            for (let _group in this.group[group].module[mod].con) {
                let color = "green"
                if (this.group[_group].options.hasOwnProperty("color")) {
                    color = this.group[_group].options.color
                }
                for (let _module in this.group[group].module[mod].con[_group]) {
                    if (this.isModule(_group, _module)) {

                        let [_g, _n] = this.group[_group].module[_module].f.split("@")
                        let [_m, _v] = _n.split("#")
                        let nameColor = chalk`{${color} ${_g}}{gray @}{green ${_m}}{gray #}{white ${_v}}`
                        let name = this.group[_group].module[_module].f
                        lowTree[nameColor] = makeTree(_group, _module)
                    } else {
                        let _vers = this.group[group].module[mod].con[_group][_module]
                        let nameColor = chalk`{${color} ${_group}}{gray @}{red ${_module}}{gray #}{white ${_vers}}`
                        lowTree[nameColor] = {}
                    }
                }
            }
            return lowTree
        }
        for (let group in this.group) {
            let color = "green"
            if (this.group[group].options.hasOwnProperty("color")) {
                color = this.group[group].options.color
            }
            for (let mod in this.group[group].module) {

                let [_g, _n] = this.group[group].module[mod].f.split("@")
                let [_m, _v] = _n.split("#")
                let nameColor = chalk`{${color} ${_g}}{gray @}{green ${_m}}{gray #}{white ${_v}}`


                let name = this.group[group].module[mod].f
                let localTree = makeTree(group, mod, name)

                tree[nameColor] = localTree

            }
        }
        console.log(chalk`{cyan {bold [Fabritect] {white Consumes Tree}}}\n${treeify.asTree(tree, true)}`)
        return tree
    }
    /**
     * start - Starts the "code execution" of a plugin
     */
    start() {
        let self = this
        let args = Array.prototype.slice.call(arguments);
        let waitedPromises = []
        for (let arg in args) {
            let group = args[arg]
            if (group.isGroup != null) {
                if (group.isGroup == true) {
                    waitedPromises.push(self.groupWaiting[group.getName()])
                }
            }
        }
        if (waitedPromises.length < 0) {
            console.log("No Groups Started")
        } else {
            let emergencyShutdown = setTimeout(() => {
                console.log(chalk`{cyan {bold [Fabritect] {red Loading of modules seem to be hanging. Exiting}}}`)
                process.exit(-1)
            }, 5000)
            //Wait for all files to load...
            Promise.all(waitedPromises)
                .then(() => {
                    //Shows the tree of consume
                    this.displayConsumeTree()
                    //Now create the levels
                    let [levels, highest] = this.createLevelTree(args)

                    //Creates a schematic from the levels
                    let scheme = this.buildLoadingScheme(levels, highest)

                    //Loads the schematic and run code!
                    this.attemptToLoad(scheme).then(() => {
                        let groups = "("
                        for (let arg in args) {
                            let group = args[arg]
                            if (group.isGroup != null) {
                                if (group.isGroup == true) {
                                    groups += group.getName().toUpperCase()
                                    if (args.length - 1 != arg) {
                                        groups += ", "
                                    } else {
                                        groups += ")"
                                    }
                                }
                            }
                        }
                        console.log(chalk`{cyan {bold [Fabritect] {white Loaded} {gray ${groups}} {white in ${timeDiff(startTime)}ms }}}`)
                        clearTimeout(emergencyShutdown)
                    }).catch((err) => {
                        console.log(err)
                        console.log("Failed to load")
                    })
                })
                .catch((error) => {
                    console.log(error)
                    console.log("Failed to start, no loadings...")
                });
        }
    }
}



