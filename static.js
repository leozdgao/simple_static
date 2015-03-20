var fs = require('fs');
var qs = require('querystring');
var path = require('path');
var contentDisposition = require('content-disposition');
var Then = require('thenjs');

function send(res, status, msg) {
    res.statusCode = status;
    res.end(msg && JSON.stringify({ msg: msg }));
}

module.exports = function(dir) {

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
            if(stat.isFile()) {
                // only dir return 400
                if(onlydir) send(res, 400);
                // download file
                else {
                    res.setHeader('Content-Disposition', contentDisposition(filePath));
                    fs.createReadStream(filePath).pipe(res);    
                }
            }
            else if(stat.isDirectory()) {
                // only file will not return dir structure
                if(onlyfile) send(res, 400);
                else fs.readdir(filePath, cont);
            }
            else send(res, 400);
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
        })
        .fail(function(cont, err) {

            send(res, 500, err.message);
        });
    }
}
