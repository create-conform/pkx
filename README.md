# pkx

Toolkit for developing PKX modules.

## STATE

Usable. This devkit was made during the development of pkx, therefore the code is not the most clean and a shiny new devkit will be made once all of the components are in a stable state. Also this documentation needs work. If anything is missing or incorrect, please know that pkx is in a working state but still needs a lot of work and is missing some key features.

# PKX

PKX is a package system designed specifically for easy distribution & enabling cross-runtime (browser, node.js, ...) compatibility. It is created to allow apps and libraries to be distributed across runtime environments and platforms without the requirement to install. They can be made available through public and private repositories, have the ability to be made available offline and can automatically be updated when new versions are released. "It just works".

PKX is a product that grew from over 5 years of research and development on other projects. Recently it was completely rewritten to incorporate all the features listed further down, and be as modular is it can be.

## Quick Terminology

| Term | Description |
|---|---|
| Package | A tar file (optionally gzipped) containing javascript modules and/or resources, including a package.json to describe the package contents. |
| Selector | A javascript object that specifies a package you want to load, and any options you want to use. |
| Target | Targets are hosts that will run your package. In a selector, you can specify a target by matching properties such as runtime (browser, node.js, nw.js, ... ), platform (kind of OS the target is running), architecture (x86, armv7, ...) and many more. Every property in [cc.host](https://github.com/create-conform/cc.host) can be used in the target selector. |

## Features

  * Full-Featured Targeting System
    * Define which dependencies should load when the target meets specific requirements.
    * Specify different entry-points for different targets.
  * Flexible Repositories
    * Support for defining multiple repositories.
    * Repositories can be anywhere (http(s), file-system (only when runtime supports it), ...).
    * Custom repository plug-in system, out of the box there is a plugin that allows packages
      to be loaded directly from GitHub repository releases!
  * Flexible Selectors
    * Selectors can specify a target to match, whether it's auto-upgradable or even optional.
  * Memory Efficient
    * Dependencies are shared in-memory. If two different modules require the same dependency,
      there is no reason for the loader to re-download or re-define that dependency, instead a new instance is created from memory (or the first instance is reused if the module is designed that way).
    * All of the dependencies that the pkx system itself requires are in fact very common packages. This means that they are cached and available to
      other modules, and therefore don't need to be loaded again. This makes pkx's memory footprint quite small!
  * Dynamic Dependency Versioning
    * In a selector, you can specify if a package is upgradable. When a higher version of a package's dependency
      is loaded, new instances of your module will automatically use the newer version. You have control over the upgrade parameters!
  * Embedded packages
    * Dependencies or other packages can even be embedded inside pkx packages and are directly accessible in selectors. This makes it a great format for archiving a release including all of its dependencies.


## Table Of Contents

  * Tools
    * pkx
  * Getting Started
    * Create Demo Library
    * Create My App
    * Testing My App
  * Specification
    * PKX File Format
    * package.json
    * Selectors
  * Repository System
    * Adding The Main Repository
    * Adding Repositories
    * Repository Plugin
  * Dependency System
  * Bootloader
    * allume
    * Creating A Custom Bootloader
  * Design Patterns
    * Multiple Instance Module
    * Single Instance Module
    * Hybrid Node/AMD/PKX Module
  * Suggestions

## Tools

### pkx

```
INSTALL

   npm install pkx -g


USAGE

   pkx  [command]


DESCRIPTION

   Cross-platform CLI tool to help you build pkx packages.


COMMANDS

        wrap   <selector>  [options]             Creates wrapped version of the selected module, and saves them in subfolders in the current working directory.

               --appcache  <file>                Creates an HTML5 appcache file for the request being wrapped.
               --loader    <file>                Create a 'require' script that will load all the files required for the request being wrapped.
```

## Getting Started

Developing modular libraries or apps with pkx is very simple. The process is almost identical to creating commonjs modules. Create a main javascript file and a package.json! Let's create a library, and an app that will use this library.

### Create Demo Library

In the example below, you see a module that has only one function that returns the version of the package. In this example, a new instance of the module is created every time it is required by another module. This is quite unnecessary, and can be solved by adapting the example to use the singleton pattern, but for the purpose of this demo we'll keep it simple. You can read more about the single instance module pattern in the design patterns section.

```javascript
//
// demo.js
//
// Library created to demonstrate pkx.
//

// module class that will be instantiated every time it is required
function Demo(pkx, module, configuration) {
    this.getVersion = function() {
        return pkx.version;
    };
}

// define a module factory
define(function() {
    return new (Function.prototype.bind.apply(Demo, arguments));
});
```

Now we need to create a package.json file that will describe the package.

```javascript
{
  "name": "cc.demo",
  "version": "1.2.3",
  "title": "Demo Module",
  "description": "Module created to demonstrate pkx.",
  "license": "Apache-2.0",
  "main": "demo.js"
}
```

All we need to do to use the demo module that we've made above, is to create a gzipped tar file with .pkx extension, upload this to a static file server and use it in an app or library! This is not the only way to publish and use pkx packages. PKX was designed with repositories in mind, so you do not have to specify urls directly in a selector, but only the package id. A nice example is that [allume.cc](https://allume.cc) bootloader has the ability to load releases directly from GitHub repositories. You can read about this later in the repository system section. Let's create an app that will use this library!

### Create My App

Suppose that we've uploaded the package we previously created `cc.demo.1.2.pkx` to http://create-conform.com/pkx/, then we can use it in another library or app, by adding it to the `"pkxDependencies"` in the package.json.

```javascript
{
  "name": "my-app",
  "version": "1.0.0",
  "title": "Demo App",
  "description": "App that demonstrates pkx.",
  "license": "Apache-2.0",
  "main": "my-app.js",
  "pkxDependencies" : [
    { "package" : "http://create-conform.com/pkx/cc.demo.1.2.pkx" }
  ]
}
```

Next, we can use this dependency in our app by using the `require` function.

```javascript
//
// my-app.js
//
// App created to demonstrate pkx.
//

// module class that will be instantiated every time it is required
function App(pkx, module, configuration) {
    var demo = require("cc.demo");
    console.log("cc.demo version: " + demo.getVersion());
}

// define a module factory
define(function() {
    return new (Function.prototype.bind.apply(App, arguments));
});
```

However, this is not the only way to work with pkx dependencies, you can read about this in the dependency system section.

### Testing My App

There are a few ways to test our app. In all of our examples we use allume as our bootloader. Allume is our own ready-to-go solution that doesn't require the complex process of creating a custom package loader. However, if you want to create your own custom package loader, you may be interested in reading the bootloader section.

  * Browser
    1. upload the My App pkx to a static file server and use allume.cc to boot.
    ```
    https://allume.cc/?http://create-conform/pkx/my-app.1.2.pkx
    ```
    2. Commit & Push the git repository and use allume.cc to boot.
    ```
    https://allume.cc/?my-app.1.2&repo=https://api.github.com/repos/create-conform
    ```
    3. Start a local web server in the my-app directory and use allume.cc to boot.
    ```
    https://allume.cc/?http://localhost:8080/
    ```
    4. Install allume, use the built-in web server and browse to it
    ```

    npm install allume -g
    cd my-app-directory
    allume --serve 8080 ./
    # Open a browser and enter the allume built-in web server url
    # https://allume.cc/?http://localhost:8080/
    ```

  * node.js
    Install allume from npm, and boot the package
    ```bash
    npm install allume -g
    cd my-app-directory
    allume ./
    ```

When successful, you should see the message "cc.demo version: 1.2.3" appearing in the console. And that's it!

Allume has lots of easy to use options that will make your life as a developer more easy, like the ability to switch between production and test environments. Read more about this on https://allume.cc.

## Specification

### PKX File Format

A pkx package is just a tar file that contains all of your javascript and resource files accompanied by
a package.json. The pkx file can also be gzipped.

### package.json

The package.json is based on and compatible with the commonjs spec. It has some key differences. All specific targetting properties from the commonjs spec are ignored. With pkx, you use the target property in the selectors which opens up allot of possibilities.

#### Example package id:

```
mickeysoft.notepad.format.utf8.1.2.3
```

#### Properties:

| Property  | Mandatory | Description | Example |
|---|---|---|---|
| name | yes | The name of the package. This is considered to be the package id without the version number, and plays a vital role in the repository system. Can only contain lowercase alphanumeric characters, dashes and dots. | `mickeysoft.notepad.format.utf8` |
| version | yes | Semantic version string. Can only contain three number groups, dot separated. | `1.2.3` |
| main | no | The main entry point of the package. | `index.js` |
| pkxMain | no | Hash with target selectors. This is basically an advanced alternative for the `main` property. Also, if this property is present, it will be used instead of the regular `main` property.The order is significant, and the first match will be taken. | <pre lang="javascript">{ "index.js" : { "runtime" : "browser" }, "native.js" : { "platform" : "win32" } }</pre> |
| pkxDependencies | no | Array of selectors. | <pre lang="javascript">[{ "package" : "cc.type.1.0", "upgradable" : "minor" }, "mickeysoft.utils.1.0" ]</pre> |

### Selectors

A selector is an object with some properties.

#### Example package id:

The following selector will get a stream for the README.md file from a package with id `mickeysoft.notepad.format.utf8.1.2.3`.

```javascript
{
    "package" : "mickeysoft.notepad.format.utf8.1.2.3",
    "resource" : "README.md",
    "upgradable" : "minor",
    "target" : {
        "runtime" : "nw.js"
    },
    "optional" : true
}
```

#### Properties:

| Property  | Mandatory | Description | Example |
|---|---|---|---|
| package | yes | The package can be an id string, or a uri string. When an id is provided, pkx will fetch the package from the first matching repositoriy in your configuration. The id string must contain at least the major and minor version. The patch version can be omitted since pkx packages in static repositories are named without the patch version. If you specify a url, it will load the specified file. For development purposes, a url to a directory containing a package can also be used (the url must end with a `/`). Downside of this approach is that the package will not be cached. | `mickeysoft.notepad.format.utf8.1.2.3` |
| resource | no | You can also specify a specific resource to load. If this option is not provided, it takes the resource specified in the "main" field of the package.json. If the resource is a javascript file, it will be run if not already in memory and a new instance is resolved, for json files it will resolve to an object and css files are added to the document head if running inside a browser. Any other type will resolve into a data stream. | `README.md` |
| target | no | In a selector, you can specify target properties that will be matched against the properties of the cc.host library. There are property modifiers available, such as "!" to invert the result. See cc.host documentation for the list of available properties. | <pre lang="javascript">{ "runtime" : "nw.js" }</pre> |
| upgradable | no | You can specify if the given package selector is upgradable, that means if a newer version of the specified package is available, it will be used instead. Possible values are: `null` (not upgradable), `"patch"` (only higher patch number), `"minor"` (higher patch & minor number), `"major"` (any higher version). If this option is not provided, it defaults to "patch". | `minor` |
| optional | no | If set to true, the loader will not fail when the package is not loaded due to errors or target mismatch. | `true` |
| ignoreCache | no | If set to true, the loader will ignore the module cache for this request. | `true` |

## Bootloader

You need a pkx loader to run the package. We recommend our own allume bootloader.
For node, you can install allume locally through npm:
```bash
npm install allume -g
```
For browsers you can just browse to allume.cc using query parameters. Allume uses HTML5 technology to make it available offline, so you only need to visit allume.cc once.

Read more about this on http://allume.cc.

### Creating A Custom Bootloader

If you don't like using our allume bootloader, then you can always build your own to incorporate pkx package support in your application.

This part of the documentation needs to be written out. But these are the headlines:

  * Include using.js in your project.
  * Wrap cc.pkx using the pkx CLI tool and generate an include file.
  * Add the include file to your project.
  * Subscribe to any events in using.js.
  * Register custom repository plugins.
  * Start loading packages!

An excellent example is our open source allume bootloader which you can find at https://github.com/create-conform/allume. You could use this source as a template to build upon yourself.

## Repository System

The pkx format is designed to be loaded from repositories at runtime. By default a repository is a static web server that just hosts the pkx files, but you can write your own custom repository plugins. For instance, allume provides a plugin which allows you to specify a GitHub api repository url, which will fetch releases from GitHub. You can specify the main repository in the package loader.

PKX has a main repository, and namespace repositories.
It will first try to match namespace repositories, and when a repository was not found it will try the main repository.

### Adding The Main Repository

To add the main repository, you need to wait for the pkx loader to be registered, and then register the main repository. The define.Loader.waitFor callback will always fire, even if the pkx loader is already registered. In that case, the callback will be called immediately.

```javascript
define.Loader.waitFor("pkx", function(loader) {
    loader.addRepository("", "https://create-conform.com/pkx/");
});
```

The first argument specifies the repository namespace, and the second the url. If the namespace is empty, the url will be registered as the main repository. This can only be done once, if you try to overwrite it afterwards, it will fail.

### Adding Repositories

To add additional repositories, just add them to the loader in the same way as the main repository, but specify a namespace.

```javascript
define.Loader.waitFor("pkx", function(loader) {
    loader.addRepository("cc", "https://api.github.com/repos/create-conform/");
});
```

In the example above, selectors with package id's starting with "cc" will be fetched from that repository. Note that the example above will only work with the allume GitHub plugin.

### Repository Plugin

You can develop your own plugins for handling requests. This could be used for integrating authentication or resolving special URI's, working with custom APIs.

The example below transforms request urls.

request: `"cc.demo"` becomes `"https://create-conform.com/cc.demo/v1.2/"`.

the `process` function will be called for every request. Our `process` function will then check if the uri authority (the hostname) equals `create-conform.com`, which is the repository we are targeting, and returns a promise that will resolve if the uri has been transformed. The transformation happens by setting the selector's `uri` property. You can use the `selector.parseURI()` function to return a `URI` object that you can use to set. This function will also replace some substitors in the name. You can find a list of possible substitutors below the example.

```javascript
(function() {
    var REQUEST_PROC_NAME = "demo";
    var HOST_DEMO = "create-conform.com";
    var URI_PATH_DEMO_TEMPLATE = "$NAME/v$MAJOR.$MINOR/";

    function RequestProcessorDemo() {
        var self = this;

        this.process = function(selector) {
            if (selector.uri.authority.host != HOST_DEMO) {
                return;
            }

            return new Promise(function (resolve, reject) {
                var uriModififed = selector.parseURI(selector.repository + URI_PATH_DEMO_TEMPLATE);

                try {
                    selector.uri = uriModififed;
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });
        }

        // register request processor
        define.Loader.waitFor("pkx", function(loader) {
            loader.addRequestProcessor(REQUEST_PROC_NAME, self.process);
        });
    }

    var processor = new RequestProcessorDemo();
    define(function () {
        return processor;
    });
})();
```

#### Template fields:

| Substitutor | Description | Example |
|---|---|---|
| $ID | The id of the package. | `cc.demo.1.2.3` |
| $PACKAGE | The file name of the package. | `cc.demo.1.2.pkx` |
| $NAME | The id of the package without the version number. | `cc.demo` |
| $PATCH | The patch version number. | `3` |
| $MINOR | The minor version number. | `2` |
| $MAJOR | The major version number. | `1` |

## Dependency System

Dependencies are resolved the same way as the `using` function does, by using selectors. See the selectors section or more information on selectors. The dependencies in the package.json is an array of strings or objects. All these dependencies are resolved by using.js and only if all of them complete, the package itself is resolved.

```javascript
"pkxDependencies" : [
    {
        "package" : "cc.type.1.0",
        "upgradable" : "minor"
    },
    {
        "package" : "cc.string.1.0",
        "upgradable" : "minor"
    }
]
```

## Design Patterns

### Multiple Instance Module

You can use this design pattern if your module must or can be instantiated every time it is required. This has an upside: when dependencies are marked as upgradable, newer versions will automatically be used when a new instance is created.

```javascript
//
// multi.js
//
// Template for multiple instance module.
//

// module class that will be instantiated every time it is required
function Demo(pkx, module, configuration) {
    this.getVersion = function() {
        return pkx.version;
    };
}
// define a module factory
define(function() {
    return new (Function.prototype.bind.apply(Demo, arguments));
});
```

### Single Instance Module

If your module is only supposed to be instantiated once, and that instance being recycled each time it is required, you can use the pattern below. A good example is our own open source cc.io library. It needs to be single instance, because io modules can be registered and it is in our best interest to have a shared instance across modules.

```javascript
//
// single.js
//
// Template for single instance module.
//

// module class that will only be instantiated once
function Demo(pkx, module, configuration) {
    this.getVersion = function() {
        return pkx.version;
    };
}
// define a module factory
var singleton;
define(function() {
    if (!singleton) {
        singleton = new (Function.prototype.bind.apply(Demo, arguments));
    }
    return singleton;
});
```

### Hybrid Node/AMD/PKX Module

You can also create a hybrid module that works with node.js, AMD and PKX. During the development phase, cc.pkx used this pattern in order to build it's own tools. Needless to say, if you use this pattern directly in node.js your `pkxDependencies` will not be loaded, you really need to load the module using cc.pkx.

```javascript

(function() {
    function Demo(pkx, module, configuration) {
        this.getVersion = function() {
            return pkx.version;
        };
    }

    var singleton;
    (function (obj, factory) {
        var supported = false;
        if (typeof define === "function" && (define.amd || define.using)) {
            define(factory);

            if (define.using) {
                // self instantiate
                factory();
            }
            supported = true;
        }
        if (typeof module === "object" && module.exports && typeof require != "undefined" && typeof require.main != "undefined" && require.main !== module) {
            module.exports = factory();
            supported = true;
        }
        if (!supported) {
            obj.returnExports = factory();
        }
    }(this, function() {
        if (singleton) {
            return singleton;
        }
        singleton = new (Function.prototype.bind.apply(PKX, arguments));
        return singleton;
    }));
})();
```

## Suggestions

Documentation is almost never perfect. Help is wanted and needed! If you have any suggestions or contributions, please feel free to create an issue on https://github.com/create-conform/cc.pkx. Maybe you can dig in and contribute!