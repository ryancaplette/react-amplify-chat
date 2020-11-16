import React, { useRef, useState } from 'react';
import './App.css';

import Amplify, { Auth, API, graphqlOperation } from 'aws-amplify';
import awsconfig from './aws-exports';
import { withAuthenticator } from '@aws-amplify/ui-react';

import { listChats } from './graphql/queries';
import { createChat } from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';

Amplify.configure(awsconfig);

let subscription;
let scrollRef;

function scrollHelper() {
  scrollRef.current.scrollIntoView({ behavior: 'smooth' });
}

function setScrollHelper(ref) {
  scrollRef = ref;
}

function App() {
  const [user, setUser] = useState();

  Auth.currentUserInfo().then((data) => {
    console.log('trying');
    if (data) {
      setUser(data.username);
      console.log('user was set');
    }
  });

  return (
    <div className="App">
      <header className="App-header">
        <h4>Welcome to Ryan.chat - So anyone can contact me. 😊</h4>
        {/* <AmplifySignOut /> */}
        <button onClick={handleLogout} >Logout</button>
      </header>
      <section>
        <ChatRoom />
      </section>
    </div>
  );
}

function handleLogout() {
  // remove user from available chat participants
  subscription.unsubscribe();

  Auth.signOut();
  window.location.reload();
}

async function setupSub(setMessages) {
  subscription = await API.graphql(
    graphqlOperation(subscriptions.onCreateChat)
  ).subscribe({
    next: (chatData) => {
      setMessages((currentState) => [...currentState, {message: chatData.value.data.onCreateChat.message}]);
      console.log('after set');
      scrollHelper();
    }
  });

  const allMessages = await API.graphql(graphqlOperation(listChats, {/*limit: 25*/}));
  setMessages(allMessages.data.listChats.items);
  scrollHelper();
}

function ChatRoom() {

  const scrollHelper = useRef();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');

  if (!subscription) {
    console.log('setting up');
    setupSub(setMessages);
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    setFormValue('');

    const chat = { message: formValue };
    API.graphql(graphqlOperation(createChat, {input: chat}));
  }

  return (
    <>
      <main>
        {messages && messages.map(msg => <ChatMessage message={msg} />)}

        <div ref={scrollHelper}></div>
      </main>

      <form onSubmit={sendMessage} onLoad={setScrollHelper(scrollHelper)}>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
    </>
  )

}

function ChatMessage(props) {
  const { message } = props.message;

  // const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  const messageClass = 'sent';

  return (<>
    <div className={`message ${messageClass}`}>
      {/* <img src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /> */}
      <p>{message}</p>
    </div>
  </>)
}

export default withAuthenticator(App);
