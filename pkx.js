/////////////////////////////////////////////////////////////////////////////////////////////
//
// pkx
//
//    Utility for developing pkx modules.
//
// License
//    Apache License Version 2.0
//
// Copyright Nick Verlinden (info@createconform.com)
//
/////////////////////////////////////////////////////////////////////////////////////////////
(function() {
    function PKX(pkx, module, configuration) {
        var io = require("cc.io");
        var cli = require("cc.cli");

        //
        // privates
        //
        function getRequestArgument(arg, wrap) {
            var request = arg;
            try {
                request = JSON.parse(request);
            }
            catch(e) {
                // ignore
            }
            if (Object.prototype.toString.call(request) !== "[object Array]") {
                request = [ request ];
            }
            for (var r in request) {
                if (wrap) {
                    if (typeof request[r] == "string") {
                        request[r] = {"package": request[r], "raw" : true, "wrap": true};
                    }
                    else {
                        request[r].raw = true;
                        request[r].wrap = true;
                    }
                }
            }
            return request;
        }
        function displayModuleInfo(module, indent) {
            if (!indent) {
                indent = "";
            }
            // display basic package info
            console.log(indent + "Request '" + module.id + "':");
            if (module.parameters && module.parameters.pkx) {
                console.log(indent + "  Title  : " + module.parameters.pkx.title);
                console.log(indent + "  Version: " + module.parameters.pkx.version);
                console.log(indent + "  Description:");
                console.log(indent + "    " + module.parameters.pkx.description);
            }

            // display dependencies
            var foundDependencies = false;
            for (var m in module.dependencies) {
                // skip named dependencies, pkx, module & configuration
                if (isNaN(m) || m <= 2) {
                    continue;
                }
                if (!foundDependencies) {
                    console.log(indent + "  Dependencies:");
                    foundDependencies = true;
                }
                console.log(indent + "    " + module.dependencies[m].id);
            }
        }
        function usingFail(loader, indent) {
            if (!indent) {
                indent = "";
            }

            // something went wrong with the loader
            for (var e in loader.err) {
                console.error(indent + loader.err[e]);
            }

            // something went wrong with the individual requests
            for (var r in loader.requests) {
                if (loader.requests[r].module) {
                    displayModuleInfo(loader.requests[r].module, indent);
                }
                for (var e in loader.requests[r].err) {
                    if (loader.requests[r].err[e].name == pkx.ERROR_DEPENDENCY) {
                        console.log(indent + "  Dependencies:");
                        console.error(indent + "    One or more dependencies failed to load.");
                        usingFailed(loader.requests[r].err[e].data, indent + "    ");
                    }
                    else {
                        var id = loader.requests[r].request;
                        if (typeof id === "object") {
                            id =  loader.requests[r].request.package;
                        }
                        var deepE = getDeepestError(loader.requests[r].err[e]);
                        console.error(indent + "  " + deepE);
                    }
                }
            }
        }
        function getDeepestError(e) {
            if (e.innerError) {
                return getDeepestError(e.innerError);
            }
            return e;
        }

        //
        // module wrapping
        //
        var wrapOrder = [];
        var wrapDone = [];
        function wrapModules(modules) {
            for (var m in modules) {
                wrapModule(modules[m]);
            }
        }
        function wrapModule(module) {
            if (!module.parameters.pkx) {
                return;
            }
            // save dependencies
            wrapModules(module.dependencies ? module.dependencies : []);

            // save self
            wrapSave(module).then();
        }
        function wrapSave(module) {
            var modId = module.id == module.parameters.pkx.id + "/" ? module.parameters.pkx.id : module.id;
            var pkxName = "";
            var nameParts = modId.split(".");
            modId = "";
            for (var i=0;i<nameParts.length;i++) {
                if (isNaN(nameParts[i])) {
                    modId += (modId != ""? "." : "") + nameParts[i];
                }
            }
            var modPath = "./" + modId;
            var modName = module.id == module.parameters.pkx.id + "/" ? module.parameters.pkx.main : module.id.substr(module.parameters.pkx.id.length + 1);
            var modFile = modPath + "/" + modName;

            wrapOrder[module.id] = { "module" : module, "id": modId, "name": modName, "path" : modPath, "file" : modFile };

            return new Promise(function(resolve, reject) {
                module.factory.readAsString().then(function (code) {
                    if (!module.parameters || !module.parameters.pkx) {
                        console.warn("Ignoring non-pkx module '" + module.id + "'.");
                        return;
                    }
                    if (wrapDone[module.id]) {
                        resolve();
                        return;
                    }
                    wrapDone[module.id] = module;

                    io.URI.open(modFile, io.ACCESS_OVERWRITE, true).then(function(stream) {
                        console.log("Sucessfully saved module '" + module.id + "'.");
                        stream.write(code).then(resolve, reject);
                    }, function(e) {
                        console.error("An error occured while saving module '" + module.id + "'.", e);
                    });
                }, reject);
            });
        }
        function wrapSaveLoaderAppCache(saveLoader, saveAppCache) {
            if (!saveLoader && !saveAppCache) {
                return;
            }

            var node = "";
            var appcache = "CACHE MANIFEST\n# unique stamp: " + Math.random() + (+ new Date()) + "\n";
            for (var o in wrapOrder) {
                node += "require(\"./" + wrapOrder[o].id + "/" + wrapOrder[o].name + "\");\n";
                appcache += wrapOrder[o].id + "/" + wrapOrder[o].name + "\n";
            }
            if (saveLoader) {
                appcache += saveLoader + "\n";

                io.URI.open("./" + saveLoader, io.ACCESS_OVERWRITE, true).then(function(stream) {
                    stream.write(node).then();
                });
            }
            if (saveAppCache) {
                appcache += "\nNETWORK:\n*";
                io.URI.open("./" + saveAppCache, io.ACCESS_OVERWRITE, true).then(function(stream) {
                    stream.write(appcache).then();
                });
            }
        }
        function wrapFail() {
            console.error("Could not wrap dependencies in current folder.");
        }

        //
        // process command
        //
        var wrap = cli.command("wrap", "Creates wrapped version of the selected module, and saves them in subfolders in the current working directory.");
        wrap.option("--appcache <file>", "Create a 'require' script that will load all the files required for the request being wrapped.");
        wrap.option("--loader <file>", "Creates an HTML5 appcache file for the request being wrapped.");

        var p = cli.parse(configuration.argv);

        if (p) {
            if (p.wrap) {
                // open package.json in local directory
                io.URI.open("package.json").then(function(stream) {
                    stream.readAsJSON().then(function(pkxJSON) {
                        var request = getRequestArgument(pkxJSON.pkxDependencies || pkxJSON.dependencies, true);
                        using.apply(using, request).then(function() {
                            // wrap all modules
                            wrapModules(arguments);

                            // save loader and appcache files
                            wrapSaveLoaderAppCache(p.wrap["--loader"]? p.wrap["--loader"].file : null, p.wrap["--appcache"]? p.wrap["--appcache"].file : null);
                        }, usingFail, true);
                    }, wrapFail);
                }, wrapFail);
            }
        }

        console.log();
    }

    // module factory
    define(function() {
        return new (Function.prototype.bind.apply(PKX, arguments));
    });
})();