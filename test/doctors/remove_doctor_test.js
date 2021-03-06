"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Doctors", function () {
    describe("Remove Doctor (DELETE /patients/:patientid/doctors/:doctorid)", function () {
        // basic endpoint
        var remove = function (doctorId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/doctors/%d", patientId, doctorId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // doctor for the patient based on the factory template, and then remove the doctor
        var removeDoctor = function (data, patient) {
            var create = Q.nbind(patient.createDoctor, patient);
            return fixtures.build("Doctor", data).then(create).then(function (doctor) {
                return remove(doctor._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and remove them automatically
        var removePatientDoctor = function (data) {
            return patients.testMyPatient({}).then(curry(removeDoctor)(data));
        };

        // check it requires a valid user, patient and doctor
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidDoctorId(remove);
        patients.itRequiresWriteAuthorization(curry(removeDoctor)({}));

        it("lets me remove doctors for my patients", function () {
            return expect(removePatientDoctor({})).to.be.a.doctor.success;
        });
    });
});
