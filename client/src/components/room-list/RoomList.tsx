import React from "react";
import { useFetchRoomList } from "../../hooks";
import { TSelectedRoom } from "../../types/room.types";

type TRoomListProps = {
  onSelectRoom: (input: TSelectedRoom) => void;
};

const RoomList = ({ onSelectRoom }: TRoomListProps) => {
  const { roomList, loading } = useFetchRoomList();
  return (
    <div className="room-list--wrapper">
      <h1>RoomList</h1>
      {loading ? (
        <p>Loading ...</p>
      ) : (
        <ul className="room-list--items">
          {roomList.map((room) => (
            <li
              className="room-item"
              key={room.id}
              onClick={() => onSelectRoom({ id: room.id, name: room.name })}
            >
              {room.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomList;
