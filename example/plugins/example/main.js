Plugin.onMount((imports) => {
    Plugin.register({
        GLOBAL: {
            exampleDo: {
                load() {},
                unload() {}
            }
        }
    })
})


//Plugin.end()