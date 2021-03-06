﻿/* globals NodeList, HTMLCollection */

window.onload = function () {
    var postId = null;

    //#region Helpers

    function objectToUrl(obj) {
        var string = '';

        for (var prop in obj) {
            string += prop + '=' + obj[prop].replace(/ /g, '+') + '&';
        }

        return string.substring(0, string.length - 1);
    }

    var AsynObject = AsynObject ? AsynObject : {};

    AsynObject.ajax = function (url, callback) {
        var ajaxRequest = AsynObject.getAjaxRequest(callback);
        ajaxRequest.open("GET", url, true);
        ajaxRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        ajaxRequest.send(null);
    };


    AsynObject.postAjax = function (url, callback, data) {
        var ajaxRequest = AsynObject.getAjaxRequest(callback);
        ajaxRequest.open("POST", url, true);
        ajaxRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        //ajaxRequest.setRequestHeader("Connection", "close");
        ajaxRequest.send(objectToUrl(data));
    };

    AsynObject.getAjaxRequest = function (callback) {

        var ajaxRequest = new XMLHttpRequest();

        ajaxRequest.onreadystatechange = function () {
            if (ajaxRequest.readyState > 1 && ajaxRequest.status > 0) {
                callback(ajaxRequest.readyState, ajaxRequest.status, ajaxRequest.responseText);
            }
        };

        return ajaxRequest;
    };

    function hasClass(elem, className) {
        return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
    }

    function addClass(elem, className) {
        if (!hasClass(elem, className)) {
            elem.className += ' ' + className;
        }
    }

    function removeClass(elem, className) {
        var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
        if (hasClass(elem, className)) {
            while (newClass.indexOf(' ' + className + ' ') >= 0) {
                newClass = newClass.replace(' ' + className + ' ', ' ');
            }
            elem.className = newClass.replace(/^\s+|\s+$/g, '');
        }
    }

    function toDOM(htmlString) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = htmlString;
        return wrapper.children;
    }

    function getParentsByAttribute(element, attr, value) {
        var arr = [];

        while (element) {
            element = element.parentNode;
            if (element.hasAttribute(attr) && element.getAttribute(attr) === value) {
                arr.push(element);
            }
            if (!element.parentNode.parentNode) {
                break;
            }
        }

        return arr;
    }

    function bindEvent(el, eventName, eventHandler) {
        if (el.addEventListener) {
            el.addEventListener(eventName, eventHandler, false);
        } else if (el.attachEvent) {
            el.attachEvent('on' + eventName, eventHandler);
        }
    }

    Element.prototype.remove = function () {
        this.parentElement.removeChild(this);
    };

    NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
        for (var i = 0, len = this.length; i < len; i++) {
            if (this[i] && this[i].parentElement) {
                this[i].parentElement.removeChild(this[i]);
            }
        }
    };

    function slide(thisObj, direction, callback) {
        if (direction === "Up") {
            thisObj.style.height = '0px';
        } else {
            var clone = thisObj.cloneNode(true);

            clone.style.position = 'absolute';
            clone.style.visibility = 'hidden';
            clone.style.height = 'auto';

            addClass(clone, 'slideClone col-m-6 push-m-3');

            document.body.appendChild(clone);

            var slideClone = document.getElementsByClassName("slideClone")[0];
            var newHeight = slideClone.clientHeight;

            slideClone.remove();
            thisObj.style.height = newHeight + 'px';
            if (callback) {
                setTimeout(function () {
                    callback();
                }, 500);
            }
        }
    }

    //#endregion

    var endpoint = "/comment.ashx";

    function deleteComment(commentId, element) {

        if (confirm("Do you want to delete this comment?")) {
            AsynObject.postAjax(endpoint, function (state, status) {
                if (state === 4 && status === 200) {
                    slide(element, "Up", function () {
                        element.remove();
                    });
                    return;
                }
                else if (status !== 200) {
                    alert("Something went wrong. Please try again");
                }
            }, {
                mode: "delete",
                postId: postId,
                commentId: commentId
            });
        }
    }

    function saveComment(name, email, website, content, callback) {

        if (localStorage) {
            localStorage.setItem("name", name);
            localStorage.setItem("email", email);
            localStorage.setItem("website", website);
        }

        AsynObject.postAjax(endpoint, function (state, status, data) {

            var elemStatus = document.getElementById("status");
            if (state === 4 && status === 200) {
                elemStatus.innerHTML = "<p>Your comment has been added</p>";
                removeClass(elemStatus, "hidden");
                removeClass(elemStatus, "alert-danger");
                addClass(elemStatus, "alert-success");

                document.getElementById("commentcontent").value = "";

                AsynObject.ajax(data, function (state2, status2, html) {
                    if (state2 === 4 && status2 === 200) {
                        var comment = toDOM(html)[0];
                        comment.style.height = "0px";
                        BindDeleteCommentsEvent(comment);
                        var elemComments = document.getElementById("comments");
                        elemComments.appendChild(comment);
                        slide(comment, "Down");
                        callback(true);
                    }
                });

                return;
            }
            else if (status !== 200) {
                removeClass(elemStatus, "hidden");
                addClass(elemStatus, "alert-danger");
                elemStatus.innerHTML = "<p>" + data.statusText + "</p>";
                callback(false);
            }
        }, {
            mode: "save",
            postId: postId,
            name: name,
            email: email,
            website: website,
            content: content
        });

    }

    function BindDeleteCommentsEvent(element) {
        bindEvent(element, 'click', function (e) {
            e.preventDefault();
            var button = e.target;
            var element = getParentsByAttribute(button, "itemprop", "comment")[0];
            deleteComment(element.getAttribute("data-id"), element);
        });
    }

    function initialize() {
        postId = document.querySelector("[itemprop=blogPost]").getAttribute("data-id");
        var email = document.getElementById("commentemail");
        var name = document.getElementById("commentname");
        var website = document.getElementById("commenturl");
        var content = document.getElementById("commentcontent");
        var commentForm = document.getElementById("commentform");

        var allComments = document.querySelectorAll("[itemprop=comment]");
        for (var i = 0; i < allComments.length; ++i) {
            allComments[i].style.height = allComments[i].clientHeight + 'px';
        }

        commentForm.onsubmit = function (e) {
            e.preventDefault();
            var button = e.target;
            button.setAttribute("disabled", true);

            saveComment(name.value, email.value, website.value, content.value, function () {
                button.removeAttribute("disabled");
            });
        };

        website.addEventListener("keyup", function (e) {
            var w = e.target;
            if (w.value.trim().length >= 4 && w.value.indexOf("http") === -1)
                w.value = "http://" + w.value;
        });

        var elementsDeleteComments = document.getElementsByClassName('deletecomment');

        for (var a = 0, len = elementsDeleteComments.length; a < len; a++) {
            BindDeleteCommentsEvent(elementsDeleteComments[a]);
        }

        if (localStorage) {
            email.value = localStorage.getItem("email");
            website.value = localStorage.getItem("website");

            if (name.value.length === 0) name.value = localStorage.getItem("name");
        }
    }

    if (document.getElementById("commentform")) {
        initialize();
    }

};