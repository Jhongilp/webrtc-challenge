import React from "react";
import { useFetchRoomList } from "../../hooks";

const RoomList = () => {
  const { roomList, loading } = useFetchRoomList();
  return (
    <div className="room-list--wrapper">
      <h1>RoomList</h1>
      {loading ? (
        <p>Loading ...</p>
      ) : (
        <ul className="room-list--items">
          {roomList.map((room) => (
            <li className="room-item" key={room.id}>{room.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomList;
