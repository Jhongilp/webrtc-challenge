import { TRoomInfo } from "../types/api.types";

const data: TRoomInfo[] = [
  {
    name: "Room test 1",
    id: 1011,
  },
  {
    name: "Room test 2",
    id: 1012,
  },
  {
    name: "Room test 3",
    id: 1013,
  },
  {
    name: "Room test 4",
    id: 1014,
  },
];

export const getRoomList = () => {
  const roomList = new Promise<TRoomInfo[]>((resolve, _reject) => {
    const fetchDelayMillis = Math.random() * 3000;
    window.setTimeout(() => {
      return resolve(data);
    }, fetchDelayMillis);
  });
  return roomList;
};

export {};
