'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
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
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  Track,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';
import { CustomControlBar } from '@/components/CustomControlBar';
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
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  // 1. CẤU HÌNH ROOM VÀ SCREEN SHARE (CHỈ KHAI BÁO 1 LẦN DUY NHẤT)
  const roomOptions = React.useMemo((): RoomOptions => {
    const selectedCodec: VideoCodec = 'vp8'; // H264 hỗ trợ GPU rất tốt khi gánh 60fps

    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };

    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec: selectedCodec,

      // Layer phụ 720p giúp học sinh mạng yếu vẫn xem được mượt mà, không bị lag đứng hình
      screenShareSimulcastLayers: [],

      screenShareEncoding: {
        // 1080p 60fps: 10 Mbps | 2K 60fps: 14 Mbps
        maxBitrate: props.options.hq ? 14_000_000 : 10_000_000,
        maxFramerate: 60,
      },

      // Giữ vững 60 FPS khi mạng chập chờn (tự hạ nhẹ độ phân giải để giữ độ mượt)
      degradationPreference: 'maintain-framerate',
    };

    return {
      videoCaptureDefaults,
      publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: false,
      dynacast: false,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [props.userChoices, props.options.hq, e2eeEnabled]);

  const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);

  const router = useRouter();
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  const handleOnLeave = React.useCallback(() => {
    setIsLeaving(true);
    router.push('/');
  }, [router]);

  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Lỗi không mong đợi: ${error.message}`);
  }, []);

  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Lỗi mã hoá: ${error.message}`);
  }, []);

  // 2. KHÔI PHỤC LẠI: THIẾT LẬP MÃ HÓA ĐẦU CUỐI (E2EE)
  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(`Trình duyệt không hỗ trợ mã hoá đầu cuối.`);
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  // 3. KHÔI PHỤC LẠI: KẾT NỐI VÀO PHÒNG VÀ MỞ CAM / MIC
  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);

    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions,
        )
        .catch((error) => {
          handleError(error);
        });
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  // 4. ÉP CỜ contentHint='motion' ĐỂ KHÔNG BỊ TRÌNH DUYỆT BÓP FPS XUỐNG 5-15 FPS
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

  if (isLeaving) {
    return <div style={{ background: '#090d16', minHeight: '100vh' }} />;
  }

  return (
    <div className={`lk-room-container ${hideTiles ? 'hide-tiles' : ''}`}>
      {/* Nút mắt ở góc trên bên trái */}
      <button
        type="button"
        onClick={() => setHideTiles(!hideTiles)}
        className="lk-toggle-tiles-btn"
        title={hideTiles ? 'Hiện camera thành viên' : 'Ẩn camera thành viên'}
      >
        {hideTiles ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
          </svg>
        )}
      </button>

      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />

        {/* Thanh điều khiển custom của bạn */}
        <CustomControlBar />

        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}