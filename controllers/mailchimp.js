const crypto = require("crypto");
const https = require("https");

const API_HOSTNAME = "us16.api.mailchimp.com";
const API_PORT = 443;

const ALL_TOPICS = ["all", "blog", "retrospectives", "book-reports"];

function md5(value) {
  return crypto
    .createHash("md5")
    .update(value)
    .digest("hex");
}

function sendRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
        Authorization:
          "Basic " +
          new Buffer.from("ignored:" + process.env.MAILCHIMP_API_KEY).toString(
            "base64"
          )
      }
    };
    const req = https.request(options, res => {
      const responseChunks = [];
      res.on("data", d => responseChunks.push(d));
      res.on("end", () => {
        const body = responseChunks.join("");
        if (res.statusCode < 200 || res.statusCode > 299) {
          console.log("mailchimp request failed", res);
          parsed = JSON.parse(body);
          if (parsed && parsed.detail) {
            message = parsed.detail;
          } else {
            message = res.statusMessage ? res.statusMessage : res.statusCode;
          }
          reject(new Error(message));
          return;
        }
        resolve(body);
      });
    });

    req.on("error", err => {
      console.log("mailchimp request failed", err);
      if (err.response && err.response.data && err.response.data.message) {
        reject(err.response.data.message);
      }
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function updateUserTopic(email, topics) {
  return new Promise((resolve, reject) => {
    if (!email) {
      reject(new Error("invalid email address"));
      return;
    }
    if (!topics || !ALL_TOPICS.includes(topics)) {
      reject(new Error("invalid topics parameter"));
      return;
    }
    tags = [];
    for (const possibleTopic of ALL_TOPICS) {
      if (topics === possibleTopic) {
        tags.push({ name: topics, status: "active" });
      } else {
        tags.push({ name: possibleTopic, status: "inactive" });
      }
    }

    const subscriberHash = md5(email.toLowerCase());
    sendRequest(
      "POST",
      `/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members/${subscriberHash}/tags`,
      {
        tags
      }
    )
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

function subscribeUser(email, topics) {
  return new Promise((resolve, reject) => {
    if (!email) {
      reject(new Error("invalid email address"));
      return;
    }
    if (!topics || !ALL_TOPICS.includes(topics)) {
      reject(new Error("invalid topics parameter"));
      return;
    }

    sendRequest("POST", `/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: email,
      status: "pending",
      tags: [topics]
    })
      .then(result => resolve(result))
      .catch(err => {
        // Treat duplicate signups as non-errors.
        if (err.toString().indexOf("is already a list member") >= 0) {
          resolve(true);
        } else {
          reject(err);
        }
      });
  });
}

function unsubscribeUser(email) {
  return new Promise((resolve, reject) => {
    if (!email) {
      reject(new Error("invalid email address"));
      return;
    }

    const subscriberHash = md5(email.toLowerCase());
    sendRequest(
      "PATCH",
      `/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members/${subscriberHash}`,
      {
        status: "unsubscribed"
      }
    )
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

module.exports = {
  subscribeUser,
  unsubscribeUser,
  updateUserTopic
};
