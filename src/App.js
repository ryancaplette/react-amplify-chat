import React, { useRef, useState } from 'react';
import './App.css';

import Amplify, { Auth } from 'aws-amplify';
import awsconfig from './aws-exports';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
Amplify.configure(awsconfig);

let user = false;

Auth.currentUserInfo().then((data) => {
  user = data;
  console.log(data)
});

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <h4>Welcome to Ryan.chat - So anyone can contact me. 😊</h4>
        <AmplifySignOut />
      </header>
      <section>
        {/* this doesnt work would need way to update state and display value  */}
        I'm Logged In!
      </section>
    </div>
  );
}

function SignIn() {

  return (
    <div>
    My App
    <AmplifySignOut />
  </div>
  );
}

function ChatRoom() {

  const scrollHelper = useRef();


  const [formValue, setFormValue] = useState('');

  return (
    <>
      <main>
        <div> Hello Moto </div>

        <div ref={scrollHelper}></div>
      </main>

      <form>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
    </>
  )

}

export default withAuthenticator(App);
