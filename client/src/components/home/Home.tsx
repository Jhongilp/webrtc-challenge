import React from "react";
import RoomList from "../room-list/RoomList";
import Room from "../room/Room";

// from here user will select a room, there won't be a router since we just one to test WebRTC implementation
const Home = () => {
  
  return (
    <div>
      <header className="App-header">
        <h1>WebRTC MEET</h1>
        <h4>Room name when user has joined</h4>
      </header>
      <main>
        {/* <Room /> */}
        <RoomList />
      </main>
    </div>
  );
};

export default Home;
