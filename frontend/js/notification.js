/**
 * Created by Anton on 13.02.2017.
 */
define([
    './dom'
], function (dom) {
    var notification = function (error) {
        var text = [].slice.call(arguments).map(function (item, i) {
            if (item instanceof Error) {
                return [error.code, error.message].join(':');
            } else {
                return item;
            }
        }).join(' ');

        var node = dom.el('div', {
            class: 'notification',
            text: text
        });
        [].slice.call(document.querySelectorAll('.notification')).forEach(function (node) {
            var style = parseInt(getComputedStyle(node, null).top) || 0;
            node.style.top = (style + 35) + 'px';
        });
        document.body.appendChild(node);
        setTimeout(function () {
            node.parentNode.removeChild(node);
        }, 3000);
    };
    return notification;
});