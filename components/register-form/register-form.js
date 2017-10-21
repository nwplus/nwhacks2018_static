class RegisterForm extends Polymer.Element {
  static get is () { return 'register-form' }

  eq (a, b) {
    return a === b
  }
}

customElements.define(RegisterForm.is, RegisterForm)
