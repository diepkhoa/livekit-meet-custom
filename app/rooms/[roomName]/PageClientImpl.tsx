'use client';

import React from 'react';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  RoomConnectOptions,
  RoomEvent,
  Track,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';
import { CustomControlBar } from '@/components/CustomControlBar';
import { ToggleTilesButton } from '@/components/ToggleTilesButton';
import { CinemaFullscreenButton } from '@/components/CinemaFullscreenButton';
import { CustomChat } from '@/components/CustomChat';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
  singlePeerConnection: boolean;
  initialName?: string;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: props.initialName && props.initialName.trim() !== '' ? props.initialName : '',
      videoEnabled: true,
      audioEnabled: true,
    };
  }, [props.initialName]);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    setPreJoinChoices(values);
    const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
    url.searchParams.append('roomName', props.roomName);
    url.searchParams.append('participantName', values.username);
    if (props.region) {
      url.searchParams.append('region', props.region);
    }

    const connectionDetailsResp = await fetch(url.toString());

    if (!connectionDetailsResp.ok) {
      const errData = await connectionDetailsResp.json().catch(() => ({}));
      alert(errData.error || 'Phòng học này không tồn tại hoặc chưa được giáo viên cấp quyền truy cập!');
      window.location.href = '/';
      return;
    }

    const connectionDetailsData = await connectionDetailsResp.json();
    setConnectionDetails(connectionDetailsData);
  }, [props.roomName, props.region]);

  const handlePreJoinError = React.useCallback((e: any) => console.error(e), []);

  return (
    <main data-lk-theme="default" className="lk-main-room">
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div className="lk-prejoin-wrapper">
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
            joinLabel="Bắt đầu lớp học"
            micLabel="Micro"
            camLabel="Camera"
            userLabel="Tên hiển thị"
          />
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{
            codec: props.codec,
            hq: props.hq,
            singlePeerConnection: props.singlePeerConnection,
          }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
    singlePeerConnection: boolean;
  };
}) {
  // 1. CẤU HÌNH ROOM VÀ SCREEN SHARE TỐI ƯU
  const roomOptions = React.useMemo((): RoomOptions => {
    const selectedCodec: VideoCodec = 'h264';

    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };

    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: true, // Bật RED giúp âm thanh không bị nghẹt tiếng
      videoCodec: selectedCodec,
      screenShareSimulcastLayers: [],
      screenShareEncoding: {
        maxBitrate: 10_000_000,
        maxFramerate: 60,
      },
      degradationPreference: 'maintain-resolution',
    };

    return {
      videoCaptureDefaults,
      publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: false,
      dynacast: false,
      e2ee: undefined, // Tắt hoàn toàn E2EE để máy mát
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [props.userChoices, props.options.hq, props.options.singlePeerConnection]);

  const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);

  const router = useRouter();
  const [isLeaving, setIsLeaving] = React.useState(false);

  // 👉 ĐÃ BỔ SUNG STATE QUẢN LÝ ĐÓNG/MỞ CHAT Ở ĐÂY:
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const handleToggleChat = React.useCallback(() => {
    setIsChatOpen((prev) => {
      // Khi mở chat ra -> Xóa ngay huy hiệu thông báo
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  const handleCloseChat = React.useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleNewMessage = React.useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const handleOnLeave = React.useCallback(() => {
    setIsLeaving(true);
    router.push('/');
  }, [router]);

  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Lỗi không mong đợi: ${error.message}`);
  }, []);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  // 2. KẾT NỐI VÀO PHÒNG TRỰC TIẾP
  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.MediaDevicesError, handleError);

    room
      .connect(
        props.connectionDetails.serverUrl,
        props.connectionDetails.participantToken,
        connectOptions,
      )
      .catch(handleError);

    if (props.userChoices.videoEnabled) {
      room.localParticipant.setCameraEnabled(true).catch(handleError);
    }
    if (props.userChoices.audioEnabled) {
      room.localParticipant.setMicrophoneEnabled(true).catch(handleError);
    }

    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [room, props.connectionDetails, props.userChoices, connectOptions, handleOnLeave, handleError]);

  // 3. ÉP CỜ contentHint='motion' ĐỂ GIỮ VỮNG 60 FPS
  React.useEffect(() => {
    const handleScreenSharePublished = (publication: any) => {
      if (
        publication.source === Track.Source.ScreenShare &&
        publication.track?.mediaStreamTrack
      ) {
        const mst = publication.track.mediaStreamTrack as MediaStreamTrack;
        if ('contentHint' in mst) {
          (mst as any).contentHint = 'motion';
        }
      }
    };
    room.on(RoomEvent.LocalTrackPublished, handleScreenSharePublished);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleScreenSharePublished);
    };
  }, [room]);

  const lowPowerMode = useLowCPUOptimizer(room);
  const [hideTiles, setHideTiles] = React.useState(false);

  // 4. CƠ CHẾ AUTO-HIDE (Hiện nút khi chạm/rê chuột, tự mờ sau 3 giây)
  const [showOverlayControls, setShowOverlayControls] = React.useState(false);
  const hideTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleUserActivity = React.useCallback(() => {
    setShowOverlayControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Tự động mờ đi sau 3 giây không chạm
    hideTimerRef.current = setTimeout(() => {
      setShowOverlayControls(false);
    }, 3000);
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [handleUserActivity]);

  if (isLeaving) {
    return <div style={{ background: '#090d16', minHeight: '100vh' }} />;
  }

  return (
    <div
      className={`lk-room-container ${hideTiles ? 'hide-tiles' : ''} ${showOverlayControls ? 'controls-visible' : 'controls-hidden'
        }`}
      onClick={handleUserActivity}
    >
      {/* 👉 THANH NÚT TRÊN ĐỈNH: Khi mở chat thì tự động ẩn nút Fullscreen để không bị chèn */}
      <div className={`video-top-overlay-bar ${showOverlayControls ? 'visible' : 'hidden'}`}>
        <ToggleTilesButton
          hideTiles={hideTiles}
          onToggle={() => setHideTiles((prev) => !prev)}
        />
        {!isChatOpen && <CinemaFullscreenButton />}
      </div>

      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />

        {/* 👉 2. KHUNG CHAT LUÔN ĐƯỢC MOUNT (Ẩn/hiện qua isChatOpen): */}
        <CustomChat
          isChatOpen={isChatOpen}
          onClose={handleCloseChat}
          onNewMessage={handleNewMessage}
        />

        {/* 👉 3. THANH ĐIỀU KHIỂN NHẬN UNREAD COUNT: */}
        <CustomControlBar
          isChatOpen={isChatOpen}
          onToggleChat={handleToggleChat}
          unreadCount={unreadCount}
        />

        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}