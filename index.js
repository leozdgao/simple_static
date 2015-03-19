var http = require('http');
var fs = require('fs');
var path = require('path');

var connect = require('connect');
var contentDisposition = require('content-disposition');
var config = require('./config.json');

var app = connect();

app.use('/file', function(req, res, next) {
    var filePath = decodeURI(path.resolve(config.dir, req.url.slice(1)));
    fs.stat(filePath, function(err, stat) {
        if(err) {
            res.statusCode = 404;
            res.end();
        }
        else {
            if(stat.isDirectory()) {
                fs.readdir(filePath, function(err, results) {
                    if(err) {
                        res.statusCode = 500;
                        res.end();
                    }
                    else {
                        var structure = { dir: [], files: [] }
                        results.forEach(function(file) {

                            var stat = fs.statSync(path.resolve(filePath, file));
                            if(stat.isDirectory()) {
                                structure.dir.push(path.join(req.url, file));
                            }
                            else if(stat.isFile()) {
                                structure.files.push(path.join(req.url, file));
                            }
                        });

                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.end(JSON.stringify(structure));
                    }
                });
            }
            else {
                res.setHeader('Content-Disposition', contentDisposition(filePath));
                fs.createReadStream(filePath).pipe(res);
            }
        }
    });
});

// start server
http.createServer(app).listen(config.port);