## Simple static

Serve specific folder. All files in this folder and its subfolders will be downloaded, and if a direcotry is requested, it will return the structure of this directory.

You can also just use the middleware by require `static.js` to your Express or Connect project.

#### Configuration

- path: the path which url need matching
- dir: the folder need serving
- port: the port need listening

#### How to use

```
npm install && node index
```

Or, use `static.js` as a middleware, and use your own logic by change the options:

```
var simpleStatic = require('./static');

app.use('/', simpleStatic(dir, {
	filecallback: function() {},
	dircallback: function() {}
}));
```

`filecallback` will be called if requesting a file. `dircallback` will be called if requesting a directory. If you only response for file or directory request, you can add querystring to the url like this:

```
http://localhost:8000/directory/sub?stat=dir  //stat=file if only response the file requesting
```

Any request that not fit the requirement will response 400 code
