"use strict";
var express         = require("express"),
    async           = require("async"),
    crud            = require("../helpers/crud.js"),
    list            = require("../helpers/list.js"),
    listModel       = require("../../models/helpers/list.js"),
    auth            = require("../helpers/auth.js"),
    errors          = require("../../errors.js").ERRORS,
    EMAIL_REGEXP    = require("../../models/helpers/email.js");

const guard = auth.roleGuard;

var shared = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var modifyKeys = ["access", "group"];
var inputKeys = modifyKeys.concat(["email", "first_name", "last_name"]);
var keys = module.exports.keys = inputKeys.concat(["is_user", "avatar"]);
var filterInput         = crud.filterInputGenerator(inputKeys),
    modifyFilterInput   = crud.filterInputGenerator(modifyKeys),
    formatObjectCode    = crud.formatObjectGenerator(keys),
    formatObject        = formatObjectCode(200),
    formatObject201     = formatObjectCode(201),
    formatList          = crud.formatListGenerator(keys, "shares"),
    returnData          = crud.returnData,
    returnListData      = crud.returnListData;

// a callback to accept a share, format it for output, and store it in res.data
var returnShare = function (res, next) {
    return function (err, share) {
        if (err) return next(err);
        share.format(returnData(res, next));
    };
};

// share a patient with a user
shared.post("/", auth.authenticate, guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("write"), filterInput, function (req, res, next) {
    // a valid email address must be specified
    var email = req.data.email;
    if (typeof email === "undefined" || email === null || email.length === 0) return next(errors.EMAIL_REQUIRED);
    if (!EMAIL_REGEXP.test(email)) return next(errors.INVALID_EMAIL);

    // a valid (prime/family/anyone NOT owner) group must be specified
    var group = req.data.group;
    if (typeof group === "undefined" || group === null || group.length === 0) return next(errors.GROUP_REQUIRED);
    if (["prime", "family", "anyone"].indexOf(group) < 0) return next(errors.INVALID_GROUP);

    // a valid (read/write/default) access level must be specified
    var access = req.data.access;
    if (typeof access === "undefined" || access === null || access.length === 0) return next(errors.ACCESS_REQUIRED);
    if (["read", "write", "default"].indexOf(access) < 0) return next(errors.INVALID_ACCESS);

    // create share and format it for output (i.e., add is_user field)
    req.patient.createShare(email, access, group, returnShare(res, next));
}, formatObject201);

// remove a share (i.e., stop sharing with that user)
shared.delete("/:shareid", auth.authenticate, guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("write"), function (req, res, next) {
    // remove share and format it for output
    req.patient.removeShare(req.user, req.params.shareid, returnShare(res, next));
}, formatObject);

// update a share
shared.put("/:shareid", auth.authenticate, guard(["admin", "programAdministrator", "clinician", "user"]), auth.authorize("write"), modifyFilterInput, function (req, res, next) {
    // update share and format it for output
    // req.data already filtered for us
    req.patient.updateShare(req.params.shareid, req.data, returnShare(res, next));
}, formatObject);

// get a list of all shares
var paramParser = list.parseListParameters(["id", "email"],
                                           ["is_user", "group", "access", "email", "firstName", "lastName", "avatar"]);
shared.get("/", auth.authenticate, guard(["admin", "programAdministrator", "clinician", "user", "instructor"]), auth.authorize("read"), paramParser, function (req, res, next) {
    // validate is_user parameter
    var isUser = req.listParameters.filters.is_user;
    if (isUser === "true") isUser = true;
    else if (isUser === "false") isUser = false;
    // return an error if invalid, otherwise store the parsed result
    if (isUser !== null && isUser !== true && isUser !== false) return next(errors.INVALID_IS_USER);
    else req.listParameters.filters.is_user = isUser;

    // validate group parameter
    var group = req.listParameters.filters.group;
    // null = don't filter
    if (group !== null && ["owner", "prime", "family", "anyone"].indexOf(group) < 0) return next(errors.INVALID_GROUP);

    // validate access parameter
    var access = req.listParameters.filters.access;
    if (access !== null && ["read", "write"].indexOf(access) < 0) return next(errors.INVALID_ACCESS);

    next();
}, function (req, res, next) {
    // all data initially, formatted for output (so we have the is_user field to query on)
    // format shares for output (key: adds is_user field)
    async.map(req.patient.shares, function (share, callback) {
        return share.format(callback);
    }, function (err, shares) {
        if (err) return next(err);

        listModel.query(shares, req.listParameters, null, {
            // filter to find shares that do/don't belong to an existing user
            is_user: function (share, isUser) {
                return share.is_user === isUser;
            },

            // filter to find shares for a certain group
            group: function (share, group) {
                return share.group === group;
            },

            // filter to find shares for a certain access level
            access: function (share, access, user, patient) {
                if (share.access === "read" && access === "read") return true;
                if (share.access === "write" && access === "write") return true;
                if (share.access === "default" && patient.permissions[share.group] === access) return true;
                return false;
            }
        }, {}, req.user, req.patient, returnListData(res, next));
    });
}, formatList);
