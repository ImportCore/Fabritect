console.log("WHY AM I LAODED THEN?")

Plugin.onMount((imports, register) => {
    console.log(JSON.stringify(imports))
    imports.app.http.doSomething()
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