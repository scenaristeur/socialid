import { LitElement, html } from 'lit-element';
import './login-element.js'
import './inbox-element.js'
import './messages-element.js'

class AppElement extends LitElement {
  static get properties() {
    return {
      something: {type: String},
    };
  }
  constructor() {
    super();
    this.something = "world"
  }
  render(){
    return html`
    <login-element name="Login"></login-element>
    <inbox-element name="Inbox"></inbox-element>
    <messages-element name="Messages"></messages-element>
    `;
  }
}
customElements.define('app-element', AppElement);
