"use strict";

var mongoose        = require("mongoose"),
    errors          = require("../../errors.js").ERRORS;

var User = mongoose.model("User");

var passportAuth    = require("./passport")();
// Authentication middlewares

// Ensures a user is logged in and saves their User object into req.user
// Should be called in all API requests
module.exports.authenticate = function authenticate(req, res, next) {
    if (req.method === "OPTIONS") {
        return next();
    }
    passportAuth.authenticate(req, res, next);
};

// Makes sure the user has one of the required roles
module.exports.roleGuard = function authenticate(roles) {
    return function (req, res, next) {
      const found = roles.some((r) => req.authClaims.scopes.indexOf(r) >= 0);
      if (found) {
        return next();
      } else {
        return next(errors.UNAUTHORIZED);
      }
    };
};

// find patient from patient ID, and ensure they have the access level
// specified. note: this should **not** be used to authorize users for resources
// involving medications as those have extended access permissions
// note that if a user has any access to a patient they must have
// read access so we can use that as a "base" access level to search from
module.exports.authorize = function (access) {
    return function (req, res, next) {
        // find patient
        mongoose.model("Patient").findByIdForUser(req.params.patientid, req.user, access, function (err, patient) {
            if (err) {
                // specifically catch cast errors caused by an invalid patient ID
                if (err.name === "CastError" && err.path === "_id") return next(errors.INVALID_PATIENT_ID);
                return next(err);
            }

            // save patient and handle request as normal
            req.patient = patient;
            next();
        });
    };
};
