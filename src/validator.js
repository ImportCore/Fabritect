/**
 * Fabritect Code Validator.
 * 
 * Checks if there is bad code in javascript.
 */


let { findAny } = require("./helper")

module.exports = (code) => {
    //Find list of strings, in a string

    //Check if we have the list of unwanted accesses in the code
    let found = findAny(code, ["constructor.constructor", ".constructor", "eval", "proto", "__proto__"])
    if (found) { //If found, return false
        return false
    }
    //If nothing is found, continue
    return true
}