#! /usr/bin/env node
var program = require("commander");
var using = require("../using.js/using.js");
var error = require("../cc.error/error.js");
var pkx = require("../cc.pkx/pkx.js");

program
    .arguments("[file]")
    //.option("-e, --embed", "If the destination file has an embed tag, the result of the request will be embedded.")
    .option("-b, --build [path]", "Creates a pkx from the given path.")
    .option("-s, --save <request>", "Creates a wrapped script that can be used for embedding.")
    .option("-t, --tree <request>", "Displays a dependency tree for the specified request.")
    .option("-m, --minify", "Enables code minification.")
    .option("--no-version", "Writes output files without version numbers in the file name.")
    .action(function(request, file) {
        //console.log("user: %s pass: %s file: %s", program.username, program.password, file);
        if (program.save) {
            console.log("Saving " + request);
        }
    })
    .parse(process.argv);

if (program.tree) {
    console.log("Displaying module dependency tree." + pkx.PKX_SYSTEM);

    //pkx.Require("./cc.error/").then(console.log, console.error);
    using({ "package" : "https://raw.githubusercontent.com/create-conform/cc.dummy/master/", "raw" : false, "ignoreDependencies" : true }).then(console.log, console.error);
}