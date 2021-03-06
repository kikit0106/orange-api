# Orange API

[![dependencies Status](https://david-dm.org/amida-tech/orange-api/status.svg)](https://david-dm.org/amida-tech/orange-api)
[![devDependencies Status](https://david-dm.org/amida-tech/orange-api/dev-status.svg)](https://david-dm.org/amida-tech/orange-api?type=dev)
[![Jenkins CI](https://jenkins.amida.com/buildStatus/icon?job=Orange%20API%20Build%20Develop/)](https://jenkins.amida.com/job/Orange%20API%20Build%20Develop/)
[![Build Status](https://travis-ci.org/amida-tech/orange-api.svg?branch=master)](https://travis-ci.org/amida-tech/orange-api)
[![Coverage Status](https://coveralls.io/repos/amida-tech/orange-api/badge.svg?branch=master)](https://coveralls.io/r/amida-tech/orange-api?branch=master)


**For detailed API documentation see [here](http://amida-tech.github.io/orange-api/)**

API for Orange medication management app. RESTful and implemented in Node & Mongo. Implements:
 - Setup user/patient
 - Save medications/doctors/pharmacies/user habits
 - Record dose events
 - View adherence schedule
 - Share information with other users (and outside email addresses who aren't yet users)

# Table of Contents

- [Development Setup and Run](#Development-Setup-and-Run)
- [Load Testing](#Load-Testing)
- [Code Analysis](#Code-Analysis)
- [Deployment](#Deployment)
- [Environment Variables](#Environment-Variables)
- [Contributing](#Contributing)
- [Technical Documentation](#Technical-Documentation)
- [License](#License)

# Development Setup and Run

## Prerequisites

- Node.js (v0.10+) and NPM
- Grunt.js
- MongoDB (v3.6 - higher versions will not work. If you need to downgrade instructions, [click here](https://stackoverflow.com/questions/30379127/how-to-install-earlier-version-of-mongodb-with-homebrew/47449979#47449979))
- Amida Auth Microservice (https://github.com/amida-tech/amida-auth-microservice)

## Initialization

- Initalize MongoDB
- Set up [Amida Auth Microservice](https://github.com/amida-tech/amida-auth-microservice)
  - see Auth Microservice README for details on setup
  - if you are developing locally, you may need to install and configure [Postgres](http://postgresapp.com/)
- `cp .env.example .env`
- `cp .env.example .env.test`
- Configure settings in `.env`. See [Environment Variables](#Environment-Variables)
  - Vital settings:
    - `X_CLIENT_SECRET` (any hexstring is suitable)
    - `JWT_SECRET` (must match Auth Microservice)
    - `AUTH_MICROSERVICE_URL` (must point to wherever your `amida-auth-microservice` server is running)
    - Web Address
    - Database Address
- `npm install`

### Enabling VA Formulary Search
orange-api has an endpoint for searching for medications in the VA Formulary. This is enabled by populating a collection in MongoDB with the contents of the VA Formulary.

The latest spreadsheet that contains the VA Formulary can be downloaded from [here](https://www.pbm.va.gov/NationalFormulary.asp), and is included in the repo for convenience.

Import the data from the spreadsheet into MongoDB with the npm script `import_va_formulary`. For example, `npm run import_va_formulary`.

## Enabling Push Notifications

Note: This is optional. These steps are in their own section because this setup is complicated and not required if you don't need to develop/test push notifications.

1. Setup and start the [Amida Notification Microservice](https://github.com/amida-tech/amida-notification-microservice)

2. In your .env  file, set these variables:
- `NOTIFICATION_MICROSERVICE_URL`
- Variables that start with `PUSH_NOTIFICATIONS_`

Note: Their values must be identical to the corresponding variables in your Amida Notification Microservice.

3. Obtain an Apple Developer Key and corresponding KeyId. You can download this file by logging into the team's apple developer console on `developer.apple.com`. Navigate to `Keys` on the left pane and create or download a key. Add this file to the root of the project and rename it to `iosKey.p8`. Set the corresponding keyId to the value of `PUSH_NOTIFICATIONS_APN_KEY_ID` in your `.env` file.

## Build and Run in Development

```sh
grunt dev
```

# Load Testing

SSH Tunnel into the remote machine where `orange-api` has been deployed and from where you will be installing Locust and running your load tests. The following command will create an SSH tunnel into the specified address and begin forwarding your machine's local port `8089` (making a 'tunnel' with the remote machine's port `8089`) so that you can run the load tests on the server and still view the locust web interface from your local machine.

`ssh  -L 8089:localhost:8089 user@example.com`

## Installing Locust and other Python Dependencies

Once you have SSH'd into your remote machine, you will do the following on that machine to install the necessary libraries to run the load test script:

Create a new virtual enviroment using virtualenv with the command:

`virtualenv env`

I have called mine `env`.
(If you do not have virtualenv installed you can install it using `pip install virtualenv`)

activate your new enviroment with the command

`source env/bin/activate`

Once inside your new enviroment you will need to install locust, faker, and arrow using the following commands

`pip install locustio`

`pip install faker`

`pip install arrow`

## Launching load test using Locust

On the remote machine, navigate inside the directory that holds the orange-api repository and contains the file `locustfile.py`

Launch locust
`locust -f locustfile.py -H "http://localhost:5000/v1"`

## Viewing Locust web interface

Now, on your local machine:

Point your browser to http://127.0.0.1:8089/

From the Locust web interface you can change the settings and run the load-test

# Code Analysis
1. `$ gulp appAnalysis` to analyze code in `./lib`
2. `$ gulp testAnalysis` to analyze code in `./test`
3. Files are written to `./artifacts`

# Deployment

## Deployment Via Docker

Prerequisite: The [Amida Notification Service](https://github.com/amida-tech/amida-notification-microservice) up and running.

Docker deployment requires two docker containers:
- An instance of the official MongoDB 3.6 docker image (see: https://hub.docker.com/_/mongo/).
- An instance of this service's docker image (see: https://hub.docker.com/r/amidatech/orange-api).

Also, the containers communicate via a docker network. Therefore,

1. First, create the Docker network:

```sh
docker network create {DOCKER_NETWORK_NAME}
```

3. Start the MongoDB container:

```sh
docker run -d --name amida-orange-api-db --network {DOCKER_NETWORK_NAME} mongo:3.6
```

4. Create a `.env` file for use by this service's docker container. A good starting point is this repo's `.env.production` file. For additional details, see the next step.

5. Configure push notifications according to the [Enabling Push Notifications](#Enabling-Push-Notifications) subsection under [Development Setup and Run](#Development-Setup-and-Run)

6. Start the Orange API container:

```sh
docker run -d -p 5000:5000 \
--name amida-orange-api --network {DOCKER_NETWORK_NAME} \
-v {ABSOLUTE_PATH_TO_YOUR_ENV_FILE}:/app/.env:ro \
amidatech/orange-api
```

# Environment Variables

Environment variables are applied in this order, with the former overwritten by the latter:

1. Default values, which are set automatically by [joi](https://github.com/hapijs/joi) within `config.js`, even if no such environment variable is specified whatsoever.
2. Variables specified by the `.env` file.
3. Variables specified via the command line.

Variables are listed below in this format:

##### `VARIABLE_NAME` (Required (if it actually is)) [`the default value`]

A description of what the variable is or does.
- A description of what to set the variable to, whether that be an example, or what to set it to in development or production, or how to figure out how to set it, etc.
- Perhaps another example value, etc.

## Orange API

##### `X_CLIENT_SECRET` (Required)

All requests made to this API must have HTTP header `x-client-secret` with a value that matches this environment variable.

##### `ACCESS_CONTROL_ALLOW_ORIGIN` (Required)

An **array** of domains, including protocol and port. Self-explanatory if you understand [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

Note: If `req.origin` is not found in your `ACCESS_CONTROL_ALLOW_ORIGIN` array, `orange-api` will print `req.origin` to stdout. You can use that to figure out how to set this value.

- Don't forget that if your client is running on https and/or a port other than 80 or 443, you will have to specify this as well, as in `["https://localhost:12345"]`.
- To enable all domains (which is insecure and therefore should only be done in development), set to `["*"]` or `["http://something.com", "http://doesntmatter.com", "*"]`
- When using Postman, Postman sets the origin to something like `chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop`. However, Postman probably ignores the `Access-Control-Allow-Origin` header of the OPTIONS response, so you might not need to set this.
- Phones don't set the origin header, so `req.origin` is undefined in their requests. However, this is ok because they ignore the CORS-related headers on any OPTIONs respones anyway.

##### `ORANGE_ALLOW_PUBLIC_REGISTRATION` [`false`]

If true, the user registration endpoint is public. If false, only users with `admin` or `programAdministrator` scope can create users.

##### `MONGO_URI` (Required)

MongoDB connection URI.
- `.env.production` sets this to `mongodb://amida-orange-api-db:27017/orange-api` which assumes:
  - `amida-orange-api-db` is the name of the docker container running MongoDB.
  - The docker container running MongoDB and this service's container are a part of the same docker network.
  - Until we update the mongoose version, you must specify the port number, else you get this error: https://stackoverflow.com/questions/51156334/unhandled-rejection-mongoerror-port-must-be-specified

##### `MONGO_SSL_ENABLED` (Required) [`false`]

Enable SSL for the connection to MongoDB.
- In production, set to true.

##### `MONGO_CA_CERT`

Only used when `MONGO_SSL_ENABLED=true`. Specifies an SSL cert to trust for the connection to MongoDB. If not set, only Mozilla's list of root certs are trusted.

## Integration With Amida Auth Microservice

##### `AUTH_MICROSERVICE_URL` (Required)

The URL of the Auth Service API.
- The URL of the staging Auth Service server is `https://orange-auth-staging.amida-services.com/api/v1`
- `.env.production` sets this to `http://amida-auth-microservice:4000/api/v1`, which assumes:
  - `amida-auth-microservice` is the name of the docker container running the Auth Service.
  - `4000` is the port the Auth Service is running on in its container.
  - The Auth Service's docker container and this service's docker container are a part of the same docker network.

##### `JWT_SECRET` (Required)

Must match value of the JWT secret being used by your `amida-auth-microservice` instance.
- See that repo for details.

## Integration With Amida Notification Microservice

##### `NOTIFICATION_MICROSERVICE_URL`

The URL of the Notification Service API.
- The URL of the staging Notification Server is `https://orange-notification-staging.amida-services.com/api`
- `.env.production` sets this to `http://amida-notification-microservice:4003/api`, which assumes:
  - `amida-notification-microservice` is the name of the docker container running the Notification Service.
  - `4003` is the port the Notification Service is running on in its container.
  - The Notification Service's docker container and this service's docker container are a part of the same docker network.

##### `PUSH_NOTIFICATIONS_ENABLED` (Required) [`false`]

##### `PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME` (Required)

The username of the service user on the Auth Service. This user is named as such because original is only performed push-notifications-related requests. However, this user now performs a variety of functions.
- `.env.example` sets this to `oucuYaiN6pha3ahphiiT`, which is for development only. In production, set this to a different value.

##### `PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD` (Required)

The password of the user specified by `PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME`.
- `.env.example` sets this to `@TestTest1`, which is for development only. In production, set this to a different value.

##### `PUSH_NOTIFICATIONS_APN_ENABLED` (Deprecated)

##### `PUSH_NOTIFICATIONS_APN_ENV` (Deprecated)

##### `PUSH_NOTIFICATIONS_APN_TEAM_ID` (Deprecated)

##### `PUSH_NOTIFICATIONS_APN_KEY_ID` (Deprecated)

##### `PUSH_NOTIFICATIONS_APN_TOPIC` (Deprecated)

#####  `PUSH_NOTIFICATIONS_FCM_API_URL` (Deprecated)

##### `PUSH_NOTIFICATIONS_FCM_SERVER_KEY` (Deprecated)

# Contributing

Contributors are welcome. See issues https://github.com/amida-tech/orange-api/issues

# Technical Documentation

The API is structured as a standard Express app using Mongoose for data storage. The Controller-Model pattern is followed, with everything output over
JSON so seperate views not as necessary (although semantically each model instance has a getData method that acts as the view). App setup and initialisation
is in `app.js` and database connection/etc is in `run.js`. `config.js` contains configuration for API keys (sendgrid and twilio for notifications), logging
and database hosts.

Tests are in `test/`, structured as directories for each resource group containing e2e tests, and sometimes `unit/` directories inside those containing
`unit` tests. Grunt (`gruntfile.js`) is used to run tests (`npm test`) and can also be used to spin up a development server (`grunt server:dev`), although `node run.js` is much quicker to start up and will work for all endpoints apart from those that rely on schedule matching
(`/patients/:id/schedule`, `/patients/:id.json` and `/patients/:id.pdf`). Please verify you have a `.env.test` file before running tests

Controllers are in in `lib/controllers` and models in `lib/models`. Most are standard CRUD controllers, with various CRUD helper functions used (mainly as
middleware) to DRY things up. See `lib/controllers/helpers/crud.js` mainly (e.g., `formatObject` and `formatList` are used in nearly all endpoints).

Models are pretty standard mongoose models. `counter.js` and `helpers/increment_plugin.js` are used to provide auto-incrementing numerical IDs. All models
that correspond to patient resources (`Doctor`, `Dose`, `JournalEntry`, `Medication` and `Pharmacy`) are stored as subdocuments or subarrays within
`Patient`, and because of this and some mongoose intracies some of their logic is in `lib/models/patient/resources.js` rather than e.g.,
`lib/models/doctor.js`.

Schedule matching is slightly more complex. Each medication stores a schedule object, freshly-parsed into a `Schedule` (`lib/models/schedule/`) object
upon instance initialisation. This represents the schedule when the medication *should* be taken in an abstract form. `schedule/generation.js` uses this
to generate a concrete schedule for when the medication *should* be taken, given a start and end date. Various endpoints then need to match this up
with the doses the user has actually recorded (either taken or not taken), represented as `Dose` objects in `patient.doses`. Depending on the level of
information we have about each dose, this is slightly nontrivial problem, solved with an algorithm documented in `lib/models/helpers/schedule_matcher.js`.

Patient images ('avatars') are stored in gridfs rather than as files or raw in mongo, and the relevant code is in `lib/models/patient/avatar.js` (slightly
more complicated than standard because it parses MIME types from the actual image data whilst storing images).

All errors that should be visible to the API user are passed up the stack then handled by `error_handler.js` and `errors.js`. Each API error has an
instance of the custom `APIError` classs initialised in `errors.js` which can then be used anywhere else in the app. `error_handler.js` handles both these
and mongoose errors (a couple heuristics are used to look up `APIError` instances based on field name, etc). These errors are then returned by setting
the HTTP response code appropriately and returning `{ success: false, errors: [...] }` as a response body.

The external RXNorm and NPI APIs are proxied for various queries (`lib/controllers/rxnorm.js` and `lib/controllers/npi.js`). The RXNorm spelling suggestions
endpoint is hit very heavily and RXNorm rate-limit us to 20 queries per second so that's cached (mongo because the mongo infrastructure was already set up
and the advantages of redis/memcached/etc are irrelevant here) in `lib/models/rxnorm.js`, although the actual queries for both APIs are just delegated to the
`rxnorm-js` and `npi-js` NPM libraries (both Amida written).

The `/patients/:id.pdf` endpoint generates and returns a report PDF. This is done dynamically on-the-fly but is fast enough this shouldn't be an issue (and
could of course easily be cached if so). The relevant code is in `lib/controllers/patients/report.js` (although much of that that should probably be
abstracted out to a `lib/views` directory at some point) and uses the `pdfmake` library  for the actual PDF generation. The `fonts/` and `images/`
directories are used to provide assets in that generation process. `grunt report` can be used to generate a sample PDF for test data, and regenerate it
whenever the relevant code changes so is useful for development here.

Notifications are sent out upon various actions (user registration, sharing request received/cancelled/closed/accepted) and notifications for new actions
can easily be added (`user.notify`). The relevant code is in `lib/models/user/notifications.js`. Handlebars templates for the notifications sent are taken
from the `views/` directory. Notifications can be sent to either SMS (Twilio) or email (Sendgrid) (dependent on both the data available for a user and
individual notification settings). API keys for Twilio and Sendgrid are configured in `config.js` and are left blank on the staging server so notifications
are not sent out during testing.

The `static/` directory contains webpages that are statically accessible on the staging server (with the `.html` suffix removed so `login.html` becomes
`http://STAGING-SERVER-ADDRESS/login`). `login` uses the custom URI scheme in the mobile app to launch the app to the login page if it's installed, or
take you to the relevant app store if on mobile and the app's not installed, or just displays a static page on desktop (this page is linked to by the
email notification received when resetting password).

All API endpoints are fully documented using API Blueprint in `docs/src`, and `docs/build.sh` (`grunt docs`) is used to build this into HTML documentation
at `docs/output/` with the `aglio` library. Some slightly hackish deviations from the API Blueprint spec to get the desired output from Aglio are made,
although these are very apparent and self-explanatory in `docs/src`. As well as on the staging server, docs are published on github and the newest docs
can be generated from source and pushed to the `gh-pages` branch with `grunt docs:push`.

Deployment things are in `deploy/` and are documented in `deploy/README.md`. We currently recommend using the traditional/Ansible deployment option
which is documented in detail in `deploy/traditional/README.md`.

# License

Licensed under [Apache 2.0](./LICENSE)
