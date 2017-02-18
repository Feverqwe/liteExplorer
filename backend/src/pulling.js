/**
 * Created by Anton on 15.02.2017.
 */
var debug = require('debug')('app:pulling');

var Pulling = function (options) {
    var sessionIdConnection = {};
    var emptyData = {
        success: true
    };
    var onRemove = function () {
        clearTimeout(this.timeout);
        delete sessionIdConnection[this.sessionId];
    };
    var onSend = function (data) {
        this.remove();
        this.res.json(data);
    };

    var sync = function (sessionId) {
        var session = options.sessionIdMap[sessionId];
        var connection = sessionIdConnection[sessionId];
        if (!connection) {
            // debug('Connection is not exits!', sessionId);
            return;
        }
        if (!session) {
            debug('Session is not exits!', sessionId);
            return;
        }

        var result = {
            success: true
        };

        var hasChanges = false;
        if (connection.state.fileList.id !== session.fileList.id) {
            result.fileList = session.fileList;
            hasChanges = true;
        }
        if (connection.state.taskList.id !== session.taskList.id) {
            result.taskList = session.taskList;
            hasChanges = true;
        }

        if (hasChanges) {
            connection.send(result);
        }
    };

    this.onRequest = function (session, req, res) {
        session.onConnection();
        var item = sessionIdConnection[session.id] = {
            sessionId: session.id,
            req: req,
            res: res,
            state: {
                fileList: JSON.parse(req.query.fileList),
                taskList: JSON.parse(req.query.taskList)
            },
            send: onSend,
            remove: onRemove,
            timeout: setTimeout(function () {
                item.send(emptyData);
            }, 60 * 1000)
        };

        sync(session.id);
    };
    this.change = function (sessionId) {
        sync(sessionId);
    };
    this.isConnected = function (sessionId) {
        return !!sessionIdConnection[sessionId];
    };
};
module.exports = Pulling;