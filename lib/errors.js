"use strict";

// Custom error class with slug and HTTP response code stored
// Should correspond exactly to the errors we show in the errors field in API responses
function APIError(slug, responseCode) {
    // capture stack trace
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = "APIError";
    this.message = slug;
    this.slug = slug;
    this.responseCode = responseCode;
}
APIError.prototype = new Error();

// Custom error class containing *multiple* APIErrors (one errors: [] array in an API response)
function APICombinedError(errors) {
    this.name = "APICombinedError";
    // unique: don't show duplicate errors
    this.errors = errors.filter(function (el, i) {
        return errors.indexOf(el) === i;
    });

    // form message (required) from concatenation of individual messages
    var messages = [];
    for (var i = 0; i < this.errors.length; i++) {
        messages.push(this.errors[i].message);
    }
    this.message = messages.join(", ");

    // use mathemtically maximum response code: seems to work as a good heuristic
    // 500 > 403 > 401 > 400 > 200
    this.responseCode = 0;
    for (i = 0; i < this.errors.length; i++) {
        if (this.errors[i].responseCode > this.responseCode) {
            this.responseCode = this.errors[i].responseCode;
        }
    }

    // store slugs
    this.slugs = [];
    for (i = 0; i < this.errors.length; i++) {
        this.slugs.push(this.errors[i].slug);
    }
}
APICombinedError.prototype = new Error();

module.exports = {
    APIError: APIError,
    APICombinedError: APICombinedError,
    // errors callback-raised from elsewhere in the app
    ERRORS: {
        // User
        EMAIL_REQUIRED: new APIError("email_required", 400),
        PASSWORD_REQUIRED: new APIError("password_required", 400),
        INVALID_EMAIL: new APIError("invalid_email", 400),
        USER_ALREADY_EXISTS: new APIError("user_already_exists", 400),

        // Authentication
        USER_NOT_FOUND: new APIError("wrong_email_password", 401),
        WRONG_PASSWORD: new APIError("wrong_email_password", 401),
        LOGIN_ATTEMPTS_EXCEEDED: new APIError("login_attempts_exceeded", 403),
        INVALID_ACCESS_TOKEN: new APIError("invalid_access_token", 401),
        ACCESS_TOKEN_REQUIRED: new APIError("access_token_required", 401),

        // Patients
        NAME_REQUIRED: new APIError("name_required", 400),
        INVALID_SEX: new APIError("invalid_sex", 400),
        INVALID_BIRTHDATE: new APIError("invalid_birthdate", 400),
        UNAUTHORIZED: new APIError("unauthorized", 403),
        INVALID_ACCESS: new APIError("invalid_access", 400),
        INVALID_PATIENT_ID: new APIError("invalid_patient_id", 404),

        // Doctors
        INVALID_DOCTOR_ID: new APIError("invalid_doctor_id", 404),

        // Pharmacies
        INVALID_PHARMACY_ID: new APIError("invalid_pharmacy_id", 404),
        INVALID_HOURS: new APIError("invalid_hours", 400),

        // Medications
        INVALID_MEDICATION_ID: new APIError("invalid_medication_id", 404),
        INVALID_QUANTITY: new APIError("invalid_quantity", 400),
        INVALID_DOSE: new APIError("invalid_dose", 400),
        INVALID_SCHEDULE: new APIError("invalid_schedule", 400),
        INVALID_FILL_DATE: new APIError("invalid_fill_date", 400),

        // Journal entries
        INVALID_JOURNAL_ID: new APIError("invalid_journal_id", 404),
        DATE_REQUIRED: new APIError("date_required", 400),
        TEXT_REQUIRED: new APIError("text_required", 400),
        INVALID_DATE: new APIError("invalid_date", 400),

        // Habits
        INVALID_WAKE: new APIError("invalid_wake", 400),
        INVALID_SLEEP: new APIError("invalid_sleep", 400),
        INVALID_BREAKFAST: new APIError("invalid_breakfast", 400),
        INVALID_LUNCH: new APIError("invalid_lunch", 400),
        INVALID_DINNER: new APIError("invalid_dinner", 400),
        INVALID_TZ: new APIError("invalid_tz", 400),

        // Adherence events
        INVALID_DOSE_ID: new APIError("invalid_dose_id", 404),

        // Schedule
        INVALID_START_DATE: new APIError("invalid_start", 400),
        INVALID_END_DATE: new APIError("invalid_end", 400),

        // Should never get thrown by design
        UNKNOWN_ERROR: new APIError("unknown_error", 500),
        // e.g., medication_id parameter in POST /adherences
        // gives 400 as opposed to 404
        INVALID_RESOURCE_MEDICATION_ID: new APIError("invalid_medication_id", 400),
        INVALID_RESOURCE_DOCTOR_ID: new APIError("invalid_doctor_id", 400),
        INVALID_RESOURCE_PHARMACY_ID: new APIError("invalid_pharmacy_id", 400),

        // Avators
        INVALID_IMAGE: new APIError("invalid_image", 400)
    }
};