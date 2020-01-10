import { LitElement, html } from 'lit-element';
import * as auth from 'solid-auth-client';
import { HelloAgent } from '../agents/hello-agent.js';

class LoginElement extends LitElement {

  static get properties() {
    return {
      name: {type: String},
      webId: {type: String},
    };
  }

  constructor() {
    super();
    this.webId = null
  }

  render(){
    return html`
    ${this.webId == null ?
      html`
      <button @click=${this.login}>Login</button>
      `
      : html`
      <button @click=${this.logout}>Logout</button>
      ${this.webId}
      `
    }
    `;
  }

  firstUpdated(){
    this.agent = new HelloAgent(this.name);
    auth.trackSession(session => {
      if (!session){
        this.webId=null
        this.agent.send('Messages',  {action:"info", info:"Not logged"});
        this.agent.send('Inbox',  {action:"webIdChanged", webId:null});
      }
      else{
        this.webId = session.webId
        this.agent.send('Messages',  {action:"info", info:"Login "+this.webId});
        this.agent.send('Inbox',  {action:"webIdChanged", webId:this.webId});
      }
    })
  }

  login(event) {
    this.popupLogin();
  }

  logout(event) {
    auth.logout().then(() => alert('Goodbye!'));
  }

  async popupLogin() {
    let session = await auth.currentSession();
    let popupUri = './dist-popup/popup.html';
    if (!session)
    session = await auth.popupLogin({ popupUri });
  }
}
customElements.define('login-element', LoginElement);
