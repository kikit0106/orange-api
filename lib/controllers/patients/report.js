"use strict";
var express         = require("express"),
    async           = require("async"),
    pdfmake         = require("pdfmake"),
    moment          = require("moment-timezone"),
    util            = require("util"),
    // see pdfmake examples/ in repo
    PdfPrinter      = require("../../../node_modules/pdfmake/src/printer"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js");

// place fonts into top-level fonts/ directory
var pdfFonts = {
	Roboto: {
        normal: "fonts/Roboto-Regular.ttf",
		bold: "fonts/Roboto-Medium.ttf",
		italics: "fonts/Roboto-Italic.ttf",
		bolditalics: "fonts/Roboto-Italic.ttf"
	}
};

var report = module.exports = express.Router({ mergeParams: true });

// View PDF report of the patient's data
report.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // generateDump handles access permissions for us to return a big flat js object
    // we can use to generate the report
    generateDump(req.patient, req.user, false, function (err, data) {
        if (err) return next(err);

        // build up pdfmake document definition (see their docs)
        var doc = {
            content: [],
            styles: {}
        };

        var tz = req.patient.tz;
        if (typeof tz !== "string" || tz.length === 0) tz = "Etc/UTC";
        console.log("dynamic date range");
        var start = moment.tz("2015-07-01", "YYYY-MM-DD", tz);
        var end = moment.tz("2015-07-31", "YYYY-MM-DD", tz);

        // setup header containing various metadata
        doc.header = "Orange RX";

        // setup footer containing simple text
        doc.footer = {
            text: "Report generated using ORANGE medication log - orange.amida-tech.com"
        };

        // list of all medications
        doc.content.push({
            text: "Medications",
            style: "sectionHeader"
        });
        async.map(data.medications, function (medication, callback) {
            var medDoc = [];

            // generate title from brand and name, handling cases when they're unknown
            var title;
            var brand = medication.brand;
            var name = medication.name;
            if (typeof brand === "string" && brand.length > 0 && typeof name === "string" && name.length > 0) {
                title = util.format("%s - %s", medication.brand, medication.name);
            } else {
                title = util.format("%s%s", medication.brand, medication.name);
            }

            medDoc.push({
                text: title,
                style: "medicationHeader"
            });

            // generate a short summary of the schedule
            medDoc.push({
                text: medication.schedule.toSummary(tz, start, end),
                style: "scheduleSummary"
            });

            // taken with/without food
            if (medication.schedule.takeWithFood !== null) {
                var label;
                if (medication.schedule.takeWithFood) label = "Taken with food";
                else label = "Taken without food";
                medDoc.push(label);
            }

            // call schedule matcher to find adherence stats
            req.patient.generateSchedule(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), req.user, medication._id, req.user._id, function (err, matches) {
                if (err) return callback(error);

                // an entry for each of the scheduled times
                if (medication.schedule.regularly) {
                    var times = medication.schedule.times;
                    var timesContents = [];
                    for (var i = 0; i < times.length; i++) {
                        var time = times[i];
                        var heading = {
                            text: util.format("Event %d", i),
                            style: "timeHeading"
                        };

                        // One dose at 9.50pm
                        // One dose at breakfast/lunch/dinner
                        // One dose before bed
                        // One dose after waking
                        // One dose any time
                        var description = "One dose";
                        if (time.type === "unspecified") {
                            description += " any time";
                        } else if (time.type === "exact") {
                            var t = moment.tz(time.time, "HH:mm", tz);
                            var timeFormatted;
                            if (t.minutes() === 0) timeFormatted = t.format("ha");
                            else timeFormatted = t.format("h:mma");
                            description += util.format(" at %s", timeFormatted);
                        } else if (time.type === "event") {
                            // sleep is the special case
                            if (time.event === "sleep") {
                                if (time.when === "before") description += " before bed";
                                else description += " after waking";
                            } else {
                                description += util.format(" at %s", time.event);
                            }
                        }
                        description += ".";

                        // find the relevant match objectas
                        var eventMatches = matches.schedule.filter(function (m) {
                            return m.scheduled === time._id;
                        });
                        // calculate number taken (took_medication: true)
                        var taken = eventMatches.filter(function (m) {
                            return m.took_medication === true;
                        }).length;
                        // number skipped (took_medication: false and a dose_id)
                        var skipped = eventMatches.filter(function (m) {
                            return m.took_medication === false && (typeof m.dose_id !== "undefined");
                        }).length;
                        // number not recorded (took_medication: false and no dose_id)
                        var notRecorded = eventMatches.filter(function (m) {
                            return m.took_medication === false && (typeof m.dose_id === "undefined");
                        }).length;
                        // total number
                        var total = eventMatches.length;
                        // generate human string with those stats in
                        var adherence = util.format("(Taken %d/%d, Skipped %d/%d, Not Recorded %d/%d)", taken, total, skipped, total, notRecorded, total);
                        if (total === 0) adherence = "(No scheduled doses this report)";

                        timesContents.push({
                            text: [
                                heading,
                                " - ",
                                description,
                                " ",
                                adherence
                            ]
                        });
                    }
                    medDoc.push({
                        ul: timesContents
                    });
                };

                // overall adherence stats
                if (matches.schedule.length > 0) {
                    var regularDoses = matches.schedule.filter(function (m) {
                        return (typeof m.scheduled !== "undefined");
                    });

                    var total = regularDoses.length;
                    var taken = regularDoses.filter(function (m) {
                        return m.took_medication === true;
                    }).length;
                    medDoc.push({
                        // round to nearest tenth: Math.round(x*10)/10
                        text: util.format("Events Taken: %d (%d%)", taken, Math.round(taken / total * 1000)/10),
                        style: "timeHeading"
                    });
                    var skipped = regularDoses.filter(function (m) {
                        return m.took_medication === false && (typeof m.dose_id !== "undefined");
                    }).length;
                    medDoc.push({
                        text: util.format("Events Skipped: %d (%d%)", skipped, Math.round(skipped / total * 1000)/10),
                        style: "timeHeading"
                    });
                    var notRecorded = regularDoses.filter(function (m) {
                        return m.took_medication === false && (typeof m.dose_id === "undefined");
                    }).length;
                    medDoc.push({
                        text: util.format("Events Not Recorded: %d (%d%)", notRecorded, Math.round(notRecorded / total * 1000)/10),
                        style: "timeHeading"
                    });
                }

                // add number of 'as needed' doses taken, with just a differing label if
                // medication is not marked as as needed
                var extraDoses = matches.schedule.filter(function (m) {
                    return (typeof m.scheduled === "undefined");
                }).length;
                if (medication.schedule.regularly && (extraDoses > 0 || medication.schedule.asNeeded)) {
                    medDoc.push({
                        text: util.format("Extra Doses Taken: %d", extraDoses),
                        style: "timeHeading"
                    });
                } else if (medication.schedule.asNeeded) {
                    medDoc.push({
                        text: util.format("Doses Taken: %d", extraDoses),
                        style: "timeHeading"
                    });
                }

                return callback(null, medDoc);
            });
        }, function (err, medDocs) {
            medDocs.forEach(function (medDoc) {
                doc.content = doc.content.concat(medDoc);
            });

            // list of all schedule events
            doc.content.push({
                text: "Dosage Logs",
                style: "sectionHeader"
            })

            // general styling
            doc.styles.sectionHeader = {
                fontSize: 24,
                bold: true
            };

            // medication styling
            doc.styles.medicationHeader = {
                fontSize: 18,
                bold: true
            }
            doc.styles.timeHeading = {
                bold: true
            }

            // set mime type
            res.header("Content-Type", "application/pdf");

            // generate PDF and pipe out into response
            var printer = new PdfPrinter(pdfFonts);
            var pdf = printer.createPdfKitDocument(doc);
            pdf.pipe(res);
            pdf.end();
        });
    });
});