/*** Generated by streamline.js 0.1.2 - DO NOT EDIT ***/

var __global = typeof global !== 'undefined' ? global : window;
function __cb(_, self, fn){ var ctx = __global.__context; return function(err, result){ __global.__context = ctx; if (err) return _.call(self, err); return fn.call(self, null, result); } }
function __nt(_, self, fn){ var i = 0; var cb = __cb(_, self, fn); var safeCb = function(){ try { cb(); } catch (ex) { __propagate(cb, self, ex); } }; if (typeof process != "undefined" && typeof process.nextTick == "function") return function(){ if (++i % 20 == 0) process.nextTick(safeCb); else cb(); }; else return function(){ if (++i % 20 == 0) setTimeout(safeCb); else cb(); }; }
function __propagate(_, self, err){ try { _.call(self, err); } catch (ex) { __uncaught(ex); } }
function __throw(err){ if (err) throw err; }
function __uncaught(ex){ console.error("UNCAUGHT EXCEPTION: " + ex.message + "\n" + ex.stack); }
var fs = require("fs");
function du(_, path) {
    var __ = (_ = (_ || __throw));
    var total = 0;
    return fs.stat(path, __cb(_, this, function(__0, stat) {
        return (function(__) {
            if (stat.isFile()) {
                return fs.readFile(path, __cb(_, this, function(__0, __2) {
                    total += __2.length;
                    return __();
                }));
            }
             else {
                if (stat.isDirectory()) {
                    return fs.readdir(path, __cb(_, this, function(__0, files) {
                        var i = 0;
                        var __5 = false;
                        return (function(__break) {
                            var __loop = __nt(_, this, function() {
                                var __ = __loop;
                                if (__5) {
                                    i++;
                                }
                                 else {
                                    __5 = true;
                                }
                            ;
                                if ((i < files.length)) {
                                    return du(__cb(_, this, function(__0, __4) {
                                        total += __4;
                                        return __();
                                    }), ((path + "/") + files[i]));
                                }
                                 else {
                                    return __break();
                                }
                            ;
                            });
                            return __loop();
                        }).call(this, function() {
                            console.log(((path + ": ") + total));
                            return __();
                        });
                    }));
                }
                 else {
                    console.log((path + ": odd file"));
                }
            ;
                return __();
            }
        ;
        }).call(this, function() {
            return _(null, total);
        });
    }));
};
var p = ((process.argv.length > 2) ? process.argv[2] : ".");
var t0 = Date.now();
function report(err, result) {
    if (err) {
        console.log(((err.toString() + "\n") + err.stack));
    };
    console.log((("completed in " + ((Date.now() - t0))) + " ms"));
};
du(report, p);