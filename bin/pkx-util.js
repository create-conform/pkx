#! /usr/bin/env node
/////////////////////////////////////////////////////////////////////////////////////////////
//
// pkx-util
//
//    Utility for developing pkx modules.
//
// License
//    Apache License Version 2.0
//
// Copyright Nick Verlinden (info@createconform.com)
//
/////////////////////////////////////////////////////////////////////////////////////////////
var fs = require("fs");
var readline = require("readline");
var childProcess = require("child_process");
var path = require("path");
var program = require("commander");
var using = require("../using.js/using.js");
var error = require("../cc.error/error.js");

var configDefaultProfile = {
    "repo": "https://pacify.cc"
};
var configDefault = {
    "activeProfile": "pacify",
    "pacify": configDefaultProfile,
    "dev": {
        "repo": "http://localhost"
    },
    "prod": configDefaultProfile
};
var configDir = path.join(__dirname, "..", "config");
var configFile = path.join(configDir, "default.json");
try {
    fs.mkdirSync(configDir);
}
catch(e) {
    if (e.code != "EEXIST") {
        console.error("Could not create config directory!");
        return;
    }
}
try {
    fs.accessSync(configFile, fs.F_OK);
} catch (e) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(configDefault, null, "  "));
    }
    catch(e) {
        console.error("Could not create default configuration file!");
        return;
    }
}

process.env["NODE_CONFIG_DIR"]= path.join(__dirname, "..", "config");
var config = require("config");

program
    .option("--appcache <file>", "create a appcache for the wrapped request.")
    .option("-b, --build", "Creates the pkx archive in the bin folder and increments the build number.")
    .option("--major", "Increments the major version number upon build.")
    .option("--minor", "Increments the minor version number upon build.")
    .option("-c, --clone <repository>", "Same as git clone, but runs install after.")
    .option("--profile [add|remove|switch] [profile]", "Performs profile operations.")
    .option("-i, --info <request>", "Shows basic package information.")
    .option("--init", "creates an empty pkx project.")
    .option("--install", "Installs the git pre-commit hook for automatic versionning.")
    .option("--loader <file>", "create a loader script for the wrapped request.")
    .option("--nopkx", "when performing install, this parameter indicates the given package is not pkx compatbile and will not perform the pre-commit hook.")
    //.option("-m, --minify", "Enables code minification upon build.")
    //.option("-p, --publish", "Publish the pkx to the repository.")
    .option("--self", "used for installing this pkx tool.")
    .option("--set <key> <value>", "sets the given configuration key and value for the active profile.")
    .option("--uninstall", "removes the git pre-commit hook for automatic versionning.")
    .option("-w, --wrap <request>", "creates a wrapped script that can be used for embedding.")
    .parse(process.argv);

if (!program.install && !program.self) {
    var installedFile = path.join(__dirname, "INSTALLED");
    try {
        fs.accessSync(installedFile, fs.F_OK);
    } catch (e) {
        console.log("Preparing pkx for first use (this might take a minute)...");

        var result = childProcess.execSync("pkx install --self");
        //if (result.status == 0) {
            fs.writeFileSync(installedFile, "DONE");
            console.log("Ready.");
        /*}
        else {
            console.error("An error occurred while preparing pkx for first use.");
            console.log(result.stdout.toString());
            console.error(result.stderr.toString());
            return;
        }*/
    }
}

