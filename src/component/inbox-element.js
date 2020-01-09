import { LitElement, html } from 'lit-element';
import { HelloAgent } from '../agents/hello-agent.js';
import * as auth from 'solid-auth-client';
import SolidFileClient from 'solid-file-client';
import data from "@solid/query-ldflex";

class InboxElement extends LitElement {

  static get properties() {
    return {
      name: {type: String},
      webId: {type: String},
      friends: {type: Array}
    };
  }

  constructor() {
    super();
    this.webId = null
    this.friends = []
  }

  render(){

    const friendList = (friends) => html`
    <h5>Friends (${friends.length})</h5>
    ${friends.map((f) => html`${this.templateFriend(f)}`)}
    `;

    return html`
    <div>
    ${this.webId == null ?
      html`Login to see your inbox`
      : html`
      Inbox of <b>${this.webId}</b> !
      ${friendList(this.friends)}
      `
    }
    </div>
    `;
  }

  firstUpdated(){
    var app = this;
    this.agent = new HelloAgent(this.name);
    this.fc = new SolidFileClient( auth )
    this.agent.receive = function(from, message) {
      console.log(message)
      if (message.hasOwnProperty("action")){
        switch(message.action) {
          case "webIdChanged":
          app.webIdChanged(message.webId)
          break;
          default:
          console.log("Unknown action ",message)
        }
      }
    };
  }

  webIdChanged(webId){
    this.webId = webId
    console.log(webId)
    if (this.webId != null){
      //  this.readWebId()
      //  this.readPublic()
      this.readFriends()
      //    this.readInbox()
    }else{
      this.inbox = ""
      this.storage = null
      this.friends = []
    }
  }



  async readFriends(){
    var app = this
    this.friends = []
    for await (const friend of data.user.friends){
    //  console.log(`  - ${friend} is a friend`);
      const n = await data[friend].vcard$fn;
    //  console.log(`NAME: ${n}`);
      const f = {webId: `${friend}`, name: `${n}`}
      if (n ==undefined){
        f.name = `${friend}`
      }
      app.friends = [... app.friends, f]
    }
    //console.log(app.friends)
  }

  templateFriend(f){
    return html`
    <div class="friend">
    <a href="${f.webId}" target="_blank">${f.name}</a>
    </div>
    `
  }


  async readInbox(){
    this.inbox = await data.user.inbox
    console.log(`  - ${this.inbox}`);
    let inboxFolder = await this.fc.readFile( this.inbox )
    console.log(inboxFolder)
  }

  async readPublic(){
    this.storage = await data.user.storage
    console.log(`  - ${this.storage}`);
    let folders = await this.fc.readFolder( this.storage+"public" )
    console.log(folders)
  }

  async readWebId(){
    let content = await this.fc.readFile( this.webId )
    console.log(content)
  }



}

customElements.define('inbox-element', InboxElement);






/*
// INSTANTIATE AUTH AND FILE-CLIENT OBJECTS
//
const auth = solid.auth
const fc   = new SolidFileClient(auth)

// DEFINE A URI THAT CONTAINS A POPUP LOGIN SCREEN
//
const popUri = 'https://solid.community/common/popup.html'

// USE THE AUTH OBJECT TO LOGIN AND CHECK THE SESSION
// USE THE FILE-CLIENT OBJECT TO READ AND WRITE
//
async function run(){
let session = await auth.currentSession()
if (!session) { session = await auth.popupLogin({ popupUri:popUri }) }
console.log(`Logged in as ${session.webId}.`)
let content = await fc.readFile( someUrl )
console.log(content)
}
*/
