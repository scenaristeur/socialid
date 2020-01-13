import { LitElement, html } from 'lit-element';
import { HelloAgent } from '../agents/hello-agent.js';
import * as auth from 'solid-auth-client';
import SolidFileClient from 'solid-file-client';
import data from "@solid/query-ldflex";
import { namedNode } from '@rdfjs/data-model';
//import fetch from '@rdfjs/fetch';
//import '../vendor/rdflib/rdflib.min.js'
//import { fetchDocument } from "tripledoc";
import { foaf, schema } from "rdf-namespaces";

class InboxElement extends LitElement {

  static get properties() {
    return {
      name: {type: String},
      webId: {type: String},
      friends: {type: Array},
      messagesFiles: {type: Array},
      messages: {type: Array},
      lang: {type: String},
    };
  }

  constructor() {
    super();
    this.webId = null
    this.friends = []
    this.messages = []
    this.messagesFiles = []
    this.lang=navigator.language
  }

  render(){
    const friendList = (friends) => html`
    <h5>Friends (${friends.length})</h5>
    ${friends.map((f) => html`${this.templateFriend(f)}`)}
    `;

    const messageList = (messages) => html`
    <h5>Messages (${messages.length})</h5>
    <table id="messages">
    <tr>
    <th>Sender</th>
    <th>Title</th>
    <th>Content</th>
    <th>Date</th>
    </tr>

    ${this.messages.length == 0 ?
      html`<tr><td colspan="4">Inbox Loading... (${this.messagesFiles.length-1} messages)</td></tr>`
      :html `${messages.reverse().map((m) => html`${this.templateMessageEntete(m)}`)}`
    }
    </table>
    `;

    return html`
    <style>
    #writePan{
      display:none;
      padding: 20px;
    }
    #writePan input, #writePan textarea{
      padding: 5px;
      margin: 5px;
    }
    #messages {
      font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
      border-collapse: collapse;
      width: 100%;
    }
    #messages td, #messages th {
      border: 1px solid #ddd;
      padding: 8px;
    }
    #messages tr:nth-child(even){background-color: #f2f2f2;}
    #messages tr:hover {background-color: #ddd;}
    #messages th {
      padding-top: 12px;
      padding-bottom: 12px;
      text-align: left;
      background-color: #4CAF50;
      color: white;
    }
    </style>
    <div>
    ${this.webId == null ?
      html`Login to see your inbox`
      : html`
      Inbox of <b>${this.webId}</b> !
      <button @click="${this.notifyMe}">Notify me!</button>
      ${friendList(this.friends)}
      <div id="writePan">

      <input id="to" placeholder="Recipient" size="51"></input><br>
      <input id="title" placeholder="Title" size="51"></input><br>
      <textarea id="messageContent" rows="4" cols="50" placeholder="Content"></textarea><br>
      <button @click=${this.send}>Send</send>
      </div>
      ${messageList(this.messages)}
      `
    }
    </div>
    `;
  }


