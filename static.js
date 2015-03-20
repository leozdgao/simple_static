var fs = require('fs');
var qs = require('querystring');
var path = require('path');
var contentDisposition = require('content-disposition');
var mime = require('mime');
var Then = require('thenjs');

function send(res, status, msg) {
    res.statusCode = status;
    res.end(msg && JSON.stringify({ msg: msg }));
}

module.exports = function(dir, opts) {

    opts = opts || {};
    if(typeof opts.filecallback !== 'function') {
        opts.filecallback = function(req, res, filePath) {
            res.setHeader('Content-Disposition', contentDisposition(filePath));
            res.setHeader('Content-Type', mime.lookup(filePath));
            fs.createReadStream(filePath).pipe(res);
        }
    }

    if(typeof opts.dircallback !== 'function') {
        opts.dircallback = function(req, res, filePath) {

            Then(function(cont) {
                fs.readdir(filePath, cont);
            })
            .then(function(cont, results) {
                // return dir structure
                var structure = { dir: [], files: [] }
                results.forEach(function(file) {

                    var stat = fs.statSync(path.resolve(filePath, file));
                    var joinedPath = path.join(req.path, file);
                    if(stat.isDirectory()) {
                        structure.dir.push(joinedPath);
                    }
                    else if(stat.isFile()) {
                        structure.files.push(joinedPath);
                    }
                });

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(structure));
            });
        }
    }

    return function(req, res, next) {

        req.path = req.path || decodeURI(req.url.split('?')[0]);
        req.query = req.query || qs.parse(req.url.split('?')[1]);
            
        var filePath = path.resolve(dir, req.path.slice(1));
        var onlydir = (req.query.stat === 'dir'),
            onlyfile = (req.query.stat === 'file');

        Then(function(cont) {
            fs.stat(filePath, cont);
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
