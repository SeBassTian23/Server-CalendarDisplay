/**
 * Cron Job to update a calendar in the background
 * The interval is set to 15 min
 */

const cron = require('node-cron');
const axios = require('axios');
const jetpack = require('fs-jetpack');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

/* Calendar URL and Timzone */
const icalCalendarURL = process.env.CALENDAR_URL;
const calendarTZ = process.env.CALENDAR_TIMEZONE;

/* check the calendar for updates at a 15 min interval */
var task = cron.schedule('*/15 * * * *', () => {
    try {
        axios.get(icalCalendarURL)
            .then(function (response) {
                jetpack.writeAsync('calendars/Calendar.ics', response.data);
                console.log(`Calendar updated in the background.`);
            })
            .catch(function (error) {
                console.error('Failed to update calendar in the background.');
                console.error(error);
            })
            ;
    } catch (error) {
        console.error('Failed to update calendar in the background.');
        console.error(error);
    }
}, {
    scheduled: true,
    timezone: calendarTZ
});

task.start();