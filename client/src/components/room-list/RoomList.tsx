import React from "react";
import { useFetchRoomList } from "../../hooks";

const RoomList = () => {
  const { roomList, loading } = useFetchRoomList();
  return (
    <div>
      <h1>RoomList</h1>
      {loading ? (
        <p>Loading ...</p>
      ) : (
        <ul>
          {roomList.map((room) => (
            <li key={room.id}>{room.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomList;
