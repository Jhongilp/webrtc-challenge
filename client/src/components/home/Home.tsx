import React, { useState } from "react";
import RoomList from "../room-list/RoomList";
import Room from "../room/Room";
import { TSelectedRoom } from "../../types/room.types";

// from here user will select a room, there won't be a router since we just one to test WebRTC implementation
const Home = () => {
  const [selectedRoom, setSelectedRoom] = useState<TSelectedRoom>({
    name: null,
    id: null,
  });

  return (
    <div className="home">
      <header className="home-header">
        <h1>WebRTC MEET</h1>
        <h4>
          {selectedRoom.name
            ? selectedRoom.name
            : "Select a room from list below"}
        </h4>
      </header>
      <main className="home-main">
        {selectedRoom.id ? <Room roomId={selectedRoom.id}/> : <RoomList onSelectRoom={setSelectedRoom} />}
      </main>
    </div>
  );
};

export default Home;
