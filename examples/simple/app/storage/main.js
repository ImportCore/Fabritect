Plugin.onMount((imports, register) => {
    console.log("LOADED STORAGE")
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