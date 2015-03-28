# require packages
fs = require 'fs'
os = require 'os'
qs = require 'querystring'
path  = require 'path'
contentDisposition = require 'content-disposition'
mime = require 'mime'
glob = require 'glob'
# fswin = require 'fswin'
Then = require 'thenjs'

# method for quick response
send = (res, status, msg) ->
  res.statusCode = status
  res.end msg and JSON.stringify msg: msg

# module exports
module.exports = (dir, opts) ->
  # flag for deciding return hidden file or not
  hidden = opts?.hidden or false

  # function to check the file/dir is hidden or not
  isHidden = (filePath, cb) ->
    platform = do os.platform
    if(/^win/.test platform) then cb null, false
      # fswin.getAttributes filePath, (result) ->
      #   if result then cb.call(null, null, !!result['IS_HIDDEN'])
      #   else cb.call null, new Error('Path is unaccessible.')
    else
      if fs.existsSync filePath then cb.call(null, null, /^\./.test filePath)
      else cb.call null, new Error('Path is unaccessible.')

  # default callback when the request point to a file
  filecallback = opts?.filecallback or
    (req, res, filePath) ->
      # set downloading header
      res.setHeader 'Content-Disposition', contentDisposition filePath
      res.setHeader 'Content-Type', mime.lookup filePath
      # return file stream (downloading)
      fs.createReadStream filePath
        .pipe res

  # default callback when the request point to a directory
  dircallback = opts?.dircallback or
    (req, res, filePath) ->
      # pattern mode, return any path that meet the pattern
      if req.query?.pattern
        Then (cont) ->
          # use module glob to get results
          glob req.query.pattern, cwd: filePath, cont
        .then (cont, files) ->
          # response the json object
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end JSON.stringify files
      # nornal mode, return direcotry structrue
      else
        structure = dir: [], files: []
        Then (cont) ->
          fs.readdir filePath, cont
        .then (cont, results) ->
          Then.each results, (contp, file) ->
            target = path.resolve filePath, file
            Then (cont) ->
              # check whether skip this path if hidden
              if !hidden then isHidden target, cont else cont null, false
            .then (cont, skip) ->
              if !skip
                # check files and sub-directory in current directory
                stat = fs.statSync target
                joinedPath = path.join req.path, file
                if do stat.isDirectory then structure.dir.push joinedPath
                else if do stat.isFile then structure.files.push joinedPath
              # continue external thenable
              contp()
          .then (cont) ->
            # response the json object
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end JSON.stringify structure

  # return middleware
  (req, res, next) ->
    # polyfill
    req.path ?= decodeURI (req.url.split '?')[0]
    req.query ?= qs.parse (req.url.split '?')[1]

    filePath = path.resolve dir, req.path[1..]
    onlydir = req.query.stat is 'dir'
    onlyfile = req.query.stat is 'file'

    # check hidden first
    Then (cont) ->
      if !hidden then isHidden filePath, cont else cont null, false
    # get stat of requesting path
    .then (cont, skip) ->
      if skip then send res, 404
      else fs.stat filePath, cont
    # invoke the callback
    .then (cont, stat) ->
      if do stat.isFile and not onlydir then filecallback.call null, req, res, filePath
      else if do stat.isDirectory and not onlyfile then dircallback.call null, req, res, filePath
      else send res, 400
    # handle exceptions
    .fail (cont, err) ->
      console.log err
      if err.code is 'ENOENT' then send res, 404 else send res, 500, err.message

