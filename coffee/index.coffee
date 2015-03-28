# require packages
http = require 'http'
connect = require 'connect'
config = require './config.json'

# create connect instance
app = do connect

# set middleware
app.use config.path or '/', require('./static') config.dir

# create server
http.createServer app
    .listen config.port or 3000