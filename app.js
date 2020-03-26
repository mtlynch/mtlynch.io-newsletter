'use strict';

const express = require('express');
const app = express();
const https = require('https')

function validateUserId(userId) {
  // Deliberately don't accept user IDs in the form of md5(email) because then
  // an attacker could modify anyone's settings just by knowing their email
  // address.
  return userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
}

function updateUser(userId, topic) {
  return new Promise((resolve, reject) => {
    if (!userId || !validateUserId(userId)) {
      reject(new Error('invalid userId parameter'));
      return;
    }
    if (!topic) {
      reject(new Error('topic must be set'));
      return;
    }
    const data = JSON.stringify({
      api_key: process.env.EMAIL_OCTOPUS_API_KEY,
      fields: {
        Topics: topic,
      }
    })

    const listId = process.env.EMAIL_OCTOPUS_LIST_ID;
    const path = `/api/1.5/lists/${listId}/contacts/${userId}`;

    const options = {
      hostname: 'emailoctopus.com',
      port: 443,
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        reject(new Error('Failed to complete request, status code: ' + res.statusCode));
      }

      const body = [];
      res.on('data', (d) => body.push(d));
      res.on('end', () => resolve(body.join('')));
    })

    req.on('error', (err) => {
      reject(err)
    });

    req.write(data)
    req.end()
  });
}

// TODO: Make this a POST
app.get('/update', (req, res) => {
  updateUser(req.query.userId, req.query.topics)
    .then((response) => {
      res.status(200).send('Update succeeded!').end();
    })
    .catch((err) => {
      res.status(500).send('Failed: ' + err).end();
    })
});

app.get('/', (req, res) => {
  res.status(200).send('Send your update to /update').end();
});

if (!process.env.EMAIL_OCTOPUS_API_KEY) {
  console.error('EMAIL_OCTOPUS_API_KEY environment variable is required');
  process.exit()
}
if (!process.env.EMAIL_OCTOPUS_LIST_ID) {
  console.error('EMAIL_OCTOPUS_LIST_ID environment variable is required');
  process.exit()
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;
