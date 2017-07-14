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
// constant
var PATH_CWD = process.cwd();

// dependency
var childProcess = require("child_process");
var path = require("path");

// privates
var config = { "argv" : [ "pkx" ] };

// cleanup args
var argv = [];
argv[0] = "file:///" + (path.join(__dirname, "..") + path.sep).replace(/\\/g, "/");
for (var a in process.argv) {
    if (a <= 1) {
        continue;
    }
    config.argv.push(process.argv[a]);
}
argv[1] = "--config";
argv[2] = JSON.stringify(config).replace(/"/g, "\"");
//argv[3] = "--ui";

// spawn child process
var ls = childProcess.spawn((/^win/.test(process.platform) ? "allume.cmd" : "allume"), argv, {"cwd": PATH_CWD});

// print stdout
ls.stdout.on("data", function(data) {
    console.log(data.toString().trim());
});

// print stderr
ls.stderr.on("data", function(data) {
    console.error(data.toString().trim());
});