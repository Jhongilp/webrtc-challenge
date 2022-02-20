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

export const useGridWidth = (ref: any) => {
  const [width, setWith] = useState(200);

  useEffect(() => {
    const padding = 80;
    const ro = new ResizeObserver((entries) => {
      let { width, height } = entries[0]?.contentRect ?? {};
      if (width && height) {
        const heightAvailable = height - padding;
        const widthAspectRatio = heightAvailable / 0.5625; // 16/9 aspect ratio
        const maxWidth = widthAspectRatio > width ? width : widthAspectRatio;
        const widthMinusPadding =
          maxWidth + padding <= width ? maxWidth : maxWidth - padding;
        setWith(widthMinusPadding);
      }
    });

    if (ref?.current) {
      ro?.observe?.(ref.current);
    }
    return () => {
      ro?.disconnect?.();
    };
  }, [ref]);

  return width;
};
