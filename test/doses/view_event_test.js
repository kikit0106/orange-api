"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    medications     = require("../medications/common.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Doses", function () {
    describe("View Dose Event (GET /patients/:patientid/doses/:doseid)", function () {
        // basic endpoint
        var show = function (doseId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/doses/%d", patientId, doseId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new medication and dose
        // event for the patient, and then show the dose event
        var showDose = function (data, patient) {
            var createDose = Q.nbind(patient.createDose, patient);

            return Q.nbind(patient.createMedication, patient)({name: "foobar"}).then(function (medication) {
                return fixtures.build("Dose", data).then(function (dose) {
                    // allow medication_id to be explicitly overwritten
                    if (!("medication_id" in data)) dose.medicationId = medication._id;

                    dose.setData(data);
                    return dose.getData();
                }).then(createDose).then(function (dose) {
                    return show(dose._id, patient._id, patient.user.accessToken);
                });
            });
        };
        // create patient, user and dose event, and show them automatically
        var showPatientDose = function (data) {
            return patients.testMyPatient({}).then(curry(showDose)(data));
        };

        // check it requires a valid user, patient and dose
        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresValidDoseId(show);
        patients.itRequiresReadAuthorization(curry(showDose)({}));
        medications.itRequiresReadAuthorization(function (patient, medication) {
            return showDose({
                medication_id: medication._id
            }, patient);
        });

        it("lets me view doses for my patients", function () {
            return expect(showPatientDose({})).to.be.a.dose.viewSuccess;
        });
    });
});