process.env["ALLOW_CONFIG_MUTATIONS"]=true;
if (program.profile) {
    if (Object.prototype.toString.call(program.profile) === "[object String]") {
        program.profile = [ program.profile, program.args[0] ];
    }
    if (program.profile.length < 2) {
        console.error("Invalid profile operation, need to specify 2 parameters!");
    }

    switch(program.profile[0]) {
        case "add":
            if (config.has(program.profile[1])) {
                console.error("Profile '" + program.profile[1] + "' already exist.");
                return;
            }
            config[program.profile[1]] = configDefaultProfile;
            console.log("Profile '" + program.profile[1] + "' added.");
            break;
        case "remove":
            if (!config.has(program.profile[1])) {
                console.error("Profile '" + program.profile[1] + "' does not exist.");
                return;
            }
            delete config[program.profile[1]];
            console.log("Profile '" + program.profile[1] + "' removed.");
            break;
        case "switch":
            config.activeProfile = program.profile[1];
            console.log("Active profile: " + config.activeProfile);
            break;
    }

    // update configuration
    fs.writeFileSync(configFile, JSON.stringify(config, null, "  "));
    return;
}


var profile = config.get(config.activeProfile);

if (program.set) {
    if (!profile.has(program.set[0])) {
        console.error("The profile key '" + program.set[0] + "' is invalid.");
        return;
    }
    if (Object.prototype.toString.call(program.set[1]) !== "[object String]") {
        console.error("The profile value is invalid, should be of type 'String'.");
        return;
    }
    profile[program.set[0]] = program.set[1];
    console.log("Set '"+program.set[0]+"': " + profile[program.set[0]]);

    // update configuration
    fs.writeFileSync(configFile, JSON.stringify(config, null, "  "));
    return;
}

var pkx, http, file;
if (!program.nopkx && !program.self) {
    define.parameters.configuration = { "repository" : profile.repo };
    var pkx = require("../cc.pkx/pkx.js");
    var http = require("../cc.io.http/http.js");
    var file = require("../cc.io.file-system/file-system.js");
}

var URL_GIT_CCDUMMY = "https://github.com/create-conform/cc.dummy/archive/master.tar.gz";
var PATH_TAR = (process.platform == "win32"? path.dirname(__dirname) + "\\bin\\win32\\tar\\tar.exe": "tar");
var PATH_CURL = (process.platform == "win32"? path.dirname(__dirname) + "\\bin\\win32\\curl\\curl.exe" : "curl");

if (program.info) {
    var request = getRequestArgument(program.info);

    using.apply(using, request).then(function() {
        for (var a in arguments) {
            var module = arguments[a];
            displayModuleInfo(module);
        }
    }, usingFailed, true);
}

