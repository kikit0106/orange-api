"use strict";
module.exports = function (grunt) {
    // load all grunt task libraries
    require("load-grunt-tasks")(grunt);

    // run app
    grunt.registerTask("matchStart", ["exec:matcherStop", "exec:matcherStart"]);
    grunt.registerTask("server:dev", ["matchStart", "express:dev", "watch", "exec:matcherStop"]);
    grunt.registerTask("server:test", ["matchStart", "express:test"]);
    grunt.registerTask("dev", ["eslint", "server:dev"]);

    // clean up code and run tests
    grunt.registerTask("default", ["eslint", "test", "exec:matcherStop"]);
    grunt.registerTask("test", ["dropDatabase", "server:test", "mochaTest:all"]);

    // generate code coverage using bash istanbul wrapper
    grunt.registerTask("coverage", ["exec:coverage"]);
    // push code coverage to coveralls.io
    grunt.registerTask("coverage:push", ["exec:coverage", "coveralls"]);

    // generate documentation locally
    grunt.registerTask("docs", ["exec:docs"]);
    // generate documentation and push it to github
    grunt.registerTask("docs:push", ["docs", "gh-pages"]);

    var mongoose = require("mongoose");
    grunt.registerTask("dropDatabase", function () {
        // force grunt into async
        var done = this.async();
        mongoose.connect("mongodb://localhost/orange-api", function (err) {
            if (err) return done(err);
            mongoose.connection.db.dropDatabase(function(err) {
                if (err) return done(err);
                console.log("Database dropped");
                mongoose.connection.close(done);
            });
        });
    });

    grunt.initConfig({
        // detect code smells and particularly bad formatting
        eslint: {
            target: ["Gruntfile.js", "app.js", "lib/*.js", "lib/**/*.js", "test/*.js", "test/**/*.js"]
        },

        // run tests: make sure to close all express/db/sinon/etc connections or this
        // will hang
        mochaTest: {
            all: {
                options: {
                    reporter: "spec",
                    timeout: "10000"
                },
                src: ["test/common/db_helper.js", "test/common/*.js", "test/*.js", "test/*/common.js", "test/**/*.js"]
            },
            unit: {
                options: {
                    reporter: "spec",
                    timeout: "10000"
                },
                src: ["test/common/db_helper.js", "test/common/*.js", "test/*/unit/*.js", "test/*/unit/**/*.js"]
            }
        },

        // run test server
        express: {
            test: {
                options: {
                    script: "run.js"
                }
            },
            dev: {
                options: {
                    script: "run.js",
                    backround: false
                }
            }
        },

        watch: {
            express: {
                // reloading broken on OSX because of EMFILE hence this hack
                files: [ "gruntfile.js" ],
                tasks: [ "express:dev" ],
                options: {
                    spawn: false
                }
            }
        },

        exec: {
            // build documentation locally: latest version of aglio doesn't play well with grunt-aglio
            // so we use a shell script instead
            docs: {
                cwd: "docs",
                cmd: "./build.sh"
            },
            // generate code coverage: bash wrapper around istanbul as their cli makes things a lot easier
            // than playing around with js hooks
            coverage: "./cover.sh",
            // python ZeroMQ server to perform schedule/dose event matching (a little computationally non-trivial
            // so we use python for faster results)
            matcherStart: {
                cwd: "lib/matching",
                cmd: "./matcher_rpc.py start"
            },
            matcherStop: {
                cwd: "lib/matching",
                cmd: "./matcher_rpc.py stop"
            }
        },

        // coveralls.io code coverage service
        coveralls: {
            options: {
                force: false
            },
            src: ["./coverage/lcov.info"]
        },

        // push generated documentation straight to gh pages (with fixed commit message, but that's not
        // the end of the world)
        "gh-pages": {
            options: {
                base: "docs/output",
                message: "Documentation updates (gh-pages commit message autogenerated by grunt)"
            },
            src: ["**"]
        }
    });
};