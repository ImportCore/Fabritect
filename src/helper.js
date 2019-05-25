
//FindAny - Finds any string in a list of string with a given string
const findAny = (string, list) => {
    for (let item in list)
        if (string.indexOf(list[item]) !== -1)
            return true
    return false
}
//Splits at a specific index (string)
const splitAt = index => x => [x.slice(0, index), x.slice(index)]

const fs = require("fs")
//Does a file exist, but promised based
const doesExist = async (file) => {
    return new Promise((resolve) => {
        fs.access(file, fs.F_OK, (err) => {
            if (err) {
                resolve(false)
            }
            resolve(true)
        })
    })
}
const glob = require("glob")
//Get packages but promised based on a single folder (within sub folders)
const getPackages = async (path) => {
    return new Promise((resolve) => {
        glob(`${path}/*/package.json`, function (er, files) {
            resolve(files)
        })
    })
}
//Get a single package from a single sub folder (directly)
const getPackage = async (path) => {
    return new Promise((resolve) => {
        glob(`${path}/package.json`, function (er, files) {
            resolve(files)
        })
    })
}
//Find a time difference
const timeDiff = (startTime) => {
    return ((process.hrtime(startTime)[0] * 1000) + (process.hrtime(startTime)[1] / 1000000)).toFixed(3)
}
//Format the consumes array
//TODO: Make it error proof?
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

//Export All Functions
module.exports = {
    findAny,
    splitAt,
    doesExist,
    getPackages,
    getPackage,
    timeDiff,
    formatConsumes
}