if (program.build) {
    // read the package.json file
    var pkxVolume = new pkx.PKXVolume("file://" + (process.platform =="win32"? "/" : "") + process.cwd().replace(/\\/g, "/") + "/");
    pkxVolume.then(function (volume) {
        // increment version
        var newVersion = volume.pkx.version;
        var oldVersion = volume.pkx.version;
        var oldId = volume.pkx.id;
        var parts = newVersion.split(".");
        if (program.major) {
            newVersion = (parseInt(parts[0]) + 1) + ".0.0";
        }
        else if (program.minor) {
            newVersion = parts[0] + "." + (parseInt(parts[1]) + 1) + ".0";
        }
        else {
            newVersion = parts[0] + "." + parts[1] + "." + (parseInt(parts[2]) + 1);
        }
        console.log("Update version: ");
        console.log("  "+ volume.pkx.version + " -> " + newVersion);
        volume.pkx.version = newVersion;

        // write new package.json
        volume.open("/package.json", "io-access-overwrite").then(function (pkxJsonStream) {
            pkxJsonStream.write(JSON.stringify(volume.pkx, null, "  ")).then(function () {
                // create build dir
                var buildDir = path.join(process.cwd(), "build");
                try {
                    fs.accessSync(buildDir, fs.F_OK);

                    // delete old version
                    var oldPkx = path.join(buildDir, oldId.substr(0, oldId.lastIndexOf(".")) + ".pkx");
                    try {
                        fs.unlinkSync(oldPkx);
                    }
                    catch(e) {
                        console.warn("Could not delete old build '" + oldPkx + "'.");
                    }
                } catch (e) {
                    fs.mkdirSync(buildDir);
                }

                var pkxPath = path.join(buildDir, volume.pkx.id.substr(0, volume.pkx.id.lastIndexOf("."))  + ".pkx");

                var exclList = [];
                var pkxDeps = volume.pkx.pkxDependencies || volume.pkx.dependencies;
                for (var d in pkxDeps) {
                    if (isNaN(d)) {
                        continue;
                    }
                    var name = pkxDeps[d];
                    if (typeof pkxDeps[d] == "object") {
                        name = pkxDeps[d].package || "";
                    }
                    var pkxName = "";
                    var nameParts = name.split(".");
                    for (var i=0;i<nameParts.length;i++) {
                        if (isNaN(nameParts[i])) {
                            pkxName += (pkxName != ""? "." : "") + nameParts[i];
                        }
                    }
                    if (pkxName && pkxName != "") {
                        exclList.push(pkxName);
                    }
                }
                exclList.push(".git");
                exclList.push("build");
                exclList.push("LICENSE");
                exclList.push("README.md");
                exclList.push("node_modules");
                getGitIgnoreFiles(process.cwd(), exclList, function() {
                    var exclOptn = "";
                    for (var e in exclList) {
                        exclOptn += " --exclude='" + exclList[e] + "/*' --exclude='" + exclList[e] + "'";
                    }

                    childProcess.exec(PATH_TAR + " -cvf " + (process.platform == "win32" ? "/" + pkxPath.replace(/\\/g, "/").replace(/:/, "") : pkxPath) + (process.platform == "win32" ? exclOptn.replace(/\\/g, "/") : exclOptn) + " *", function (error, stdout, stderr) {
                        process.stdout.write(stdout);
                        process.stderr.write(stderr);
                        if (error) {
                            console.error("Failed to create the tar file. Error: " + error);
                            return;
                        }

                        var commitPath = path.join(process.cwd(), ".commit");
                        try {
                            fs.accessSync(commitPath, fs.F_OK);
                        } catch (e) {
                            // no problem, ignorign absense of git
                            return;
                        }

                        fs.unlinkSync(commitPath);
                        childProcess.exec("git add \"" + path.join(process.cwd(), "package.json") + "\" && git add \"" + pkxPath + "\" && git commit --amend -C HEAD --no-verify");

                        // tag the git repo with the new version number
                        var git = childProcess.spawn("git", ["tag", "-d", oldVersion ]);
                        git.stderr.pipe(process.stderr);
                        git.on("close", function(code) {
                            if (code != 0) {
                                console.warn("Failed to remove the old git repository version tag.");
                            }

                            git = childProcess.spawn("git", ["tag", newVersion ]);
                            git.stderr.pipe(process.stderr);
                            git.on("close", function(code) {
                                if (code != 0) {
                                    console.error("Failed to tag the git repository with the new version number.");
                                }

                            });
                        });
                    });
                });
            }, buildFail);
        }, buildFail);
    }, buildFail);

    function buildFail(e) {
        console.error(e);
        process.exit(128);
    }
}

if (program.clone) {
    var repo = Object.prototype.toString.call(program.clone) === "[object Array]"? program.clone[0] : program.clone;
    var dir = null;

    var git = childProcess.spawn("git", ["clone", "--recursive", "-j8", repo]);
    git.stderr.on("data", function(data) {
        var TSTR = "Cloning into '";
        var line = data.toString();
        if (line.substr(0, TSTR.length) == TSTR) {
            dir = line.substring(TSTR.length, line.lastIndexOf("'..."));
        }
        process.stdout.write(data);
    });
    git.on("close", function(code) {
        if (code == 0) {
            if (!dir) {
                console.error("Failed to retrieve the directory name git cloned the repository in.");
                return;
            }

            install(dir);
        }
    });
}

if (program.install) {
    install();
}

if (program.uninstall) {
    uninstall();
}

