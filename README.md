# Server for Calendar Display

> Simple server to deliver events for the ESP32-CalendarDisplay

This very simple server is meant to be run in a local network to parse and serve the calendar events for the [ESP32-Calendar Display](https://github.com/SeBassTian23/ESP32-CalendarDisplay). It can easily be run on a Raspberry Pi 3A+ or even a Raspberry Pi Zero (even though the queries tend to take a long time). A very simple caching function is implemented, so the calendars don't have to be parsed every time, speeding up the requests significantly. The initial idea was to do the parsing on the ESP32, but it seems easier to be implemented on a Raspberry Pi then a micro controller.

## Install

The application is simple to install. Just download the latest version from the releases or clone the GitHub repo. Install the application using `npm`.

```zsh
npm install
```

## Define Environment

The required parameters to setup the application are defined in the .env file. Before running the application for the first time, rename the file `env-template` to `.env`. After that open the `.env` file and provide the following parameters before staring the application.

| Key                 | Parameter                                                       |
| ------------------- | --------------------------------------------------------------- |
| `CALENDAR_TOKEN`    | Create a token that needs to be submitted with any API request. |
| `CALENDAR_URL`      | URL for calendar to synchronize using a cron job                |
| `CALENDAR_TIMEZONE` | Calendar's timezone (used for the cron job)                     |

If you want to create a save token, you can go to a website like <https://randomkeygen.com/>.

```zsh
### API Token
CALENDAR_TOKEN=secret-token

### CALENDAR URL
CALENDAR_URL=https://link-to-my-calendar.ics

### Timezone
CALENDAR_TIMEZONE=America/Detroit
```

## Calendar Files

A large number of files can be provided, but most cases are probably ok with using 3 separate calendars. Copy all calendars used into the `calendars` folder. The calendars need to be in the `ical` format.

+ **Main Calendar:** Source for daily events. Should be updated by the cron job
+ **Holiday Calendar:** Source for holidays and other important days
+ **Birthday Calendar:** Source for birthdays (file name needs to end on *birthdays.ics* to be detected as birthdays)

## Start the Application

Start the application locally by running the following command. The application is run using `nodemon`, so the server automatically restarts every time changes are made. When deployed `npm start` is used instead.

```zsh
npm run dev
```

## Update Calendars

To keep the calendars up to date, a cron job is used. The file `cron.js` is updating the main calendar every 15 min using the URL provided in the `.env` file. When more calendars are supposed to be updated the code needs to be adjusted.

### Process Manager (pm2)

When running the server locally, it might be good to use a process manager, so in case of a restart or reboot, the server automatically starts up again and it allows to run the processes in the background. Start all the processes using the `pm2` process manager.

```zsh
## Install pm2
npm i pm2 -g

## Start the the server and the cron job
pm2 start ./bin/www
pm2 start cron.js
```

The local server will be available at `http://localhost:3000`, unless set up for a different port.

## REST API

### Get calendar events

This request is producing a list of events from all calendars for the next 2 weeks or 20 events.

**GET:** `/?token=YOUR_ACCESS_KEY`

```JavaScript
{
  "msg": "19 events found.",
  "count": 19,
  "gmtoffset": -240,
  "events": [
    {
      "type": "VEVENT",
      "uid": "6CD20D5D-63A9-42E8-B7DE-F8942FF6FD06",
      "start": 1619013600,
      "end": 1619017200,
      "allday": false,
      "tzid": "America/Detroit",
      "categories": null,
      "summary": "Business Meeting",
      "location": "1234 Street, Sample City, State, 12345 United States",
      "gmtoffset": -240
    },
    {
      "type": "VEVENT",
      "uid": "35508bd6-099b-3788-b81e-287d65e1e11b",
      "start": 1619064000,
      "end": 1650460531,
      "allday": true,
      "tzid": null,
      "categories": "Holidays",
      "summary": "Earth Day",
      "location": null,
      "gmtoffset": -240
    },
    ...
  ]
}
```
