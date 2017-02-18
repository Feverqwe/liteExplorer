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
        delete sessionIdConnection[this.session.id];
    };
    var onSend = function (data) {
        this.remove();
        this.res.json(data);
    };

    var sync = function (sessionId) {
        var session = options.sessionIdMap[sessionId];
        var connection = sessionIdConnection[sessionId];
        if (!connection) return;

        var hasChanges = false;
        if (connection.state.fileList.id !== session.fileList.id) {
            hasChanges = true;
        }
        if (connection.state.taskList.id !== session.taskList.id) {
            hasChanges = true;
        }

        if (hasChanges) {
            connection.send(JSON.parse(JSON.stringify(session)));
        }
    };

    this.onRequest = function (session, req, res) {
        var item = sessionIdConnection[session.id] = {
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
};
module.exports = Pulling;