if (program.init) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // get the name of the directory
    var dir = path.basename(process.cwd());

    try {
        fs.accessSync(path.join(process.cwd(), "package.json"), fs.F_OK);
        openPKX();
    } catch (e) {
        console.log("Fetching cc.dummy template from github.com...");
        childProcess.exec(PATH_CURL + " --insecure -L \"" + URL_GIT_CCDUMMY + "\" | " + PATH_TAR + " --strip-components=1 -zx", (process.platform == "win32" ? { env: { "PATH": path.dirname(__dirname) + "\\bin\\win32\\tar\\" }} : {}), function (error, stdout, stderr) {
            process.stdout.write(stdout);
            process.stderr.write(stderr);
            if (error) {
                console.error("Failed to get the dummy project template from git. Error: " + error);
                return;
            }

            openPKX();
        });
    }

    function openPKX() {
        // get name from directory
        var dirPkxName = "";
        var dirParts = dir.split(".");
        for (var i=dirParts.length - 1;i>=0;i--) {
            if (isNaN(dirParts[i])) {
                dirPkxName = dirParts[i];
                break;
            }
        }

        // overwrite the package.json file
        var pkxVolume = new pkx.PKXVolume("file://" + (process.platform =="win32"? "/" : "") + process.cwd().replace(/\\/g, "/") + "/");
        pkxVolume.then(function (volume) {
            volume.pkx.company = "";
            volume.pkx.version = "0.0.0";
            rl.question("Name: (" + dirPkxName + ") ", function(str) {
                if (str != "") {
                    volume.pkx.name = str;
                    new pkx.PKX(volume.pkx);
                }
                else if (volume.pkx.name == "dummy") {
                    volume.pkx.name = dirPkxName;
                    new pkx.PKX(volume.pkx);
                }
                rl.question("Title: " + (volume.pkx.title != "Dummy Package" && volume.pkx.title != ""? " (" + volume.pkx.title + ") " : ""), function(str) {
                    if (str != "" || volume.pkx.title == "Dummy Package") {
                        volume.pkx.title = str;
                        new pkx.PKX(volume.pkx);
                    }
                    rl.question("Description: " + (volume.pkx.description != "Dummy package for development purposes." && volume.pkx.description != ""? " (" + volume.pkx.description + ") " : ""), function(str) {
                        if (str != "" || volume.pkx.description == "Dummy package for development purposes.") {
                            volume.pkx.description = str;
                            new pkx.PKX(volume.pkx);
                        }
                        rl.question("Main: " + (volume.pkx.main != "dummy.js" && volume.pkx.main != ""? " (" + volume.pkx.main + ") " : ""), function(str) {
                            if (str != "" || volume.pkx.main == "dummy.js") {
                                volume.pkx.main = str;
                                new pkx.PKX(volume.pkx);
                            }
                            rl.close();

                            writePKX();
                        });
                    });
                });
            });

            function writePKX() {
                // write new package.json
                volume.open("/package.json", "io-access-overwrite").then(function (pkxJsonStream) {
                    pkxJsonStream.write(JSON.stringify(volume.pkx, null, "  ")).then(function () {
                        try {
                            fs.renameSync(path.join(process.cwd(), "dummy.js"), path.join(process.cwd(), volume.pkx.main));
                        }
                        catch(e) {
                            console.error("Could not rename the 'dummy.js' to '" + volume.pkx.main + "'.");
                        }
                    }, writeFail);
                }, writeFail);
            }
        }, writeFail);

        function writeFail(e) {
            console.error(e);
            process.exit(128);
        }
    }
}

