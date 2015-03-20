var http = require('http');
var connect = require('connect');
var config = require('./config.json');

var app = connect();

app.use(config.path || '/', require('./static')(config.dir));

// start server
http.createServer(app).listen(config.port);
