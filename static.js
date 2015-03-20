var fs = require('fs');
var path = require('path');
var contentDisposition = require('content-disposition');
var Then = require('thenjs');

module.exports = function(dir) {

    return function(req, res, next) {
            var filePath = decodeURI(path.resolve(dir, req.url.slice(1)));

            Then(function(cont) {
                fs.stat(filePath, cont);
            })
            .then(function(cont, stat) {
                if(stat.isFile()) {
                    res.setHeader('Content-Disposition', contentDisposition(filePath));
                    fs.createReadStream(filePath).pipe(res);
                }
                else if(stat.isDirectory()) {
                    fs.readdir(filePath, cont);
                }
                else {
                    res.statusCode = 400;
                    res.end();
                }
            })
            .then(function(cont, results) {
                var structure = { dir: [], files: [] }
                results.forEach(function(file) {

                    var stat = fs.statSync(path.resolve(filePath, file));
                    var joinedPath = decodeURI(path.join(req.url, file));
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

                res.statusCode = 500;
                res.end();
            });
        }
}