if (program.wrap) {
    var request = getRequestArgument(program.wrap, true);
    var order = [];
    var done = [];

    if (request.length == 0) {
        var pkxJSON = require(path.join(process.cwd(), "package.json"));
        request = getRequestArgument(pkxJSON.pkxDependencies || pkxJSON.dependencies, true);
    }

    using.apply(using, request).then(function() {
        function wrapModules(modules) {
            for (var m in modules) {
                wrapModule(modules[m]);
            }
        }

        function wrapModule(module) {
            // save dependencies
            wrapModules(module.dependencies ? module.dependencies : []);

            // save self
            saveWrappedModule(module).then();
        }

        function saveWrappedModule(module) {
            var modId = module.id == module.parameters.pkx.id + "/" ? module.parameters.pkx.id : module.id;
            var pkxName = "";
            var nameParts = modId.split(".");
            modId = "";
            for (var i=0;i<nameParts.length;i++) {
                if (isNaN(nameParts[i])) {
                    modId += (modId != ""? "." : "") + nameParts[i];
                }
            }
            var modPath = path.join(process.cwd(), modId);
            var modName = module.id == module.parameters.pkx.id + "/" ? module.parameters.pkx.main : module.id.substr(module.parameters.pkx.id.length + 1);
            var modFile = path.join(modPath, modName);

            order[module.id] = { "module" : module, "id": modId, "name": modName, "path" : modPath, "file" : modFile };

            return new Promise(function(resolve, reject) {
                module.factory.readAsString().then(function (code) {
                    if (!module.parameters || !module.parameters.pkx) {
                        console.warn("Ignoring non-pkx module '" + module.id + "'.");
                        return;
                    }
                    if (done[module.id]) {
                        resolve();
                        return;
                    }
                    done[module.id] = module;

                    // create directory with module id
                    try {
                        mkdirSyncRecursive(modPath);
                    }
                    catch (e) {
                        console.error("Could not create directory '" + modPath + "'.");
                        process.exit(32);
                        return;
                    }

                    // write wrapped file
                    try {
                        fs.writeFileSync(modFile, code);
                    }
                    catch (e) {
                        console.error("Could not create wrapped file '" + modFile + "'.");
                        process.exit(32);
                        return;
                    }

                    console.log("Succesfully wrapped module '" + module.id + "'.");

                    resolve();
                }, reject);
            });
        }

        wrapModules(arguments);
        var strOrder = "Order for including: \n";
        for (var o in order) {
            strOrder += o + "\n";//order[o].module.id + "\n";
        }
        console.log(strOrder);

        if (program.loader || program.appcache) {
            var browser = "if (typeof require === \"undefined\") {\n    function require(source) {\n        if (typeof source === \"string\" && source.substr(0,2) == \"./\") {\n            return document.write(\"<script language=\\\"javascript\\\" type=\\\"text/javascript\\\" src=\\\"\" + source + \"\\\"><\/sc\" + \"ript>\");\n        }\n        throw \"This is a polyfill for the require function in the allume bootloader.\";\n    }\n}\n";
            var node = "";
            var appcache = "CACHE MANIFEST\n# unique stamp: " + Math.random() + (+ new Date()) + "\n";
            for (var o in order) {
                node += "require(\"./" + order[o].id + "/" + order[o].name + "\");\n";
                appcache += order[o].id + "/" + order[o].name + "\n";
            }
            if (program.loader) {
                appcache += program.loader + "\n";
                try {
                    fs.writeFileSync(path.join(process.cwd(), program.loader), browser + node);
                }
                catch (e) {
                    console.error("Could not create loader script. Error: " + e);
                }
            }
            if (program.appcache) {
                appcache += "\nNETWORK:\n*";
                try {
                    fs.writeFileSync(path.join(process.cwd(), program.appcache), appcache);
                }
                catch (e) {
                    console.error("Could not create the appcache file. Error: " + e);
                }
            }
        }
    }, usingFailed, true);
}

if (program.minify || program.publish) {
    console.error("This feature is not yet implemented. Work in progress.");
}

