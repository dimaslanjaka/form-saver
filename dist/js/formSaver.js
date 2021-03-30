var forEach = function (collection, callback, scope = null) {
    if (Object.prototype.toString.call(collection) === "[object Object]") {
        for (var prop in collection) {
            if (Object.prototype.hasOwnProperty.call(collection, prop)) {
                callback.call(scope, collection[prop], prop, collection);
            }
        }
    }
    else {
        for (var i = 0, len = collection.length; i < len; i++) {
            callback.call(scope, collection[i], i, collection);
        }
    }
};
var getClosest = function (elem, selector) {
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.matchesSelector ||
                Element.prototype.mozMatchesSelector ||
                Element.prototype.msMatchesSelector ||
                Element.prototype.oMatchesSelector ||
                Element.prototype.webkitMatchesSelector ||
                function (s) {
                    var matches = (this.document || this.ownerDocument).querySelectorAll(s), i = matches.length;
                    while (--i >= 0 && matches.item(i) !== this) { }
                    return i > -1;
                };
    }
    for (; elem && elem !== document; elem = elem.parentNode) {
        if (elem.matches(selector))
            return elem;
    }
    return null;
};
var getDataOptions = function (options) {
    return !options ||
        !(typeof JSON === "object" && typeof JSON.parse === "function")
        ? {}
        : JSON.parse(options);
};
var eventHandler = function (event) {
    var toggle = event.target;
    var save = getClosest(toggle, settings.selectorSave);
    var del = getClosest(toggle, settings.selectorDelete);
    if (save) {
        event.preventDefault();
        formSaver.saveForm(save, save.getAttribute("data-form-save"), settings);
    }
    else if (del) {
        event.preventDefault();
        formSaver.deleteForm(del, del.getAttribute("data-form-delete"), settings);
    }
};
var isBrowser = new Function("try {return this===window;}catch(e){ return false;}");
var isNode = new Function("try {return this===global;}catch(e){return false;}");
var settings, forms;
var defaults = {
    selectorStatus: "[data-form-status]",
    selectorSave: "[data-form-save]",
    selectorDelete: "[data-form-delete]",
    selectorIgnore: "[data-form-no-save]",
    deleteClear: true,
    saveMessage: "Saved!",
    deleteMessage: "Deleted!",
    saveClass: "",
    deleteClass: "",
    initClass: "js-form-saver",
    callbackSave: function () { },
    callbackDelete: function () { },
    callbackLoad: function () { },
};
function extend_setting_form(...param) {
    var extended = defaults;
    var deep = false;
    var i = 0;
    if (Object.prototype.toString.call(arguments[0]) === "[object Boolean]") {
        deep = arguments[0];
        i++;
    }
    var merge = function (obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if (deep &&
                    Object.prototype.toString.call(obj[prop]) === "[object Object]") {
                    extended[prop] = extend_setting_form(extended[prop], obj[prop]);
                }
                else {
                    extended[prop] = obj[prop];
                }
            }
        }
    };
    for (; i < arguments.length; i++) {
        merge(arguments[i]);
    }
    return extended;
}
class formSaver {
    static saveForm(btn, formID, options, event = null) {
        var overrides = getDataOptions(btn ? btn.getAttribute("data-options") : null);
        var merged = extend_setting_form(settings || defaults, options || {}, overrides);
        var settings = merged;
        var form = document.querySelector(formID);
        var formSaverID = "formSaver-" + form.id;
        var formSaverData = {};
        var formFields = form.elements;
        var formStatus = form.querySelectorAll(settings.selectorStatus);
        var prepareField = function (field) {
            if (!getClosest(field, settings.selectorIgnore)) {
                if (field.type.toLowerCase() === "radio" ||
                    field.type.toLowerCase() === "checkbox") {
                    if (field.checked === true) {
                        formSaverData[field.name + field.value] = "on";
                    }
                }
                else if (field.type.toLowerCase() !== "hidden" &&
                    field.type.toLowerCase() !== "submit") {
                    if (field.value && field.value !== "") {
                        formSaverData[field.name] = field.value;
                    }
                }
            }
        };
        var displayStatus = function (status, saveMessage, saveClass) {
            status.innerHTML =
                saveClass === ""
                    ? "<div>" + saveMessage + "</div>"
                    : '<div class="' + saveClass + '">' + saveMessage + "</div>";
        };
        forEach(formFields, function (field) {
            prepareField(field);
        });
        forEach(formStatus, function (status) {
            displayStatus(status, settings.saveMessage, settings.saveClass);
        });
        localStorage.setItem(formSaverID, JSON.stringify(formSaverData));
        settings.callbackSave(btn, form);
    }
    static deleteForm(btn, formID, options, event = null) {
        var overrides = getDataOptions(btn ? btn.getAttribute("data-options") : {});
        var settings = extend_setting_form(settings || defaults, options || {}, overrides);
        var form = document.querySelector(formID);
        var formSaverID = "formSaver-" + form.id;
        var formStatus = form.querySelectorAll(settings.selectorStatus);
        var formMessage = settings.deleteClass === ""
            ? "<div>" + settings.deleteMessage + "</div>"
            : '<div class="' +
                settings.deleteClass +
                '">' +
                settings.deleteMessage +
                "</div>";
        var displayStatus = function () {
            if (settings.deleteClear === true || settings.deleteClear === "true") {
                sessionStorage.setItem(formSaverID + "-formSaverMessage", formMessage);
                location.reload(false);
            }
            else {
                forEach(formStatus, function (status) {
                    status.innerHTML = formMessage;
                });
            }
        };
        localStorage.removeItem(formSaverID);
        displayStatus();
        settings.callbackDelete(btn, form);
    }
    loadForm(form, options) {
        var settings = extend_setting_form(settings || defaults, options || {});
        var formSaverID = "formSaver-" + form.id;
        var formSaverData = JSON.parse(localStorage.getItem(formSaverID));
        var formFields = form.elements;
        var formStatus = form.querySelectorAll(settings.selectorStatus);
        var populateField = function (field) {
            if (formSaverData) {
                if (field.type.toLowerCase() === "radio" ||
                    field.type.toLowerCase() === "checkbox") {
                    if (formSaverData[field.name + field.value] === "on") {
                        field.checked = true;
                    }
                }
                else if (field.type.toLowerCase() !== "hidden" &&
                    field.type.toLowerCase() !== "submit") {
                    if (formSaverData[field.name]) {
                        field.value = formSaverData[field.name];
                    }
                }
            }
        };
        var displayStatus = function (status) {
            status.innerHTML = sessionStorage.getItem(formSaverID + "-formSaverMessage");
            sessionStorage.removeItem(formSaverID + "-formSaverMessage");
        };
        forEach(formFields, function (field) {
            populateField(field);
        });
        forEach(formStatus, function (status) {
            displayStatus(status);
        });
        settings.callbackLoad(form);
    }
    destroy() {
        if (!settings)
            return;
        document.documentElement.classList.remove(settings.initClass);
        document.removeEventListener("click", eventHandler, false);
        settings = null;
        forms = null;
    }
    init(options) {
        if (!isBrowser())
            return;
        this.destroy();
        settings = extend_setting_form(defaults, options || {});
        forms = document.forms;
        document.documentElement.className +=
            (document.documentElement.className ? " " : "") + settings.initClass;
        forEach(forms, function (form) {
            this.loadForm(form, settings);
        });
        document.addEventListener("click", eventHandler, false);
    }
    auto() {
        formsaver();
    }
}
