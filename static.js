var fs = require('fs');
var os = require('os');
var qs = require('querystring');
var path = require('path');
var contentDisposition = require('content-disposition');
var mime = require('mime');
var glob = require('glob');
var fswin = require('fswin');
var Then = require('thenjs');

function send(res, status, msg) {
    res.statusCode = status;
    res.end(msg && JSON.stringify({ msg: msg }));
}

module.exports = function(dir, opts) {

    opts = opts || {};
    opts.hidden = opts.hidden || false;

    if(typeof opts.filecallback !== 'function') {
        opts.filecallback = function(req, res, filePath) {
            // download file
            res.setHeader('Content-Disposition', contentDisposition(filePath));
            res.setHeader('Content-Type', mime.lookup(filePath));
            fs.createReadStream(filePath).pipe(res);
        }
    }

    if(typeof opts.dircallback !== 'function') {
        opts.dircallback = function(req, res, filePath) {
            if(req.query.pattern) {
                Then(function(cont) {
                    glob(req.query.pattern, {cwd: filePath}, cont);
                })
                .then(function(cont, files) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify(files));
                });
            }
            else {
                var structure = { dir: [], files: [] };
                Then(function(cont) {
                    fs.readdir(filePath, cont);
                })
                .then(function(cont, results) {
                    // return dir structure
                    Then.each(results, function(contp, file){
                        var target = path.resolve(filePath, file);

                        if(!opts.hidden) {
                            Then(function(cont) {
                                isHidden(target, cont);
                            })
                            .then(function(cont, isHidden) {
                                if(isHidden) contp();
                                else {
                                    var stat = fs.statSync(target);
                                    var joinedPath = path.join(req.path, file);
                                    if(stat.isDirectory()) {
                                        structure.dir.push(joinedPath);
                                    }
                                    else if(stat.isFile()) {
                                        structure.files.push(joinedPath);
                                    }
                                    contp();
                                }
                            });
                        }
                    })
                    .then(function(cont) {
                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.end(JSON.stringify(structure));
                    });
                })
                
            }
        }
    }

    function isHidden(filePath, cb) {
        var platform = os.platform();
        if(/^win/.test(platform)) { // if windows
            fswin.getAttributes(filePath, function(result) {
                if(result) cb.call(null, null, !!result['IS_HIDDEN']);
                else cb.call(null, new Error('Path is unaccessible.'));
            })
        }
        else {
            if(fs.existsSync(filePath)) cb.call(null, null, /^\./.test(filePath));
            else cb.call(null, new Error('Path is unaccessible.'));
        }
    }

    return function(req, res, next) {

        req.path = req.path || decodeURI(req.url.split('?')[0]);
        req.query = req.query || qs.parse(req.url.split('?')[1]);
            
        var filePath = path.resolve(dir, req.path.slice(1));
        var onlydir = (req.query.stat === 'dir'),
            onlyfile = (req.query.stat === 'file');

        Then(function(cont) {

            if(!opts.hidden) isHidden(filePath, cont);
            else cont(null, false);
        })
        .then(function(cont, ishidden) {
            if(ishidden) send(res, 404);
            else fs.stat(filePath, cont);
        })
        .then(function(cont, stat) {
            if(stat.isFile() && !onlydir) {
                opts.filecallback.call(null, req, res, filePath);
            }
            else if(stat.isDirectory() && !onlyfile) {
                opts.dircallback.call(null, req, res, filePath);
            }
            else send(res, 400);
        })
        .fail(function(cont, err) {

            if(err.code === 'ENOENT') send(res, 404);
            else send(res, 500, err.message);
        });
    }
}