function install(dir) {
    if (dir) {
        dir += "/";
    }
    else {
        dir = "";
    }

    try {
        if (!program.nopkx && !program.self) {
            console.log("Adding git pre-commit hook for automatic versionning.");
            // add commit hook to pkx build
            var commitScript = path.join(dir, ".git", "hooks", "pre-commit");
            var scriptFile = path.join(process.cwd(), commitScript);
            fs.writeFileSync(scriptFile, "#! /bin/sh\necho test > .commit\nexit $?");
            fs.chmodSync(scriptFile, 0755);
            commitScript = path.join(dir, ".git", "hooks", "post-commit");
            scriptFile = path.join(process.cwd(), commitScript);
            fs.writeFileSync(scriptFile, "#! /bin/sh\nif [ -a .commit ]\n    then\n    pkx build\n    exit $?\nfi");
            fs.chmodSync(scriptFile, 0755);
        }

        installGitSubmodules(program.self? path.dirname(__dirname) : process.cwd());
    }
    catch(e) {
        console.error("An error occurred while trying to create the git pre- and post-commit hooks.", e);
        return;
    }
    if (!program.nopkx && !program.self) {
        console.log("Successfully " + (dir != "" ? "cloned repository and " : "") + "installed pre- and post-commit hooks!");
    }
}

function installGitSubmodules(cwd) {
    // install all npm dependencies recursively
    try {
        var pathSubMod = path.join(cwd, ".gitmodules");
        fs.accessSync(pathSubMod, fs.F_OK);

        var subHead = "[submodule ";
        var headFound = false;
        var submodules = [];
        var sub = readline.createInterface({
            input: fs.createReadStream(pathSubMod)
        });

        sub.on("line", function (line) {
            if (line.substr(0, subHead.length) == subHead) {
                headFound = true;
            }
            else {
                headFound = false;
            }

            if (!headFound ) {
                var kv = line.split("=");
                var key = kv[0].trim();
                var value = kv[1].trim();
                if (key == "path") {
                    submodules.push(value);
                }
            }
        });
        sub.on("close", function () {
            var done = false;
            for (var s in submodules) {
                done = true;
                var pathSubModNest = path.join(cwd, submodules[s]);
                console.log("Updating npm dependencies for git submodule '" + submodules[s] + "'.");
                console.log(childProcess.execSync("npm update 2>&1", { "cwd" : cwd }).toString());

                // check if submodules file is present
                try {
                    fs.accessSync(path.join(pathSubModNest, ".gitmodules"), fs.F_OK);

                    installGitSubmodules(pathSubModNest);
                }
                catch(e) {
                    // ignore
                }
            }
            if (!done) {
                console.log("No git submodules to install.");
            }
        });

    } catch (e) {
        console.log("No git submodules to install.");
    }
}

function uninstall() {
    try {
        // remove commit hook to pkx build
        var commitScript = path.join(".git", "hooks", "pre-commit");
        var scriptFile = path.join(process.cwd(), commitScript);
        fs.unlinkSync(scriptFile);
        commitScript = path.join(".git", "hooks", "post-commit");
        scriptFile = path.join(process.cwd(), commitScript);
        fs.unlinkSync(scriptFile);
    }
    catch(e) {
        console.error("An error occurred while trying to create the git pre- and post-commit hooks.", e);
        return;
    }
    console.log("Successfully removed the pre- and post-commit hooks.");
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

function usingFailed(loader, indent) {
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

function getGitIgnoreFiles(cwd, arr, callback) {
    var files = arr || [];
    try {
        var pathSubMod = path.join(cwd, ".gitignore");
        fs.accessSync(pathSubMod, fs.F_OK);

        var sub = readline.createInterface({
            input: fs.createReadStream(pathSubMod)
        });

        sub.on("line", function (line) {
            files.push(line);
        });
        sub.on("close", function () {
            callback(files);
        });

    } catch (e) {
        callback(files);
    }
}

function mkdirSyncRecursive(directory) {
    var parts = directory.split(path.sep);

    for (var i=1; i<=parts.length;i++) {
        var part = parts.slice(0,i).join(path.sep);
        try {
            fs.mkdirSync(part);
        }
        catch(e) {
            if (i == parts.length && e.code != "EEXIST") {
                throw e;
            }
        }
    }
}