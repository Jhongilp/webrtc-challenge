import { useState, useEffect } from "react";
import { TRoomInfo } from "../types/api.types";

import * as API from "../apis";

type TStateFetchRoomList = {
  roomList: TRoomInfo[];
  loading: boolean;
  error: boolean;
};

export const useFetchRoomList = () => {
  const [fetchResult, updateFetchResults] = useState<TStateFetchRoomList>({
    roomList: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    API.getRoomList()
      .then((res) => {
        updateFetchResults((state) => ({
          ...state,
          roomList: res,
          loading: false,
        }));
      })
      .catch((error) => {
        console.log("Error trying to fetch room list", error);
        updateFetchResults((state) => ({
          ...state,
          error: true,
        }));
      });
  }, []);

  return fetchResult;
};
