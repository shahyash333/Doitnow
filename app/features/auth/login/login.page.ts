import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  constructor() {}

  // Google sign in method will be implemented here
  signInWithGoogle() {
    console.log('Google sign in clicked');
  }
}
