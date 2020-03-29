const https = require("https");

const API_HOSTNAME = "api.bigmailer.io";
const API_PORT = 443;

/*const https = require("http");
const API_HOSTNAME = "localhost";
const API_PORT = 8085;*/

function updateContact(email, data) {
  return new Promise((resolve, reject) => {
    if (!email) {
      reject(new Error("email parameter is missing"));
      return;
    }

    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: `/v1/brands/${process.env.BIGMAILER_BRAND_ID}/contacts/${email}?field_values_op=replace`,
      method: "POST",
      headers: {
        "X-API-Key": process.env.BIGMAILER_API_KEY,
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    const req = https.request(options, res => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        reject(
          new Error(
            "Failed to complete request - " +
              (res.statusMessage ? res.statusMessage : res.statusCode)
          )
        );
      }

      const body = [];
      res.on("data", d => body.push(d));
      res.on("end", () => resolve(body.join("")));
    });

    req.on("error", err => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Updates the topic field of a subscriber with the given contact ID.
function updateUserTopic(email, topic) {
  return new Promise((resolve, reject) => {
    if (!topic) {
      reject(new Error("topic must be set"));
      return;
    }
    const data = JSON.stringify({
      field_values: [
        {
          string: topic,
          name: "topics"
        }
      ]
    });

    updateContact(email, data)
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

function subscribeUser(email, topic) {
  return new Promise((resolve, reject) => {
    if (!topic) {
      reject(new Error("topic must be set"));
      return;
    }

    const data = JSON.stringify({
      api_key: process.env.BIGMAILER_API_KEY,
      email: email,
      field_values: [
        {
          string: topic,
          name: "topics"
        }
      ],
      list_ids: [process.env.BIGMAILER_LIST_ID]
    });

    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: `/v1/brands/${process.env.BIGMAILER_BRAND_ID}/contacts`,
      method: "POST",
      headers: {
        "X-API-Key": process.env.BIGMAILER_API_KEY,
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    const req = https.request(options, res => {
      if (res.statusCode == 422) {
        console.log(`duplicate signup from ${email}`);
      } else if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(res);
        console.log(res.body);
        reject(
          new Error(
            "Failed to complete request - " +
              (res.statusMessage ? res.statusMessage : res.statusCode)
          )
        );
      }

      const body = [];
      res.on("data", d => body.push(d));
      res.on("end", () => resolve(body.join("")));
    });

    req.on("error", err => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Sets the user with the given ID to unsubscribed.
function unsubscribeUser(email) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      api_key: process.env.BIGMAILER_API_KEY,
      status: "UNSUBSCRIBED"
    });

    updateContact(email, data)
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

module.exports = {
  subscribeUser,
  unsubscribeUser,
  updateUserTopic
};
