Plugin.onMount((imports, register) => {
    console.log("LOADED HTTO")
    register({
        GLOBAL:  {
            doSomething: {
                load(group, name) {
                    console.log("CALLED BY: " + group)
                    console.log("CALLED BY: " + name)
                    console.log("Loaded")
                },
                unload() {
                    "Unloaded"
                }
            }
        }
    })
})