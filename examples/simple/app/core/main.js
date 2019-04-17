console.log("LOADED CORE\n")
Plugin.onMount((imports, register) => {
    
    register({
        GLOBAL:  {
            doSomething: {
                load(name) {
                    console.log("Loaded")
                },
                unload() {
                    "Unloaded"
                }
            }
        }
    })
})