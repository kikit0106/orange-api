const Client = require('node-rest-client').Client;
const faker = require('faker');

//User & Patient data generated by faker
const firstName = faker.name.firstName().toLowerCase();
const lastName = faker.name.lastName().toLowerCase();
const phoneNumber = faker.phone.phoneNumberFormat().split('-').join('');
const email = firstName + "@amida.com";
const password = "Testtest1!";
const doctorEmail = "mholmes@amida-demo.com";
const access = ["read","write","default"];

//URL's
const authUrl = "http://localhost:4000/api/v1/auth/login";
const patientsUrl = "http://localhost:5000/v1/patients";
const createUserUrl = "http://localhost:5000/v1/user";
const messagingUrl = "http://localhost:4001/api/v1/threads";
var authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJSdWJ5ZUBhbWlkYS5jb20iLCJlbWFpbCI6IlJ1YnllQGFtaWRhLmNvbSIsInNjb3BlcyI6WyIiXSwiaWF0IjoxNTIwMjY5OTA5LCJleHAiOjE1MjAyNzY1MDl9.lBsjsQtHxuI8E5C7VHaxkulZZugkbk0FFYl_rT580Bo';
const client = new Client();


const createUser = function(userArgs, callback) {
    client.post(createUserUrl, userArgs, function (data, response) {
        callback(data);
    });
};
const authenticateUser = function(authArgs, callback) {
    client.post(authUrl, authArgs, function (data, response) {
        callback(data.token);
    });

};
const createPatient = function(patientArgs, callback) {
    client.post(patientsUrl, patientArgs, function (data, response) {
        callback(data);
    });
};
const createThread = function(threadArgs, callback) {
    client.post(messagingUrl, threadArgs, function (data, response) {
        callback(data.message);
    });
};
const replyToThread = function(threadArgs, threadID, callback) {
    client.post(`${messagingUrl}/${threadID}/reply`, threadArgs, function (data, response) {
        callback(data.message);
    });
};
const getPatients = function(patientArgs, callback) {
    client.get(patientsUrl, patientArgs, function (data, response) {
        callback(data);
    });
};
const sharePatient = function(patientArgs, patientId, callback) {
    client.post(`${patientsUrl}/${patientId}/shares`, patientArgs, function (data, response) {
        callback(data);
    });
};
const createDoctor = function(doctorArgs, patientId, callback) {
    client.post(`${patientsUrl}/${patientId}/doctors`, doctorArgs, function (data, response) {
        callback(data);
    });
};


const userArgs = {
    headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
    data: {
        "email": email,
        "password": password,
        "first_name": firstName,
        "last_name": lastName,
        "phone": phoneNumber,
        "role": "user"
    }
};
const authArgs = {
    headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
    data: {
        "username":     email,
        "password":  password
    }
};


const seedMessages = function (patientArgs) {
    //data for a new user to be included in the message thread
    const firstName2 = faker.name.firstName();
    const lastName2 = faker.name.lastName();
    const phoneNumber2 = faker.phone.phoneNumberFormat().split('-').join('');
    const email2 = firstName2+"@amida.com";
    const password2 = "Testtest1!";
    var authToken2 = '';
    var threadID = null;

    const newUserArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
        data: {
            "email": email2,
            "password": password2,
            "first_name": firstName2,
            "last_name": lastName2,
            "phone": phoneNumber2,
            "role": "user"
        }
    };
    const authArgs = {
        headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data: {
            "username":     email2,
            "password":  password2
        }
    };
    const createThreadArgs = {
        headers: {"Content-Type": "application/json", "Authorization":"Bearer "+authToken},
        data: {
            "participants": [email, email2],
            "message": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque pellentesque velit quis urna finibus, at dapibus orci sagittis. Sed gravida, metus id elementum efficitur, urna enim mattis augue, nec ornare velit sem dapibus urna.",
            "topic": `${firstName2}'s log`,
        }
    };
    var respondToThreadArgs = {
        headers: {"Content-Type": "application/json", "Authorization":"Bearer "+authToken2},
        data: {
            "message": "Fusce imperdiet dui est, ut varius dolor ultricies at. Praesent eget magna in est facilisis maximus quis ac ligula. Phasellus ultricies arcu tincidunt quam placerat, sit amet eleifend lacus sodales. Mauris condimentum placerat sem. Etiam placerat massa at rhoncus egestas.",
        }
    };
    const doctorArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
        data: {
            "name": "Dr. Burress",
            "phone": "(617) 617-6177",
            "address": "N Calvert Street, DC, 20052",
            "notes": "Head of my Care Team",
            "title": "Primary Care Physician"
        }
    };



    // Create a second user inside the seedMessages function call
    createUser(newUserArgs, function(response) {
        console.log("Created User2: ", response.email);
        
        // Get first user's patient and share it with the new user
        getPatients(patientArgs, function(response){
            const defaultPatientId = response.patients[0].id;
            const sharePatientArgs = {
                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
                data: {
                    "email": email2,
                    "access": "read",
                    "group": "family"
                }
            };
            sharePatient(sharePatientArgs, defaultPatientId, function(response) {
                createDoctor(doctorArgs, defaultPatientId, function(response) { 
                    console.log("Checking result of doctor creation", response);
                    authenticateUser(authArgs, function (response) {
                        authToken2 = response;
                        createThread(createThreadArgs, function (response){
                            console.log("Created Thread At: ", response.createdAt);
                            threadID = response.ThreadId;

                            //update ThreadArgs to include newly recieved authToken
                            respondToThreadArgs.headers.Authorization = "Bearer "+authToken2;
                            replyToThread(respondToThreadArgs, threadID, function (response) {
                                console.log("Reply To Thread At: ", response.createdAt);
                            });
                        });
                    });
                });
            });
        });
    });
}

createUser(userArgs, function(response) {
    console.log("Created User: ", response.email);
    authenticateUser(authArgs, function (response) {
        authToken = response;
        const patientArgs = {
            headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
            data: {
            }
        };
        seedMessages(patientArgs);
    });
});



