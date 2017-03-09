#! /usr/bin/env node
var program = require("commander");

program
    .arguments("<request> [file]")
    //.option("-e, --embed", "If the destination file has an embed tag, the result of the request will be embedded.")
    .option("-s, --save", "Creates a wrapped script that can be used for embedding.")
    .action(function(request, file) {
        //console.log("user: %s pass: %s file: %s", program.username, program.password, file);
        if (program.save) {
            console.log("Saving " + request);
        }
    })
    .parse(process.argv);