Plugin.onMount((imports, register) => {
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