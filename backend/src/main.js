/**
 * Created by Anton on 11.02.2017.
 */
var debug = require('debug')('main');
var express = require('express');
var ipfilter = require('express-ipfilter').IpFilter;
var morgan = require('morgan');
var compression = require('compression');
var path = require('path');
var utils = require('./utils');
var FileList = require('./fileList');
var Tasks = require('./tasks');

var options = {
    server: null,
    expressApp: null,
    config: {
        express: {
            port: 8080,
            host: '0.0.0.0'
        },
        fs: {
            root: path.normalize(path.join(__dirname, '/../../share')),
            rootName: 'share',
            ipFilter: [
                '127.0.0.1/24',
                '192.168.0.0/24'
            ]
        }
    }
};

options.tasks = new Tasks(options);
options.fileList = new FileList(options);

options.expressApp = express();

morgan.token('remote-addr', function (req) {
    return req.get('X-Forwarded-For') || req.connection.remoteAddress;
});

options.expressApp.use(morgan('combined'));

options.expressApp.use(compression());


options.expressApp.use('/fs/api', ipfilter(options.config.fs.ipFilter, {
    mode: 'allow',
    log: false,
    allowedHeaders: ['x-forwarded-for']
}));

var actions = {
    fileList: function (req) {
        return options.fileList.getList(req).then(function (fileList) {
            return {
                success: true,
                fileList: fileList,
                taskList: options.tasks.getList()
            };
        });
    },
    rename: function (req) {
        var webDirPath = utils.safePath(options, req.query.path);
        var oldName = req.query.file;
        var newName = req.query.name;
        var localFromPath = path.join(options.config.fs.root, webDirPath, oldName);
        var localToPath = path.join(options.config.fs.root, webDirPath, newName);
        var result = {name: oldName};
        return utils.fsMove(localFromPath, localToPath).then(function () {
            result.success = true;
        }, function (err) {
            result.success = false;
            result.message = err.message;
        }).then(function () {
            return result;
        });
    },
    newFolder: function (req) {
        var webDirPath = utils.safePath(options, req.query.path);
        var name = req.query.name;
        var localPath = path.join(options.config.fs.root, webDirPath, name);
        var result = {name: name};
        return utils.fsEnsureDir(localPath).then(function () {
            result.success = true;
        }, function (err) {
            result.success = false;
            result.message = err.message;
        }).then(function () {
            return result;
        });
    },
    newTask: function (req) {
        return new Promise(function (resolve) {
           resolve(options.tasks[req.query.type].create(req));
        }).then(function () {
            return {
                success: true,
                taskList: options.tasks.getList()
            };
        });
    },
    task: function (req) {
        return new Promise(function (resolve) {
            resolve(options.tasks.onTask(req));
        }).then(function () {
            return {
                success: true,
                taskList: options.tasks.getList()
            };
        });
    }
};

options.expressApp.get('/fs/api', function (req, res) {
    new Promise(function (resolve) {
        return resolve(actions[req.query.action](req));
    }).then(function (data) {
        res.json(data);
    }).catch(function (err) {
        debug('getApi', err);
        res.status(500).json({success: false, message: err.message});
    });
});

options.expressApp.use(path.posix.join('/fs', options.config.fs.rootName), express.static(options.config.fs.root));
options.expressApp.use('/fs', express.static(path.join(__dirname + '/../../frontend')));

options.server = options.expressApp.listen(options.config.express.port, options.config.express.host, function () {
    var host = options.server.address().address;
    var port = options.server.address().port;

    debug('Listening at http://%s:%s', host, port);
});