import { LitElement, html } from 'lit-element';
import { HelloAgent } from '../agents/hello-agent.js';
import * as auth from 'solid-auth-client';
import SolidFileClient from 'solid-file-client';
import data from "@solid/query-ldflex";
import { namedNode } from '@rdfjs/data-model';
//import { schema, rdf, rdfs } from 'rdf-namespaces';

class InboxElement extends LitElement {

  static get properties() {
    return {
      name: {type: String},
      webId: {type: String},
      friends: {type: Array},
      messages: {type: Array},
      lang: {type: String},
    };
  }

  constructor() {
    super();
    this.webId = null
    this.friends = []
    this.messages = []
    this.lang=navigator.language
  }

  render(){

    const friendList = (friends) => html`
    <h5>Friends (${friends.length})</h5>
    ${friends.map((f) => html`${this.templateFriend(f)}`)}
    `;

    const messageList = (messages) => html`
    <h5>Messages (${messages.length})</h5>
    ${messages.map((m) => html`${this.templateMessageEntete(m)}`)}
    `;



    return html`
    <style>
    #writePan{
      display:none
    }
    </style>
    <div>
    ${this.webId == null ?
      html`Login to see your inbox`
      : html`
      Inbox of <b>${this.webId}</b> !
      ${friendList(this.friends)}
      ${messageList(this.messages)}
      <div id="writePan">
      <input id="title" placeholder="Title"></input>
      <textarea id="messageContent" rows="4" cols="50"></textarea>

      <button @click=${this.send}>Send</send>
      </div>
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

  async webIdChanged(webId){
    this.webId = webId
    console.log(webId)
    if (this.webId != null){
      var websocket = this.webId.split('/')[2];
      console.log("WEBSOCK",websocket)
      //  this.readWebId()
      //  this.readPublic()
      this.readFriends()
      this.inbox = await data.user.inbox
      console.log(`  - ${this.inbox}`);
      this.readInbox()
      this.subscribe("wss://"+websocket)
    }else{
      this.inbox = ""
      this.storage = null
      this.friends = []
      this.socket = null
    }
  }

  subscribe(websocket){
    var app = this
    var log = this.inbox+"log.ttl"
    //https://github.com/scenaristeur/spoggy-chat-solid/blob/master/index.html
    //this.inbox.split
    /*
    console.log(this.inbox.split('/'))
    var websocket = this.inbox.split('/');
    console.log("WEBSOCK",websocket)*/
    app.socket = new WebSocket(websocket);
    //  console.log ("socket",app.socket)
    app.socket.onopen = function() {
      const d = new Date();
      var now = d.toLocaleTimeString(app.lang) + `.${d.getMilliseconds()}`
      this.send('sub '+log);
      //  app.agent.send('Messages', now+"[souscription] "+this.inbox)
      app.agent.send('Messages',  {action:"info", info: now+"[souscription] "+log});
      console.log("OPENED SOCKET",app.socket)
    };
    app.socket.onmessage = function(msg) {
      console.log("update")
      if (msg.data && msg.data.slice(0, 3) === 'pub') {
        console.log("update")
        //  Date.now() - app.lastUpdate > 1000 ?   app.getAgoraData() : "";
        app.readInbox()
        app.notification("nouveau message")
      }
      //else{console.log("message inconnu",msg)}
    };
  }

  async readFriends(){
    var app = this
    this.friends = []
    var developper = {webid: "https://spoggy.solid.community/profile/card#me", name: "Spoggy", inbox: "https://spoggy.solid.community/inbox"}
    app.friends = [... app.friends, developper]
    for await (const friend of data.user.friends){
      //  console.log(`  - ${friend} is a friend`);
      const f = {}
      const n = await data[friend].vcard$fn;
      const inbox = await data[friend].inbox;
      //  console.log(`NAME: ${n}`);
      f.webId= `${friend}`
      f.name = `${n}`
      f.inbox = `${inbox}`
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
    <a href="${f.webId}" target="_blank">${f.name}</a> inbox : ${f.inbox}
    ${f.inbox != "undefined" ?
    html`<button inbox="${f.inbox}" @click=${this.write}>Write</button>`
    :html``}
    </div>
    `
  }

  templateMessageEntete(m){
    return html`
    <div class="message">
    <a href="${m.sender}" target="_blank">${m.senderName}</a> :
    <a href="${m.url}" target="_blank">${m.label}</a>


    Contenu: ${m.text}

    <a href="${m.url}" target="_blank">${m.name}</a>

    ${m.dateSent}
    </div>
    `
  }


  write(e){
    var inbox = e.target.getAttribute("inbox")
    console.log(inbox)
    this.recipient = inbox;
    this.shadowRoot.getElementById("writePan").style.display = "block"
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
    console.log(message)
    this.shadowRoot.getElementById("messageContent").value = ""
    this.shadowRoot.getElementById("writePan").style.display = "none"
    var ttlFile = this.buildMessage(message)
  }

  async   buildMessage(message){
    //  this.fc.createFile(message.url)
    //  await data[message.url].rdfs$label.set("test")
    /*
    this.fc.fetch(message.url, {
    method: 'PATCH',
    body: message.content
  });*/
  var mess = message.url
  await data[mess].schema$text.add(message.content);
  await data[mess].rdfs$label.add(message.title)
  await data[mess].schema$dateSent.add(message.date.toISOString())
  await data[mess].rdf$type.add(namedNode('https://schema.org/Message'))
  await data[mess].schema$sender.add(namedNode(this.webId))
  //return "test"
  var notif = message.recipient+"log.ttl#"+message.id
  await data[notif].schema$message.add(namedNode(mess))
  /*var detail = notif+"#"+mess
  await data[detail].schema$sender.add(namedNode(this.webId))*/
}

notification(notificationMessage){
  Notification.requestPermission(function(result) {
    if (result === 'granted') {
      navigator.serviceWorker.ready.then(function(registration) {
        //  console.log("notif")
        registration.showNotification('Notificatiooooooon test '+notificationMessage);
      });
    }
  });
}

async readInbox(){
  let inboxFolder = await this.fc.readFolder(`${this.inbox}`)
  console.log(inboxFolder)
  this.messages = inboxFolder.files;
  await this.getMessagePreview()
}

async getMessagePreview(){
  var app = this
  this.messages.forEach(async function(m){
    var d = new Date();
    m.label = await data[m.url].rdfs$label
    m.sender = await data[m.url].schema$sender
  //  var date = await data[m.url].schema$dateSent
    m.dateSent = await data[m.url].schema$dateSent //date.parse() //.toLocaleTimeString(app.lang)
    m.text = await data[m.url].schema$text
    m.senderName = await data[m.sender].vcard$fn;
  })
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
