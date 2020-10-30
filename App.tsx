import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RtcEngine, {
  ChannelProfile,
  ClientRole,
  RtcLocalView,
  RtcRemoteView,
  VideoRenderMode,
} from 'react-native-agora';
import requestCameraAndAudioPermission from './components/PermissionsAndroid';
import styles from './components/Style';

//use env
const APP_ID = '4105bde1761842e7afded0067450362f';
const TOKEN =
  '0064105bde1761842e7afded0067450362fIACunkUiASZONmkSBR8h8MslnruwQECakS+SMFqw68A4HAJkFYoAAAAAEADnMOtSFEqcXwEAAQAUSpxf';
const CHANNEL_NAME = 'channel-x';

export default function App() {
  /**
   * @property peerIds Array for storing connected peers
   * @property appId
   * @property channelName Channel Name for the current session
   * @property joinSucceed State variable for storing success
   */
  const [joinSucceed, setJoinSucceed] = useState(false);
  const [peerIds, setPeerIds] = useState<number[]>([]);
  const [engine, setEngine] = useState<RtcEngine | null>(null);

  const [isAudience, setIsAudience] = useState(false);
  const [isHost, setIsHost] = useState(false);

  /**
   * @name init
   * @description Function to initialize the Rtc Engine, attach event listeners and actions
   */
  const init = async () => {
    const _engine = await RtcEngine.create(APP_ID);
    setEngine(_engine);
    await _engine.enableVideo();

    //LiveBroadcasting profile
    _engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
    _engine.setClientRole(ClientRole.Broadcaster);
    setIsHost(true);

    // _engine.setClientRole(ClientRole.Audience);
    // setIsAudience(true);

    _engine.addListener('Warning', (warn) => {
      console.log('Warning', warn);
    });

    _engine.addListener('Error', (err) => {
      console.log('Error', err);
    });

    _engine.addListener('UserJoined', (uid, elapsed) => {
      console.log('UserJoined', uid, elapsed);
      // If new user
      if (peerIds.indexOf(uid) === -1) {
        setPeerIds([...peerIds, uid]);
      }
    });

    _engine.addListener('UserOffline', (uid, reason) => {
      console.log('UserOffline', uid, reason);
      setPeerIds(peerIds.filter((id) => id !== uid));
    });

    // If Local user joins RTC channel
    _engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('JoinChannelSuccess', channel, uid, elapsed);
      setJoinSucceed(true);
    });
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Request required permissions from Android
      requestCameraAndAudioPermission().then(() => {
        console.log('requested!');
      });
    }

    init();
  }, []);

  /**
   * @name startCall
   * @description Function to start the call
   */
  const startCall = async () => {
    // Join Channel using null token and channel name
    engine &&
      (await engine.joinChannel(
        TOKEN,
        CHANNEL_NAME,
        null, //optional info
        0, //optional uid - If you set uid as 0, the SDK assigns a user ID for
        //the local user and returns it in the JoinChannelSuccess callback.
      ));
  };

  /**
   * @name endCall
   * @description Function to end the call
   */
  const endCall = async () => {
    if (engine) {
      await engine.leaveChannel();
      setPeerIds([]);
      setJoinSucceed(false);
    }
  };

  console.log('ben side', peerIds); //test this val

  return (
    <View style={styles.max}>
      <View style={styles.max}>
        <View style={styles.buttonHolder}>
          <TouchableOpacity onPress={startCall} style={styles.button}>
            <Text style={styles.buttonText}> Start Call </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={endCall} style={styles.button}>
            <Text style={styles.buttonText}> End Call </Text>
          </TouchableOpacity>
        </View>
        {joinSucceed && (
          <View style={styles.fullView}>
            {isHost && (
              <RtcLocalView.SurfaceView
                style={styles.max}
                channelId={CHANNEL_NAME}
                renderMode={VideoRenderMode.Hidden}
              />
            )}

            {isAudience && (
              <ScrollView
                style={styles.remoteContainer}
                contentContainerStyle={{ paddingHorizontal: 2.5 }}
                horizontal={true}
              >
                {peerIds.map((value, index, array) => {
                  return (
                    <RtcRemoteView.SurfaceView
                      style={styles.remote}
                      uid={value}
                      channelId={CHANNEL_NAME}
                      renderMode={VideoRenderMode.Hidden}
                      zOrderMediaOverlay={true}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
