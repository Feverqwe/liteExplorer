/**
 * Created by Anton on 13.02.2017.
 */
var path = require('path');
var fs = require('fs-extra');
var utils = {};

/**
 * @param {string} localDirPath
 * @returns {Promise}
 */
utils.fsReadDir = function (localDirPath) {
    return new Promise(function (resolve, reject) {
        fs.readdir(localDirPath, function (err, files) {
            if (err) {
                reject(err);
            } else {
                if (localDirPath !== options.config.fs.root) {
                    files.push('..');
                }
                resolve(files);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise} always true
 */
utils.fsStat = function (localPath) {
    return new Promise(function (resolve, reject) {
        fs.stat(localPath, function (err, stats) {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
};

/**
 * @param {string} localPath
 * @returns {Promise}
 */
utils.fsRemove = function (localPath) {
    return new Promise(function (resolve) {
        fs.remove(localPath, function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
        });
    });
};

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
utils.fsCopy = function (fromPath, toPath) {
    return new Promise(function (resolve) {
        fs.copy(fromPath, toPath, function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
        });
    });
};

/**
 * @param {string} fromPath
 * @param {string} toPath
 * @returns {Promise}
 */
utils.fsMove = function (fromPath, toPath) {
    return new Promise(function (resolve) {
        fs.move(fromPath, toPath, function (err) {
            var result = {};
            result.name = name;
            result.success = !err;
            if (err) {
                result.message = err.message;
            }
            resolve(result);
        });
    });
};

/**
 * @param {string} localDirPath
 * @param {string[]} files
 * @returns {*}
 */
utils.validateFiles = function (localDirPath, files) {
    return utils.fsReadDir(localDirPath).then(function (localFiles) {
        var found = files.every(function (name) {
            return localFiles.indexOf(name) !== -1;
        });

        if (!found) {
            throw new Error('Some files is not found!');
        }
    });
};

/**
 * @param {string} evalPath
 * @returns {string}
 */
utils.safePath = function (evalPath) {
    var rootName = options.config.fs.rootName;
    var pos = evalPath.indexOf(rootName);
    if (pos !== -1) {
        evalPath = evalPath.substr(pos + rootName.length)
    }
    var pathArr = [];
    var parts = path.posix.normalize(evalPath).split('/');
    while (parts.length) {
        var part = parts.shift();
        if (part === '.' || part === '') {
            continue;
        }
        if (part === '..') {
            pathArr.pop();
        } else {
            pathArr.push(part);
        }
    }
    return pathArr.join('/');
};

module.exports = utils;