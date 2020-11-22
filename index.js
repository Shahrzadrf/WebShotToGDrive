const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
const fetch = require('node-fetch');
const { google } = require('googleapis');
const readline = require('readline');

//Gdrive Config
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';

let paths = [];
let fidx = -1;
let sites = [{
        name: 'iFunded',
        link: 'https://ifunded.de/en'
    },
    {
        name: 'Property Partner',
        link: 'https://www.propertypartner.co'
    },
    {
        name: 'Property Moose',
        link: 'https://propertymoose.co.uk'
    },
    {
        name: 'Homegrown',
        link: 'https://www.homegrown.co.uk'
    },
    {
        name: 'Realty Mogul',
        link: 'https://www.realtymogul.com'
    },
]
if (!fs.existsSync('./files')){
  fs.mkdirSync('./files');
}
app.get('/', (req, res) => {
  res.send('this app receives Screenshots From an API and Saves Them On the Gdrive. in order to start the app,\radd /start at end of the page URL and navigate to it')
});

app.get('/start', (req, res) => {
    paths = fs.readdirSync('./files/');
    download().then(()=>{
      //console.log(paths);
      for (let i = 0; i < paths.length; i++) {
        toDrive();
      }
    }).catch((reason)=>{
      console.log('Error on download',reason);
    })
    res.status(200).send('Started');
});


async function download() {

  let c = paths.length+1;
  for (let index = 0; index < sites.length; index++) {
    let lin = `https://api.screenshotmachine.com?key=7baf40&url=${sites[index].link}&device=desktop&dimension=1920x1080&format=jpg&cacheLimit=0&delay=2000`;
    const response = await fetch(lin);
    const buffer = await response.buffer();
   fs.writeFileSync(`./files/${c} ${sites[index].name}.jpg`,buffer);
   console.log(`finished downloading ${c} ${sites[index].name}`);
      c++;
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the given callback function.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  function getAccessToken(oAuth2Client, callback) {
      const authUrl = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
      });
      rl.question('Enter the code from that page here: ', (code) => {
          rl.close();
          oAuth2Client.getToken(code, (err, token) => {
              if (err) return console.error('Error retrieving access token', err);
              oAuth2Client.setCredentials(token);
              // Store the token to disk for later program executions
              fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                  if (err) return console.error(err);
                  console.log('Token stored to', TOKEN_PATH);
              });
              callback(oAuth2Client);
          });
      });
  }
  /**
  * Describe with given media and metaData and upload it using google.drive.create method()
  */
  function uploadFile(auth) {
    const drive = google.drive({version: 'v3', auth});
    // get the Next file name to save
    let filename = givename();
    const fileMetadata = {
      'name': filename,
      //parents:['1rzps9R8HUbNGwDWoceourRQJjVd_1UW1']
    };
    const media = {
      mimeType: 'image/jpeg',
      body: fs.createReadStream(`files/${filename}`)
    };
    drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    }, (err, file) => {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        //show the uploaded file ID if needed
        console.log('File Id: ', file.id);
      }
    });
  }

  async function toDrive(){
    // Authorize a client with credentials, then call the Google Drive API.
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      authorize(JSON.parse(content), uploadFile);
    });
  }
//Dowbload
function givename(){
  //returns the next filename to Save
  fidx++;
  if(fidx>=paths.length) fidx = -1;
  return paths[fidx]
}

//Start the Express Webserver
app.listen(port, () => console.log(`Listening on Port ${port}`));