  notifyMe() {
    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    }
    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
      // If it's okay let's create a notification
      var notification = new Notification("Hi there!");
    }
    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (permission) {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          var notification = new Notification("Hi there!");
        }
      });
    }
  }

  firstUpdated(){
    var app = this;
    this.agent = new HelloAgent(this.name);
    this.fc = new SolidFileClient( auth )
    this.agent.receive = function(from, message) {
      //  console.log(message)
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

  async webIdChanged(webId){
    this.webId = webId
    if (this.webId != null){
      var websocket = this.webId.split('/')[2];
      this.inbox = await data.user.inbox
      this.readInbox()
      this.readFriends()
      this.subscribe("wss://"+websocket)
    }else{
      this.inbox = ""
      this.friends = []
      this.messages = []
      this.socket = null
    }
  }

  subscribe(websocket){
    var app = this
    var log = this.inbox+"log.ttl"
    app.socket = new WebSocket(websocket);
    app.socket.onopen = function() {
      const d = new Date();
      var now = d.toLocaleTimeString(app.lang)
      this.send('sub '+log);
      app.agent.send('Messages',  {action:"info", info: now+"[souscription] "+log});
    };
    app.socket.onmessage = function(msg) {
      if (msg.data && msg.data.slice(0, 3) === 'pub') {
        app.notification("nouveau message Socialid")
        app.readInbox()
      }
    };
  }

  async readFriends(){
    var app = this
    this.friends = []
    var developper = {webid: "https://spoggy.solid.community/profile/card#me", name: "Spoggy", inbox: "https://spoggy.solid.community/inbox"}
    app.friends = [... app.friends, developper]
    for await (const friend of data.user.friends){
      const f = {}
      const n = await data[friend].vcard$fn;
      const inbox = await data[friend].inbox;
      f.webId= `${friend}`
      f.name = `${n}`
      f.inbox = `${inbox}`
      if (n ==undefined){
        f.name = `${friend}`
      }
      app.friends = [... app.friends, f]
    }
  }

  templateFriend(f){
    return html`
    <div class="friend">
    <a href="${f.webId}" target="_blank">${f.name}</a> inbox : ${f.inbox}
    ${f.inbox != "undefined" ?
    html`<button inbox="${f.inbox}" @click=${this.write}>Write</button>`
    :html``}
    </div>
    `
  }

  templateMessageEntete(m){
    return html`
    <tr>
    <td><a href="${m.sender}" target="_blank">${m.senderName}</a></td>
    <td><a href="${m.url}" target="_blank">${m.label}</a></td>
    <td>${m.text}</td>
    <td>${m.dateSent}</td>
    </tr>
    `
  }

  write(e){
    this.recipient = e.target.getAttribute("inbox")
    this.shadowRoot.getElementById("writePan").style.display = "block"
    this.shadowRoot.getElementById("to").value=this.recipient
  }
  async send(){
    var message = {}
    message.date = new Date(Date.now())
    message.id = message.date.getTime()
    message.sender = this.webId
    message.recipient = this.recipient
    message.content = this.shadowRoot.getElementById("messageContent").value.trim()
    message.title = this.shadowRoot.getElementById("title").value.trim()
    message.url = message.recipient+message.id+".ttl"
    this.shadowRoot.getElementById("to").value = ""
    this.shadowRoot.getElementById("title").value = ""
    this.shadowRoot.getElementById("messageContent").value = ""
    this.shadowRoot.getElementById("writePan").style.display = "none"
    if(message.content.length > 0 && message.title.length > 0 && message.recipient.length > 0){
      this.buildMessage(message)
    }else{
      alert("Recipient or title or content is empty")
    }

  }

  async   buildMessage(message){
    var mess = message.url
    //message
    await data[mess].schema$text.add(message.content);
    await data[mess].rdfs$label.add(message.title)
    await data[mess].schema$dateSent.add(message.date.toISOString())
    await data[mess].rdf$type.add(namedNode('https://schema.org/Message'))
    await data[mess].schema$sender.add(namedNode(this.webId))
    //log
    var log = message.recipient+"log.ttl#"+message.id
    await data[log].schema$message.add(namedNode(mess))
    await data[log].schema$dateSent.add(message.date.toISOString())
    await data[log].schema$sender.add(namedNode(this.webId))
    await data[log].rdfs$label.add(message.title)
  }

  notification(notificationMessage){
    var notification = new Notification(notificationMessage);
  }


  async readInbox(){
    /*let inboxLog = await this.fc.readFile(`${this.inbox}`+'log.ttl')
    console.log(inboxLog)*/
    var store = $rdf.graph()
    let logurl = `${this.inbox}`+'log.ttl'
    /*
    var log = $rdf.sym(logurl);

    console.log(log)//
    var messages = store.any(log)
    console.log(messages)*/

    var timeout = 5000 // 5000 ms timeout
    var fetcher = new $rdf.Fetcher(store, timeout)
    var SCHEMA = $rdf.Namespace("http://schema.org/")
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/")
    var XSD = $rdf.Namespace("http://www.w3.org/2001/XMLSchema#")

    fetcher.nowOrWhenFetched(logurl, function(ok, body, xhr) {
      if (!ok) {
        console.log("Oops, something happened and couldn't fetch data");
      } else {
        // do something with the data in the store (see below)
        console.log(ok)
        console.log(body)
        var friends = store.statementsMatching(null, SCHEMA("message"), null) //FOAF('knows') //statementsMatching
        for (var i=0; i<friends.length;i++) {
          console.log(friends[i].subject.uri, friends[i].object.uri)
          var details = store.statementsMatching(friends[i].subject.uri, null, null, logurl)
          console.log(details)
          /*for (var j=0; j<details.length;j++) {
            console.log(details[j])
          }*/
          //  friend = friends[i]
          //    console.log(friend.subject.uri) // a person having friends
          //  console.log(friend.object.uri) // a friend of a person

        }
      }
    })



    /*const logDocument = await fetchDocument(logurl);
    console.log(logDocument)
    const logmessages = await logDocument.findSubjects(schema.message);
    console.log(logmessages)
    logmessages.forEach(function m){
    console.log(`  - ${m}`);
    //  const mess =
  }*/
  /*let inboxLog = await data[logurl]
  console.log(`${inboxLog}`)
  for await (const mess of `${inboxLog}`.schema$message)
  console.log(`  - ${mess}`);*/


}

/*
async readInbox(){
let inboxFolder = await this.fc.readFolder(`${this.inbox}`)
this.messagesFiles = []
this.messagesFiles = inboxFolder.files;
await this.getMessagePreview()
}

async getMessagePreview(){
var app = this
var messages = []
for await (const m of this.messagesFiles){
if (m.name != "log.ttl"){
const url = m.url
m.label = await data[m.url].rdfs$label
m.sender = await data[m.url].schema$sender
m.dateSent = new Date(await data[m.url].schema$dateSent).toLocaleString(app.lang)
m.text = await data[m.url].schema$text
m.senderName = await data[m.sender].vcard$fn;
messages = [... messages, m]

messages.sort(function(a, b) { //tri par date
var a = parseInt(a.name.split('.')[0])
var b = parseInt(b.name.split('.')[0])
return a - b;
});
}
}
this.messages = messages
}*/

}

customElements.define('inbox-element', InboxElement);
