const http = require("http");
const https = require("https");

const API_HOSTNAME = "emailoctopus.com";
const API_PORT = 443;

// Validates a Email Octopus User ID like "7d763008-6c82-11ea-a3d0-06b4694bee2a".
function validateUserId(userId) {
  // Deliberately don't accept user IDs in the form of md5(email) because then
  // an attacker could modify anyone's settings just by knowing their email
  // address.
  return userId.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
}

function updateContact(userId, data) {
  return new Promise((resolve, reject) => {
    if (!userId || !validateUserId(userId)) {
      reject(new Error("invalid userId parameter"));
      return;
    }

    const listId = process.env.EMAIL_OCTOPUS_LIST_ID;
    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: `/api/1.5/lists/${listId}/contacts/${userId}`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        reject(
          new Error(
            "Failed to complete request - " +
              (res.statusMessage ? res.statusMessage : res.statusCode)
          )
        );
      }

      const body = [];
      res.on("data", (d) => body.push(d));
      res.on("end", () => resolve(body.join("")));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Updates the topic field of a subscriber with the given contact ID.
function updateUserTopic(userId, topic) {
  return new Promise((resolve, reject) => {
    if (!topic) {
      reject(new Error("topic must be set"));
      return;
    }
    const data = JSON.stringify({
      api_key: process.env.EMAIL_OCTOPUS_API_KEY,
      fields: {
        Topic: topic,
      },
      status: "SUBSCRIBED",
    });

    updateContact(userId, data)
      .then((result) => resolve(result))
      .catch((err) => reject(err));
  });
}

function subscribeUser(email, topic) {
  return new Promise((resolve, reject) => {
    if (!topic) {
      reject(new Error("topic must be set"));
      return;
    }
    const data = JSON.stringify({
      api_key: process.env.EMAIL_OCTOPUS_API_KEY,
      email_address: email,
      fields: {
        Topic: topic,
      },
    });

    const listId = process.env.EMAIL_OCTOPUS_LIST_ID;
    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: `/api/1.5/lists/${listId}/contacts`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode == 409) {
        console.log(`duplicate signup from ${email}`);
      } else if (res.statusCode < 200 || res.statusCode > 299) {
        reject(
          new Error(
            "Failed to complete request - " +
              (res.statusMessage ? res.statusMessage : res.statusCode)
          )
        );
      }

      const body = [];
      res.on("data", (d) => body.push(d));
      res.on("end", () => resolve(body.join("")));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Sets the user with the given ID to unsubscribed.
function unsubscribeUser(userId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      api_key: process.env.EMAIL_OCTOPUS_API_KEY,
      status: "UNSUBSCRIBED",
    });

    updateContact(userId, data)
      .then((result) => resolve(result))
      .catch((err) => reject(err));
  });
}

module.exports = {
  subscribeUser,
  unsubscribeUser,
  updateUserTopic,
};
