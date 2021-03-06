const mongoose = require("mongoose");
const cron = require('node-cron');
const moment = require('moment-timezone');

const User = mongoose.model("User");
const Patient = mongoose.model("Patient");
const ReminderNotification = mongoose.model("ReminderNotification");
const intervalInMinutes = 1;
const bufferInMilliseconds = 5000;

function checkIfSent(key) {
    return new Promise((resolve, reject) => {
        ReminderNotification.findOneAndUpdate(
            {_id: key, sent: true},
            {_id: key, sent: true},
            {upsert: true, new: false, runValidators: true},
            function (err, doc) {
                if (err) {
                    reject(err)
                } else {
                    resolve(doc)
                }
            }
        );
    })
}

function sendMedicationReminder (patient, item, user) {
    const key = `${patient._id}_${item.medication_id}_${item.notification}`
    checkIfSent(key).then((result) => {
        if (!result) {
            const dateFormat = item.type === 'time' ? 'h:mm a' : 'MMM Do YY'
            const notificationTitle = 'Task Reminder'
            const notificationMessage = `Your scheduled task is due by ${moment(item.date).tz(patient.tz).format(dateFormat)}`
            user.sendPushNotification({
                notificationType: "MEDICATION_REMINDER",
                title: notificationTitle,
                body: notificationMessage
            });
        }
    });
}

function sendMeditationReminder(patient, user, date, time) {
    const key = `${patient._id}_${date}_${time}`
    checkIfSent(key).then((result) => {
        if (!result) {
            const notificationTitle = 'Meditation Reminder'
            const suffix = time === '11am' ? 'before noon' : 'this evening';
            const notificationMessage = `Remember to meditate ${suffix}`
            user.sendPushNotification({
                notificationType: "MEDITATION_REMINDER",
                title: notificationTitle,
                body: notificationMessage
            });
        }
    });
}


function sendReminders() {
    const time = Date.now()
    const intervalInMilliseconds = intervalInMinutes * 60 * 1000;
    const startTime = new Date(time - bufferInMilliseconds)
    const startTimeISO = startTime.toISOString();
    const endTime = new Date(time + intervalInMilliseconds + bufferInMilliseconds);
    const endTimeISO = endTime.toISOString();

    User.find({ role: "user" }, function(err, users) {
        users.forEach((user) => {
            Patient.findOne({ creator: user.email, me: true }).exec().then((patient) => {
                const beginningOfTodayInPatientTz = moment().tz(patient.tz).startOf('day');
                const elevenAmInPatientTz = moment(beginningOfTodayInPatientTz).hours(11);
                const sixPmInPatientTz    = moment(beginningOfTodayInPatientTz).hours(18);

                if (elevenAmInPatientTz >= startTime && elevenAmInPatientTz <= endTime) {
                    sendMeditationReminder(patient, user, beginningOfTodayInPatientTz.format('YYYY-MM-DD'), '11am');
                }
                if (sixPmInPatientTz >= startTime && sixPmInPatientTz <= endTime) {
                    sendMeditationReminder(patient, user, beginningOfTodayInPatientTz.format('YYYY-MM-DD'), '6pm')
                }
                patient.generateScheduleResults(startTimeISO, endTimeISO, user, null, user._id, function (err, items) {
                    if (err) return err;
                    items = items.map(function (medItems) {
                        return medItems.map(function (item) {
                            item.patient_id = patient._id;
                            return item;
                        });
                    });
                    Patient.formatSchedule(items, function (err, result) {
                        if (err) return err;
                        var schedule = result.schedule;
                        schedule.forEach((item) => {
                            const notificationDate = new Date(item.notification);
                            if (!Object.keys(item).includes('took_medication') && notificationDate >= startTime && notificationDate <= endTime) {
                                sendMedicationReminder(patient, item, user)
                            }
                        })
                    });
                });
            });
        })
    });
}

cron.schedule(`*/${intervalInMinutes} * * * *`, sendReminders);
