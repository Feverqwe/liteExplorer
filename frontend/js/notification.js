/**
 * Created by Anton on 13.02.2017.
 */
"use strict";
define([
    './dom'
], function (dom) {
    var notification = function () {
        var text = [].slice.call(arguments).map(function (item) {
            if (item instanceof Error) {
                return [item.code, item.message].join(':');
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