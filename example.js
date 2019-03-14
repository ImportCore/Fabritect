import Fabritect from "./fabritect";

let fab = new Fabritect()

//Add global compiler for all of the code. 
fab.addGlobalCompiler((code) => {

})
let group = fab.createGroup("APP", {
    require: true, //All default to false
    escapes: {
        constructor: false,
        eval: false,
        proto: false
    }
})
group.addCompiler((code) => {})
//Groups will define the process of modulatiry
let group = fab.createGroup("PLUGINS", {
    require: false, //Can they use node_moudles
    include: true, //Allow plugins to include files in the directory (not string compatible)
    escapes: { //What possible methods can a module attempt to by pass? I mean technically VM2 would work but its slow. Just disable the module if anything bad is found.
        constructor: false,
        eval: false,
        proto: false
    }
})
