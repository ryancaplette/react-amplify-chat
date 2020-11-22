import React, { useRef, useState } from 'react';
import './App.css';

import Amplify, { Auth, API, graphqlOperation } from 'aws-amplify';
import awsconfig from './aws-exports';
import { withAuthenticator } from '@aws-amplify/ui-react';

import { listChats, getUser, listUsers } from './graphql/queries';
import { createChat, createUser, updateUser } from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';

Amplify.configure(awsconfig);

let chatFeed;
let theUser;
let scrollRef;

function scrollHelper() {
  scrollRef.current.scrollIntoView({ behavior: 'smooth' });
}

function setScrollHelper(ref) {
  scrollRef = ref;
}

function App() {
  const [participants, setParticipants] = useState([])
  const [chattingWith, setChattingWith] = useState('')

  Auth.currentUserInfo().then((data) => {
    if (data) {
      setupActiveUser(data.username, participants, setParticipants)
    }
  });

  async function unsubscribe() {
    await chatFeed.unsubscribe()
    setChattingWith('');
    chatFeed = false;
  }

  return (
    <div className="App">
      <header className="App-header">
        {chattingWith && <p onClick={() => unsubscribe()}><i className="arrow"></i></p>}
        <h4>Welcome to Ryan.chat - So anyone can contact me. 😊</h4>
        {chattingWith ? `Chatting with ${chattingWith}` : ''}
        {/* <AmplifySignOut /> */}
        <button onClick={handleLogout} >Logout</button>
      </header>
      <section>
        { chattingWith ? <ChatRoom chattingWith={chattingWith} /> : <ChatParticipants setChattingWith={setChattingWith} participants={participants}/> }
      </section>
    </div>
  );
}

async function setupActiveUser(activeUser, participants, setParticipants) {
  if (participants.length > 0) {
    return
  }

  const user = await API.graphql(graphqlOperation(getUser, { id: activeUser }));
  theUser = activeUser;

  if (user.data.getUser) {
    API.graphql(graphqlOperation(updateUser, { input: {id: activeUser, isOnline: true}}));
  } else {
    API.graphql(graphqlOperation(createUser, { input: {id: activeUser, isOnline: true}}));
  }

  const filter = {filter: {
    // isOnline: {eq: true},
    id: {ne: activeUser}
  }}
  const activeUsers = await API.graphql(graphqlOperation(listUsers, filter));
  if (activeUsers.data.listUsers.items.length > 0) {
    setParticipants(activeUsers.data.listUsers.items)
  }
}


function ChatParticipants(props) {

  return (
    <>
      <main>
        {props.participants && props.participants.map(participant => <ChatParticipant key={participant.id} participant={participant} setChattingWith={props.setChattingWith} />)}
      </main>
    </>
  )

}


function ChatParticipant(props) {
  return (
    <>
      <div className="contact" onClick={(e) => props.setChattingWith(props.participant.id)}>
        <div className="contact-letter">
          {props.participant.id[0]}
        </div>
        <div className="contact-info">
          <span className="contact-username">{props.participant.id}</span><br />
          <span className="contact-online"><small>{props.participant.isOnline ? 'online' : 'offline'}</small></span>
        </div>
        <img src="/chat.png" alt="chat" />
      </div>
    </>
  )

}



async function handleLogout() {
  // remove user from available chat participants
  if (chatFeed) {
    chatFeed.unsubscribe();
  }

  await API.graphql(graphqlOperation(updateUser, { input: {id: theUser, isOnline: false}}));

  Auth.signOut();
  window.location.reload();
}

async function setupChatFeed(setMessages, chattingWith) {
  chatFeed = await API.graphql(
    graphqlOperation(subscriptions.onCreateChat)
  ).subscribe({
    next: (chatData) => {
      if (chatData.value.data.onCreateChat.from !== theUser && chatData.value.data.onCreateChat.to !== theUser) {
        return
      }

      const {from, to, message } = chatData.value.data.onCreateChat
      setMessages((currentState) => [...currentState, {from: from, to: to, message: message}]);
      scrollHelper();
    }
  });

  const filter = {filter: {
    or: [
      {and: [
        {to: { eq: theUser }},
        {from: { eq: chattingWith }}
      ]},
      {and: [
        {to: { eq: chattingWith }},
        {from: { eq: theUser }}
      ]}
    ]
  }}
  const allMessages = await API.graphql(graphqlOperation(listChats, filter));

  // sort by createdAt
  allMessages.data.listChats.items.sort((msg1, msg2) => (Date.parse(msg1.createdAt) > Date.parse(msg2.createdAt)) ? 1 : -1)
  setMessages(allMessages.data.listChats.items);
  scrollHelper();
}

function ChatRoom(props) {

  const scrollHelper = useRef();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');

  React.useEffect(() => {
    setupChatFeed(setMessages, props.chattingWith);
  }, [props.chattingWith]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const chat = { from: theUser, to: props.chattingWith, message: formValue };
    API.graphql(graphqlOperation(createChat, {input: chat}));
    setFormValue('');
  }

  return (
    <>
      <main>
        {messages && messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}

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
  const { from, message } = props.message;


  const messageClass = theUser === from ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      {/* <img src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /> */}
      <p>{message}</p>
    </div>
  </>)
}

export default withAuthenticator(App);
